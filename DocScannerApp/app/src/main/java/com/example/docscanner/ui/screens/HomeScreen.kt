package com.example.docscanner.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.example.docscanner.R
import com.example.docscanner.data.DocumentModel
import com.example.docscanner.data.DocumentRepository
import com.example.docscanner.ui.components.AppTopBar
import com.example.docscanner.ui.components.DocumentCardItem
import com.example.docscanner.ui.components.PrimaryScanButton
import com.example.docscanner.ui.theme.OfficeTealPrimary
import com.example.docscanner.utils.PdfExporter
import java.io.File

@Composable
fun HomeScreen(
    onNavigateToEditor: (imageUri: Uri) -> Unit,
    onNavigateToPreview: (documentId: String) -> Unit
) {
    val context = LocalContext.current
    val repository = remember { DocumentRepository(context) }
    var documents by remember { mutableStateOf(repository.getAllDocuments()) }

    var documentToDelete by remember { mutableStateOf<DocumentModel?>(null) }
    var tempCameraUri by remember { mutableStateOf<Uri?>(null) }

    // Camera launcher
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && tempCameraUri != null) {
            onNavigateToEditor(tempCameraUri!!)
        }
    }

    // Permission launcher for Camera
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            val file = File(context.cacheDir, "camera_capture_${System.currentTimeMillis()}.jpg")
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file
            )
            tempCameraUri = uri
            cameraLauncher.launch(uri)
        }
    }

    // Gallery picker launcher
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { onNavigateToEditor(it) }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = stringResource(R.string.app_name),
                subtitle = stringResource(R.string.app_tagline)
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(vertical = 16.dp)
        ) {
            // Welcome & Privacy Notice Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = OfficeTealPrimary.copy(alpha = 0.08f))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(OfficeTealPrimary.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Shield,
                                contentDescription = null,
                                tint = OfficeTealPrimary,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = stringResource(R.string.welcome_title),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = OfficeTealPrimary
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "پردازش ۱۰۰٪ آفلاین و محلی درون گوشی بدون آپلود فایل",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // Action 1: Camera
            item {
                PrimaryScanButton(
                    text = stringResource(R.string.action_camera),
                    subtext = "عکاسی فوری با تنظیم خودکار نور و زاویه",
                    icon = Icons.Default.CameraAlt,
                    containerColor = OfficeTealPrimary,
                    onClick = {
                        cameraPermissionLauncher.launch(android.Manifest.permission.CAMERA)
                    }
                )
            }

            // Action 2: Gallery
            item {
                PrimaryScanButton(
                    text = stringResource(R.string.action_gallery),
                    subtext = "انتخاب تصاویر مدارک از حافظه دستگاه",
                    icon = Icons.Default.PhotoLibrary,
                    containerColor = Color(0xFF1E6B7B),
                    onClick = {
                        galleryLauncher.launch("image/*")
                    }
                )
            }

            // Recent Scans Section Header
            item {
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = stringResource(R.string.recent_scans_title),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${documents.size} سند",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            }

            // Empty State
            if (documents.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 24.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.Description,
                                contentDescription = null,
                                modifier = Modifier.size(54.dp),
                                tint = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = stringResource(R.string.no_scans_message),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }
                    }
                }
            } else {
                items(documents, key = { it.id }) { doc ->
                    DocumentCardItem(
                        document = doc,
                        onOpen = {
                            onNavigateToPreview(doc.id)
                        },
                        onShare = {
                            val fileToShare = if (doc.pdfPath != null && File(doc.pdfPath).exists()) {
                                File(doc.pdfPath)
                            } else {
                                File(doc.imagePath)
                            }
                            val mime = if (doc.pdfPath != null) "application/pdf" else "image/jpeg"
                            PdfExporter.shareFile(context, fileToShare, mime)
                        },
                        onDelete = {
                            documentToDelete = doc
                        }
                    )
                }
            }
        }
    }

    // Delete Confirmation Dialog
    documentToDelete?.let { doc ->
        AlertDialog(
            onDismissRequest = { documentToDelete = null },
            title = { Text(text = stringResource(R.string.delete_confirm_title)) },
            text = { Text(text = stringResource(R.string.delete_confirm_desc)) },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    onClick = {
                        repository.deleteDocument(doc.id)
                        documents = repository.getAllDocuments()
                        documentToDelete = null
                    }
                ) {
                    Text(text = stringResource(R.string.delete))
                }
            },
            dismissButton = {
                TextButton(onClick = { documentToDelete = null }) {
                    Text(text = stringResource(R.string.cancel))
                }
            }
        )
    }
}
