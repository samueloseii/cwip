package org.flow.reader.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.flow.reader.R
import org.flow.reader.data.local.MeterEntity

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecordReadingScreen(
    meter: MeterEntity,
    onBack: () -> Unit,
    onSave: (Double, String?) -> Unit,
) {
    var value by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    val parsed = value.replace(',', '.').toDoubleOrNull()
    val consumption = parsed?.let { it - meter.lastReadingValue }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringRes(R.string.record_reading)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(16.dp)
        ) {
            Text(meter.headOfHousehold, style = MaterialTheme.typography.titleLarge)
            Text(
                "${stringRes(R.string.account, meter.accountNumber)} · ${meter.serialNumber}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                ),
                modifier = Modifier
                    .padding(top = 16.dp)
                    .fillMaxWidth(),
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text(stringRes(R.string.previous_reading), style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "${formatNumber(meter.lastReadingValue)} m³",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    meter.lastReadingDate?.let {
                        Text(
                            it.take(10),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            OutlinedTextField(
                value = value,
                onValueChange = { new -> value = new.filter { it.isDigit() || it == '.' || it == ',' } },
                label = { Text(stringRes(R.string.new_reading)) },
                singleLine = true,
                textStyle = MaterialTheme.typography.titleLarge,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Decimal,
                    imeAction = ImeAction.Next,
                ),
                modifier = Modifier
                    .padding(top = 20.dp)
                    .fillMaxWidth(),
            )

            consumption?.let {
                Text(
                    stringRes(R.string.consumption, formatNumber(it)),
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(top = 12.dp),
                )
                warningFor(it, meter)?.let { warning ->
                    Text(
                        warning,
                        color = Color(0xFFB45309),
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }

            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text(stringRes(R.string.notes)) },
                modifier = Modifier
                    .padding(top = 16.dp)
                    .fillMaxWidth(),
            )

            Button(
                onClick = { parsed?.let { onSave(it, notes) } },
                enabled = parsed != null,
                modifier = Modifier
                    .padding(top = 24.dp)
                    .fillMaxWidth()
                    .height(56.dp),
            ) { Text(stringRes(R.string.save)) }
        }
    }
}

@Composable
private fun warningFor(consumption: Double, meter: MeterEntity): String? = when {
    consumption < 0 -> stringRes(R.string.warn_lower)
    consumption == 0.0 -> stringRes(R.string.warn_zero)
    meter.avgConsumptionM3 > 0 && consumption > meter.avgConsumptionM3 * 1.25 ->
        stringRes(R.string.warn_high)
    else -> null
}
