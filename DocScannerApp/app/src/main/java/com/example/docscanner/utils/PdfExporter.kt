package com.example.docscanner.utils

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.pdf.PdfDocument
import android.net.Uri
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

/**
 * Standard A4 Office PDF Document Exporter using pure Android Native PdfDocument API.
 * Zero external libraries, high speed, crisp quality.
 */
object PdfExporter {

    // Standard A4 dimensions in points (72 points/inch)
    // 595 x 842 pt (or scaled to 1240 x 1754 for high-definition print)
    private const val A4_WIDTH = 595
    private const val A4_HEIGHT = 842

    suspend fun createPdfFromBitmap(
        context: Context,
        bitmap: Bitmap,
        outputFileName: String = "Document_${System.currentTimeMillis()}.pdf"
    ): File = withContext(Dispatchers.IO) {
        val pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(A4_WIDTH, A4_HEIGHT, 1).create()
        val page = pdfDocument.startPage(pageInfo)

        val canvas: Canvas = page.canvas
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        // Calculate aspect ratio to fit image comfortably on A4 page with 20pt margin
        val margin = 24
        val availableWidth = A4_WIDTH - (margin * 2)
        val availableHeight = A4_HEIGHT - (margin * 2)

        val imgWidth = bitmap.width
        val imgHeight = bitmap.height

        val scale = minOf(
            availableWidth.toFloat() / imgWidth.toFloat(),
            availableHeight.toFloat() / imgHeight.toFloat()
        )

        val destWidth = (imgWidth * scale).toInt()
        val destHeight = (imgHeight * scale).toInt()

        val left = margin + (availableWidth - destWidth) / 2
        val top = margin + (availableHeight - destHeight) / 2

        val srcRect = Rect(0, 0, imgWidth, imgHeight)
        val destRect = Rect(left, top, left + destWidth, top + destHeight)

        // Draw white background
        canvas.drawColor(android.graphics.Color.WHITE)
        canvas.drawBitmap(bitmap, srcRect, destRect, paint)

        pdfDocument.finishPage(page)

        // Save PDF to documents directory
        val docsDir = File(context.filesDir, "Documents")
        if (!docsDir.exists()) docsDir.mkdirs()

        val pdfFile = File(docsDir, outputFileName)
        FileOutputStream(pdfFile).use { out ->
            pdfDocument.writeTo(out)
            out.flush()
        }

        pdfDocument.close()
        pdfFile
    }

    suspend fun createPdfFromFile(
        context: Context,
        imageFile: File,
        outputFileName: String
    ): File = withContext(Dispatchers.IO) {
        val bitmap = BitmapFactory.decodeFile(imageFile.absolutePath)
        createPdfFromBitmap(context, bitmap, outputFileName)
    }

    /**
     * Shares a file (PDF or Image) to messaging apps (Eitaa, Bale, Rubika, Telegram, WhatsApp, etc.)
     */
    fun shareFile(
        context: Context,
        file: File,
        mimeType: String,
        chooserTitle: String = "ارسال سند در پیام‌رسان‌ها"
    ) {
        val authority = "${context.packageName}.fileprovider"
        val contentUri: Uri = FileProvider.getUriForFile(context, authority, file)

        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, contentUri)
            putExtra(Intent.EXTRA_SUBJECT, file.nameWithoutExtension)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        val chooser = Intent.createChooser(shareIntent, chooserTitle).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(chooser)
    }

    /**
     * Views a PDF file in installed PDF reader
     */
    fun openPdf(context: Context, file: File) {
        val authority = "${context.packageName}.fileprovider"
        val contentUri: Uri = FileProvider.getUriForFile(context, authority, file)

        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(contentUri, "application/pdf")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }
}
