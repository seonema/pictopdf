package com.example.docscanner.ui.screens

import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.RotateLeft
import androidx.compose.material.icons.filled.RotateRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.docscanner.R
import com.example.docscanner.data.FilterType
import com.example.docscanner.processing.ImageProcessor
import com.example.docscanner.ui.components.AppTopBar
import com.example.docscanner.ui.theme.OfficeTealPrimary
import kotlinx.coroutines.launch

@Composable
fun EditorScreen(
    imageUri: Uri,
    onBack: () -> Unit,
    onProceedToPreview: (rotation: Float, brightness: Float, contrast: Float) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var originalBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var previewBitmap by remember { mutableStateOf<Bitmap?>(null) }

    var rotationDegrees by remember { mutableFloatStateOf(0f) }
    var brightness by remember { mutableFloatStateOf(0f) }
    var contrast by remember { mutableFloatStateOf(1f) }

    // Load initial bitmap safely
    LaunchedEffect(imageUri) {
        try {
            val bmp = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val source = ImageDecoder.createSource(context.contentResolver, imageUri)
                ImageDecoder.decodeBitmap(source) { decoder, _, _ ->
                    decoder.isMutableRequired = true
                }
            } else {
                @Suppress("DEPRECATION")
                MediaStore.Images.Media.getBitmap(context.contentResolver, imageUri)
            }
            originalBitmap = bmp
            previewBitmap = bmp
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // Recalculate preview when parameters change
    fun updatePreview(rot: Float, b: Float, c: Float) {
        val src = originalBitmap ?: return
        scope.launch {
            previewBitmap = ImageProcessor.processDocument(
                source = src,
                filterType = FilterType.ORIGINAL,
                rotationDegrees = rot,
                brightness = b,
                contrast = c
            )
        }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = stringResource(R.string.editor_title),
                subtitle = "چرخش ۹۰ درجه و تنظیم روشنایی سند",
                showBack = true,
                onBackClick = onBack
            )
        },
        bottomBar = {
            Surface(
                tonalElevation = 8.dp,
                shadowElevation = 8.dp,
                color = MaterialTheme.colorScheme.surface
            ) {
                Button(
                    onClick = {
                        onProceedToPreview(rotationDegrees, brightness, contrast)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = OfficeTealPrimary)
                ) {
                    Text(
                        text = stringResource(R.string.proceed_to_filters),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(
                        imageVector = Icons.Default.ArrowForward,
                        contentDescription = null
                    )
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Image Preview Canvas
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(380.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(MaterialTheme.colorScheme.surface),
                contentAlignment = Alignment.Center
            ) {
                if (previewBitmap != null) {
                    Image(
                        bitmap = previewBitmap!!.asImageBitmap(),
                        contentDescription = "پیش‌نمایش سند",
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(8.dp),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    CircularProgressIndicator(color = OfficeTealPrimary)
                }
            }

            // Quick 90° Rotation Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        rotationDegrees = (rotationDegrees - 90f) % 360f
                        updatePreview(rotationDegrees, brightness, contrast)
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.RotateLeft, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.rotate_left))
                }

                OutlinedButton(
                    onClick = {
                        rotationDegrees = (rotationDegrees + 90f) % 360f
                        updatePreview(rotationDegrees, brightness, contrast)
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.RotateRight, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.rotate_right))
                }
            }

            // Sliders Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Brightness Slider
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = stringResource(R.string.brightness_label),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "${brightness.toInt()}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.outline
                        )
                    }
                    Slider(
                        value = brightness,
                        onValueChange = {
                            brightness = it
                            updatePreview(rotationDegrees, brightness, contrast)
                        },
                        valueRange = -50f..50f,
                        colors = SliderDefaults.colors(thumbColor = OfficeTealPrimary, activeTrackColor = OfficeTealPrimary)
                    )

                    // Contrast Slider
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = stringResource(R.string.contrast_label),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = String.format("%.1fx", contrast),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.outline
                        )
                    }
                    Slider(
                        value = contrast,
                        onValueChange = {
                            contrast = it
                            updatePreview(rotationDegrees, brightness, contrast)
                        },
                        valueRange = 0.6f..2.0f,
                        colors = SliderDefaults.colors(thumbColor = OfficeTealPrimary, activeTrackColor = OfficeTealPrimary)
                    )

                    // Reset adjustments button
                    TextButton(
                        onClick = {
                            rotationDegrees = 0f
                            brightness = 0f
                            contrast = 1f
                            updatePreview(0f, 0f, 1f)
                        },
                        modifier = Modifier.align(Alignment.End)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(stringResource(R.string.reset_adjustments))
                    }
                }
            }
        }
    }
}
