package org.flow.reader.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

private val Ink = Color(0xFF0F172A)
private val Water = Color(0xFF0369A1)
private val WaterLight = Color(0xFFE0F2FE)

private val LightColors = lightColorScheme(
    primary = Water,
    onPrimary = Color.White,
    primaryContainer = WaterLight,
    onPrimaryContainer = Ink,
    surface = Color.White,
    onSurface = Ink,
    background = Color(0xFFF8FAFC),
    onBackground = Ink,
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF7DD3FC),
    onPrimary = Ink,
)

// Field-readable: larger body and numeric input than the Material defaults.
private val FieldTypography = Typography().let { base ->
    base.copy(
        bodyLarge = base.bodyLarge.copy(fontSize = 18.sp, lineHeight = 26.sp),
        bodyMedium = base.bodyMedium.copy(fontSize = 16.sp, lineHeight = 22.sp),
        titleLarge = base.titleLarge.copy(fontSize = 24.sp, fontWeight = FontWeight.SemiBold),
        labelLarge = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.Medium),
    )
}

@Composable
fun FlowTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        typography = FieldTypography,
        content = content,
    )
}
