package org.flow.reader.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Holds the operator's session. The token is kept in encrypted preferences so a lost
 * phone does not hand over API access, and it survives reboots so the operator can keep
 * working for a month without signing in again.
 */
class AuthStore(context: Context) {
    private val prefs: SharedPreferences = runCatching {
        val key = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "flow-auth",
            key,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        ) as SharedPreferences
    }.getOrElse {
        // Some devices have a broken keystore; a working app beats a crashing one.
        context.getSharedPreferences("flow-auth-plain", Context.MODE_PRIVATE)
    }

    var token: String?
        get() = prefs.getString("token", null)
        set(value) = prefs.edit().putString("token", value).apply()

    var userId: String?
        get() = prefs.getString("user_id", null)
        set(value) = prefs.edit().putString("user_id", value).apply()

    var userName: String?
        get() = prefs.getString("user_name", null)
        set(value) = prefs.edit().putString("user_name", value).apply()

    var communityId: String?
        get() = prefs.getString("community_id", null)
        set(value) = prefs.edit().putString("community_id", value).apply()

    var lastSyncAt: Long
        get() = prefs.getLong("last_sync_at", 0L)
        set(value) = prefs.edit().putLong("last_sync_at", value).apply()

    val isSignedIn: Boolean get() = !token.isNullOrBlank()

    /** Clears credentials only. Unsynced readings are never touched by signing out. */
    fun clear() {
        prefs.edit().remove("token").remove("user_id").remove("user_name")
            .remove("community_id").apply()
    }
}
