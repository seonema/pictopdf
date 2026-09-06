package com.example.docscanner

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.docscanner.ui.screens.EditorScreen
import com.example.docscanner.ui.screens.HomeScreen
import com.example.docscanner.ui.screens.PreviewScreen
import com.example.docscanner.ui.theme.DocScannerTheme
import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            DocScannerTheme {
                // Strict Right-to-Left (RTL) Layout for Persian UI
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        DocScannerNavHost()
                    }
                }
            }
        }
    }
}

@Composable
fun DocScannerNavHost() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "home"
    ) {
        // 1. Home Screen
        composable("home") {
            HomeScreen(
                onNavigateToEditor = { imageUri ->
                    val encodedUri = URLEncoder.encode(imageUri.toString(), StandardCharsets.UTF_8.toString())
                    navController.navigate("editor/$encodedUri")
                },
                onNavigateToPreview = { docId ->
                    navController.navigate("preview?docId=$docId")
                }
            )
        }

        // 2. Editor Screen (90-degree fast rotation and lighting adjustment)
        composable(
            route = "editor/{imageUri}",
            arguments = listOf(navArgument("imageUri") { type = NavType.StringType })
        ) { backStackEntry ->
            val rawUri = backStackEntry.arguments?.getString("imageUri") ?: ""
            val decodedUri = URLDecoder.decode(rawUri, StandardCharsets.UTF_8.toString())
            val uri = Uri.parse(decodedUri)

            EditorScreen(
                imageUri = uri,
                onBack = { navController.popBackStack() },
                onProceedToPreview = { rot, b, c ->
                    val encodedUri = URLEncoder.encode(decodedUri, StandardCharsets.UTF_8.toString())
                    navController.navigate("preview?uri=$encodedUri&rot=$rot&b=$b&c=$c")
                }
            )
        }

        // 3. Preview & Filter Screen (Photocopy, Color Scan, B&W, PDF & Share)
        composable(
            route = "preview?uri={uri}&docId={docId}&rot={rot}&b={b}&c={c}",
            arguments = listOf(
                navArgument("uri") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
                navArgument("docId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
                navArgument("rot") {
                    type = NavType.FloatType
                    defaultValue = 0f
                },
                navArgument("b") {
                    type = NavType.FloatType
                    defaultValue = 0f
                },
                navArgument("c") {
                    type = NavType.FloatType
                    defaultValue = 1f
                }
            )
        ) { backStackEntry ->
            val uriString = backStackEntry.arguments?.getString("uri")
            val docId = backStackEntry.arguments?.getString("docId")
            val rot = backStackEntry.arguments?.getFloat("rot") ?: 0f
            val b = backStackEntry.arguments?.getFloat("b") ?: 0f
            val c = backStackEntry.arguments?.getFloat("c") ?: 1f

            val uri = uriString?.let {
                Uri.parse(URLDecoder.decode(it, StandardCharsets.UTF_8.toString()))
            }

            PreviewScreen(
                imageUri = uri,
                existingDocumentId = docId,
                rotationDegrees = rot,
                brightness = b,
                contrast = c,
                onBack = { navController.popBackStack() },
                onHome = {
                    navController.navigate("home") {
                        popUpTo("home") { inclusive = true }
                    }
                }
            )
        }
    }
}
