package org.flow.reader.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.flow.reader.R
import org.flow.reader.data.local.ReadingEntity
import org.flow.reader.data.local.ReadingStatus

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    state: UiState,
    readings: List<ReadingEntity>,
    pending: Int,
    onBack: () -> Unit,
    onSync: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringRes(R.string.readings_history)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            SyncStatusBar(state, pending) {}
            Button(
                onClick = onSync,
                enabled = !state.busy,
                modifier = Modifier
                    .padding(16.dp)
                    .fillMaxWidth(),
            ) { Text(stringRes(R.string.sync_now)) }

            if (readings.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        stringRes(R.string.no_pending),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else {
                LazyColumn {
                    items(readings, key = { it.clientId }) { reading ->
                        ReadingRow(reading)
                        HorizontalDivider()
                    }
                }
            }
        }
    }
}

@Composable
private fun ReadingRow(reading: ReadingEntity) {
    val (label, color) = when (reading.status) {
        ReadingStatus.SYNCED -> stringRes(R.string.status_synced) to Color(0xFF15803D)
        ReadingStatus.FAILED -> stringRes(R.string.status_failed) to Color(0xFFB91C1C)
        ReadingStatus.PENDING -> stringRes(R.string.status_pending) to Color(0xFF92400E)
    }
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp)) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(reading.headOfHousehold, fontWeight = FontWeight.Medium)
            Text(label, color = color, style = MaterialTheme.typography.bodyMedium)
        }
        Text(
            "${formatNumber(reading.readingValue)} m³ · " +
                stringRes(R.string.consumption, formatNumber(reading.consumption)) + " · " +
                formatTime(reading.createdAt),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        reading.lastError?.takeIf { reading.status == ReadingStatus.FAILED }?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = Color(0xFFB91C1C))
        }
    }
}
