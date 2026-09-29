package org.flow.reader.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import org.flow.reader.container
import org.flow.reader.data.local.MeterEntity
import org.flow.reader.data.local.ReadingEntity
import org.flow.reader.sync.SyncScheduler
import retrofit2.HttpException

enum class Banner { NONE, SAVED_OFFLINE, SAVED, SYNCED, SYNC_FAILED }

data class UiState(
    val signedIn: Boolean = false,
    val busy: Boolean = false,
    val online: Boolean = false,
    val error: String? = null,
    val banner: Banner = Banner.NONE,
    val bannerDetail: String? = null,
    val lastSyncAt: Long = 0L,
    val operator: String? = null,
)

class FlowViewModel(app: Application) : AndroidViewModel(app) {
    private val container = app.container
    private val repo = container.repository

    private val _state = MutableStateFlow(
        UiState(
            signedIn = container.auth.isSignedIn,
            online = repo.isOnline(),
            lastSyncAt = container.auth.lastSyncAt,
            operator = container.auth.userName,
        )
    )
    val state: StateFlow<UiState> = _state.asStateFlow()

    val meters: StateFlow<List<MeterEntity>> = repo.meters
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val readings: StateFlow<List<ReadingEntity>> = repo.readings
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val pendingCount: StateFlow<Int> = repo.pendingCount
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    init {
        if (container.auth.isSignedIn) refresh()
    }

    fun refreshConnectivity() {
        _state.value = _state.value.copy(online = repo.isOnline())
    }

    fun signIn(email: String, password: String) = viewModelScope.launch {
        _state.value = _state.value.copy(busy = true, error = null)
        try {
            repo.signIn(email, password)
            repo.downloadMeters()
            _state.value = _state.value.copy(
                busy = false,
                signedIn = true,
                operator = container.auth.userName,
                lastSyncAt = container.auth.lastSyncAt,
                online = true,
            )
        } catch (e: Exception) {
            _state.value = _state.value.copy(busy = false, error = describe(e))
        }
    }

    fun signOut() {
        container.auth.clear()
        _state.value = _state.value.copy(signedIn = false, operator = null)
    }

    /** Pulls the meter list and pushes anything waiting, in that order. */
    fun refresh() = viewModelScope.launch {
        if (!repo.isOnline()) {
            _state.value = _state.value.copy(online = false, banner = Banner.SYNC_FAILED)
            return@launch
        }
        _state.value = _state.value.copy(busy = true, error = null, online = true)
        val outcome = runCatching { repo.sync() }.getOrNull()
        runCatching { repo.downloadMeters() }
            .onFailure {
                _state.value = _state.value.copy(busy = false, error = describe(it as Exception))
                return@launch
            }
        _state.value = _state.value.copy(
            busy = false,
            lastSyncAt = container.auth.lastSyncAt,
            banner = when {
                outcome == null || !outcome.ok -> Banner.SYNC_FAILED
                outcome.uploaded + outcome.duplicates > 0 -> Banner.SYNCED
                else -> Banner.NONE
            },
            bannerDetail = outcome?.let { "${it.uploaded + it.duplicates}" },
        )
    }

    fun saveReading(meter: MeterEntity, value: Double, notes: String?) = viewModelScope.launch {
        repo.saveReading(meter, value, notes)
        val online = repo.isOnline()
        _state.value = _state.value.copy(
            online = online,
            banner = if (online) Banner.SAVED else Banner.SAVED_OFFLINE,
        )
        if (online) SyncScheduler.syncNow(getApplication())
    }

    fun clearBanner() {
        _state.value = _state.value.copy(banner = Banner.NONE, bannerDetail = null)
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }

    private fun describe(e: Exception): String = when {
        e is HttpException && e.code() == 401 -> "invalid_credentials"
        e is HttpException -> "server_error"
        else -> "no_connection"
    }
}
