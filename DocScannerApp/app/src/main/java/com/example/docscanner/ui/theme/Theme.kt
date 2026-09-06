package com.example.docscanner.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = OfficeTealPrimary,
    onPrimary = OfficeTealOnPrimary,
    primaryContainer = OfficeTealContainer,
    onPrimaryContainer = OfficeTealOnContainer,
    secondary = DocumentSecondary,
    onSecondary = DocumentOnSecondary,
    secondaryContainer = DocumentSecondaryContainer,
    background = BackgroundLight,
    surface = SurfaceLight,
    onSurface = TextPrimary,
    surfaceVariant = BorderSubtle
)

private val DarkColorScheme = darkColorScheme(
    primary = OfficeTealDark,
    onPrimary = TextPrimary,
    primaryContainer = DocumentSecondary,
    onPrimaryContainer = TextPrimaryDark,
    secondary = OfficeTealDark,
    onSecondary = TextPrimary,
    background = BackgroundDark,
    surface = SurfaceDark,
    onSurface = TextPrimaryDark,
    surfaceVariant = SurfaceCardDark
)

@Composable
fun DocScannerTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
