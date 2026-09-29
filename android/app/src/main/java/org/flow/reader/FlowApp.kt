package org.flow.reader

import android.app.Application
import android.content.Context
import org.flow.reader.data.AuthStore
import org.flow.reader.data.ReadingRepository
import org.flow.reader.data.local.FlowDatabase
import org.flow.reader.data.remote.ApiClient
import org.flow.reader.sync.SyncScheduler

/** Hand-rolled container: one repository, no dependency-injection framework to learn. */
class AppContainer(context: Context, baseUrl: String = BuildConfig.API_BASE_URL) {
    val auth = AuthStore(context)
    private val db = FlowDatabase.get(context)
    private val api = ApiClient.create(baseUrl, auth)
    val repository = ReadingRepository(context, db, api, auth)
}

class FlowApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        SyncScheduler.schedulePeriodic(this)
    }
}

val Context.container: AppContainer
    get() = (applicationContext as FlowApp).container
