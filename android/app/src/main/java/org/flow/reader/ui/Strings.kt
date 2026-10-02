package org.flow.reader.ui

import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import org.flow.reader.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun stringRes(@StringRes id: Int): String = stringResource(id)

@Composable
fun stringRes(@StringRes id: Int, vararg args: Any): String = stringResource(id, *args)

@Composable
fun errorMessage(code: String): String = when (code) {
    "invalid_credentials" -> stringRes(R.string.error_invalid_credentials)
    "server_error" -> stringRes(R.string.error_server)
    "session_expired" -> stringRes(R.string.error_session_expired)
    else -> stringRes(R.string.error_no_connection)
}

fun formatTime(millis: Long): String =
    SimpleDateFormat("d MMM HH:mm", Locale.getDefault()).format(Date(millis))

fun formatNumber(value: Double): String =
    if (value % 1.0 == 0.0) value.toLong().toString() else String.format(Locale.US, "%.1f", value)
