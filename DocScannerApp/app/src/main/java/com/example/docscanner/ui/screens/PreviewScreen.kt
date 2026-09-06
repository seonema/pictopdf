package com.example.docscanner.ui.screens

import android.content.ContentValues
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.docscanner.R
import com.example.docscanner.data.DocumentModel
import com.example.docscanner.data.DocumentRepository
import com.example.docscanner.data.FilterType
import com.example.docscanner.data.ShamsiDateHelper
import com.example.docscanner.processing.ImageProcessor
import com.example.docscanner.ui.components.AppTopBar
import com.example.docscanner.ui.theme.OfficeTealPrimary
import com.example.docscanner.utils.PdfExporter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

@Composable
fun PreviewScreen(
    imageUri: Uri?,
    existingDocumentId: String?,
    rotationDegrees: Float = 0f,
    brightness: Float = 0f,
    contrast: Float = 1f,
    onBack: () -> Unit,
    onHome: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val repository = remember { DocumentRepository(context) }

    var baseBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var processedBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var selectedFilter by remember { mutableStateOf(FilterType.PHOTOCOPY) }
    var isProcessing by remember { mutableStateOf(false) }

    var savedDocument by remember { mutableStateOf<DocumentModel?>(null) }
    var generatedPdfFile by remember { mutableStateOf<File?>(null) }

    // Load initial source
    LaunchedEffect(imageUri, existingDocumentId) {
        if (existingDocumentId != null) {
            val doc = repository.getAllDocuments().find { it.id == existingDocumentId }
            if (doc != null) {
                savedDocument = doc
                selectedFilter = doc.filterApplied
                val bmp = android.graphics.BitmapFactory.decodeFile(doc.imagePath)
                baseBitmap = bmp
                processedBitmap = bmp
                if (doc.pdfPath != null) {
                    generatedPdfFile = File(doc.pdfPath)
                }
            }
        } else if (imageUri != null) {
            try {
                val bmp = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    val src = ImageDecoder.createSource(context.contentResolver, imageUri)
                    ImageDecoder.decodeBitmap(src) { decoder, _, _ -> decoder.isMutableRequired = true }
                } else {
                    @Suppress("DEPRECATION")
                    MediaStore.Images.Media.getBitmap(context.contentResolver, imageUri)
                }
                baseBitmap = bmp
                // Immediately apply default Photocopy mode
                applyFilter(FilterType.PHOTOCOPY, bmp, rotationDegrees, brightness, contrast)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun applyFilter(filter: FilterType, src: Bitmap?, rot: Float, b: Float, c: Float) {
        val bitmap = src ?: baseBitmap ?: return
        selectedFilter = filter
        isProcessing = true
        scope.launch {
            val result = ImageProcessor.processDocument(
                source = bitmap,
                filterType = filter,
                rotationDegrees = rot,
                brightness = b,
                contrast = c
            )
            processedBitmap = result
            isProcessing = false
        }
    }

    // Save image to permanent storage & record in repository
    suspend fun ensureSaved(): DocumentModel? {
        if (savedDocument != null) return savedDocument
        val bmp = processedBitmap ?: return null

        return withContext(Dispatchers.IO) {
            val filename = "SCAN_${System.currentTimeMillis()}.jpg"
            val file = File(context.filesDir, filename)
            val size = ImageProcessor.saveBitmapToFile(bmp, file)

            val doc = DocumentModel(
                title = "${context.getString(R.string.document_name_prefix)}${System.currentTimeMillis() % 10000}",
                imagePath = file.absolutePath,
                dateShamsi = ShamsiDateHelper.getCurrentShamsiDate(),
                filterApplied = selectedFilter,
                fileSizeBytes = size
            )
            repository.saveDocument(doc)
            savedDocument = doc
            doc
        }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = stringResource(R.string.preview_title),
                subtitle = "انتخاب فیلتر، ذخیره و خروجی PDF",
                showBack = true,
                onBackClick = onBack
            )
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
            // Live Preview Canvas with processing overlay
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(390.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                if (processedBitmap != null) {
                    Image(
                        bitmap = processedBitmap!!.asImageBitmap(),
                        contentDescription = "سند پردازش‌شده",
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(8.dp),
                        contentScale = ContentScale.Fit
                    )
                }

                if (isProcessing) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.35f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(22.dp),
                                    color = OfficeTealPrimary,
                                    strokeWidth = 2.5.dp
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = stringResource(R.string.processing),
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }

            // Quick Filter Tabs (Photocopy, Color Scan, B&W, Original)
            Text(
                text = "انتخاب فیلتر هوشمند پردازش:",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterTabButton(
                    title = stringResource(R.string.filter_photocopy),
                    isSelected = selectedFilter == FilterType.PHOTOCOPY,
                    modifier = Modifier.weight(1f),
                    onClick = {
                        applyFilter(FilterType.PHOTOCOPY, baseBitmap, rotationDegrees, brightness, contrast)
                    }
                )
                FilterTabButton(
                    title = stringResource(R.string.filter_color_scan),
                    isSelected = selectedFilter == FilterType.COLOR_SCAN,
                    modifier = Modifier.weight(1f),
                    onClick = {
                        applyFilter(FilterType.COLOR_SCAN, baseBitmap, rotationDegrees, brightness, contrast)
                    }
                )
                FilterTabButton(
                    title = stringResource(R.string.filter_bw_printer),
                    isSelected = selectedFilter == FilterType.BW_PRINTER,
                    modifier = Modifier.weight(1f),
                    onClick = {
                        applyFilter(FilterType.BW_PRINTER, baseBitmap, rotationDegrees, brightness, contrast)
                    }
                )
                FilterTabButton(
                    title = stringResource(R.string.filter_original),
                    isSelected = selectedFilter == FilterType.ORIGINAL,
                    modifier = Modifier.weight(1f),
                    onClick = {
                        applyFilter(FilterType.ORIGINAL, baseBitmap, rotationDegrees, brightness, contrast)
                    }
                )
            }

            // Filter Description Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = OfficeTealPrimary.copy(alpha = 0.07f))
            ) {
                Text(
                    text = when (selectedFilter) {
                        FilterType.PHOTOCOPY -> stringResource(R.string.filter_photocopy_sub)
                        FilterType.COLOR_SCAN -> stringResource(R.string.filter_color_scan_sub)
                        FilterType.BW_PRINTER -> stringResource(R.string.filter_bw_printer_sub)
                        FilterType.ORIGINAL -> stringResource(R.string.filter_original_sub)
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = OfficeTealPrimary,
                    modifier = Modifier.padding(12.dp)
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Action 1: Save to Gallery
            Button(
                onClick = {
                    val bmp = processedBitmap ?: return@Button
                    scope.launch {
                        val doc = ensureSaved()
                        // Export to public Pictures/DocScanner via MediaStore
                        try {
                            val values = ContentValues().apply {
                                put(MediaStore.Images.Media.DISPLAY_NAME, "Doc_${System.currentTimeMillis()}.jpg")
                                put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                    put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/DocScanner")
                                }
                            }
                            val uri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                            uri?.let { destUri ->
                                context.contentResolver.openOutputStream(destUri)?.use { out ->
                                    bmp.compress(Bitmap.CompressFormat.JPEG, 95, out)
                                }
                                Toast.makeText(context, context.getString(R.string.save_success), Toast.LENGTH_SHORT).show()
                            }
                        } catch (e: Exception) {
                            Toast.makeText(context, "خطا در ذخیره سازی: ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = OfficeTealPrimary)
            ) {
                Icon(Icons.Default.SaveAlt, contentDescription = null)
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = stringResource(R.string.save_to_gallery),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            // Action 2: Export to PDF
            FilledTonalButton(
                onClick = {
                    val bmp = processedBitmap ?: return@FilledTonalButton
                    scope.launch {
                        ensureSaved()
                        val pdf = PdfExporter.createPdfFromBitmap(context, bmp)
                        generatedPdfFile = pdf
                        Toast.makeText(context, context.getString(R.string.pdf_success), Toast.LENGTH_SHORT).show()
                        PdfExporter.openPdf(context, pdf)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.PictureAsPdf, contentDescription = null)
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = stringResource(R.string.export_pdf),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            // Action 3: Direct Messenger Share (Eitaa, Bale, Rubika, Telegram, WhatsApp)
            OutlinedButton(
                onClick = {
                    val bmp = processedBitmap ?: return@OutlinedButton
                    scope.launch {
                        ensureSaved()
                        val pdf = generatedPdfFile ?: PdfExporter.createPdfFromBitmap(context, bmp)
                        generatedPdfFile = pdf
                        PdfExporter.shareFile(
                            context = context,
                            file = pdf,
                            mimeType = "application/pdf",
                            chooserTitle = "ارسال مدرک به پیام‌رسان‌ها (ایتا، بله، روبیکا، تلگرام، واتساپ)"
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Send, contentDescription = null)
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = stringResource(R.string.share_messengers),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }

            // Home shortcut button
            TextButton(
                onClick = onHome,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            ) {
                Icon(Icons.Default.Home, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("بازگشت به صفحه اصلی")
            }
        }
    }
}

@Composable
fun FilterTabButton(
    title: String,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(
                if (isSelected) OfficeTealPrimary else MaterialTheme.colorScheme.surface
            )
            .border(
                1.dp,
                if (isSelected) OfficeTealPrimary else MaterialTheme.colorScheme.surfaceVariant,
                RoundedCornerShape(10.dp)
            )
            .clickable { onClick() }
            .padding(vertical = 10.dp, horizontal = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface
        )
    }
}
