package com.example.docscanner.processing

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Matrix
import android.graphics.Paint
import com.example.docscanner.data.FilterType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max
import kotlin.math.min

/**
 * Pure Android Native Document Image Processing Core
 * Zero external AI models, zero heavy C++ libraries, ultra-fast (<100ms) execution,
 * resulting in an APK size < 10MB and instant offline performance.
 */
object ImageProcessor {

    /**
     * Applies the selected filter asynchronously
     */
    suspend fun processDocument(
        source: Bitmap,
        filterType: FilterType,
        rotationDegrees: Float = 0f,
        brightness: Float = 0f, // -100f to +100f
        contrast: Float = 1f    // 0.5f to 2.5f
    ): Bitmap = withContext(Dispatchers.Default) {
        var result = source

        // Step 1: Handle 90° rotation if needed
        if (rotationDegrees % 360f != 0f) {
            result = rotateBitmap(result, rotationDegrees)
        }

        // Step 2: Apply basic brightness & contrast adjustments
        if (brightness != 0f || contrast != 1f) {
            result = adjustBrightnessContrast(result, brightness, contrast)
        }

        // Step 3: Apply specialized document scanner filters
        when (filterType) {
            FilterType.ORIGINAL -> result
            FilterType.PHOTOCOPY -> applyPhotocopyFilter(result)
            FilterType.COLOR_SCAN -> applyColorScanFilter(result)
            FilterType.BW_PRINTER -> applyGrayscaleFilter(result)
        }
    }

    /**
     * 1. Photocopy Mode (فتوکپی شارپ):
     * High-contrast document binarization with dynamic paper whitening.
     * Turns handwriting and printed text into deep rich black,
     * strips away lighting gradients, grey shadows, and yellowed paper tint.
     */
    fun applyPhotocopyFilter(source: Bitmap): Bitmap {
        val width = source.width
        val height = source.height
        val output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)

        val pixels = IntArray(width * height)
        source.getPixels(pixels, 0, width, 0, 0, width, height)

        // Sample luminance to calculate adaptive threshold
        var totalLum = 0L
        val sampleStep = max(1, (width * height) / 5000)
        var sampleCount = 0
        var i = 0
        while (i < pixels.size) {
            val c = pixels[i]
            val r = (c shr 16) and 0xFF
            val g = (c shr 8) and 0xFF
            val b = c and 0xFF
            // ITU-R BT.601 luminance
            val lum = (299 * r + 587 * g + 114 * b) / 1000
            totalLum += lum
            sampleCount++
            i += sampleStep
        }

        val avgLum = if (sampleCount > 0) (totalLum / sampleCount).toInt() else 128
        // Photocopy cutoff: aggressively whiten background, darken ink
        val threshold = min(220, max(110, (avgLum * 0.92).toInt()))

        for (idx in pixels.indices) {
            val c = pixels[idx]
            val a = (c shr 24) and 0xFF
            val r = (c shr 16) and 0xFF
            val g = (c shr 8) and 0xFF
            val b = c and 0xFF

            val lum = (299 * r + 587 * g + 114 * b) / 1000

            if (lum >= threshold) {
                // Pure 100% white paper background
                pixels[idx] = (a shl 24) or 0x00FFFFFF
            } else {
                // Deep black or crisp dark ink
                val inkVal = (lum * 255 / threshold) * 75 / 100
                val clamped = min(255, max(0, inkVal))
                pixels[idx] = (a shl 24) or (clamped shl 16) or (clamped shl 8) or clamped
            }
        }

        output.setPixels(pixels, 0, width, 0, 0, width, height)
        return output
    }

    /**
     * 2. Color Scan Mode (اسکن اداری رنگی):
     * Preserves vivid colors of official stamps, seals, photo IDs, and signatures,
     * while whitening background shadows via ColorMatrix.
     */
    fun applyColorScanFilter(source: Bitmap): Bitmap {
        val width = source.width
        val height = source.height
        val output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)

        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        // ColorMatrix for document vibrancy and contrast
        // Increases contrast, brightens highlights, and enhances color saturation
        val contrastMatrix = ColorMatrix().apply {
            val scale = 1.35f
            val translate = (-0.5f * scale + 0.5f) * 255f + 35f
            set(
                floatArrayOf(
                    scale, 0f, 0f, 0f, translate,
                    0f, scale, 0f, 0f, translate,
                    0f, 0f, scale, 0f, translate,
                    0f, 0f, 0f, 1f, 0f
                )
            )
        }

        val saturationMatrix = ColorMatrix().apply {
            setSaturation(1.30f) // Enhances red/blue ink stamps
        }

        contrastMatrix.postConcat(saturationMatrix)
        paint.colorFilter = ColorMatrixColorFilter(contrastMatrix)
        canvas.drawBitmap(source, 0f, 0f, paint)

        return output
    }

    /**
     * 3. B&W Printer Grayscale (سیاه و سفید پرینتر):
     * Generates a balanced grayscale document optimized for office printing
     * without wasting toner.
     */
    fun applyGrayscaleFilter(source: Bitmap): Bitmap {
        val width = source.width
        val height = source.height
        val output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)

        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        val matrix = ColorMatrix()
        matrix.setSaturation(0f)

        // High contrast for clean printing
        val contrast = 1.4f
        val translate = (-0.5f * contrast + 0.5f) * 255f + 20f
        val contrastMatrix = ColorMatrix(
            floatArrayOf(
                contrast, 0f, 0f, 0f, translate,
                0f, contrast, 0f, 0f, translate,
                0f, 0f, contrast, 0f, translate,
                0f, 0f, 0f, 1f, 0f
            )
        )
        contrastMatrix.postConcat(matrix)

        paint.colorFilter = ColorMatrixColorFilter(contrastMatrix)
        canvas.drawBitmap(source, 0f, 0f, paint)
        return output
    }

    /**
     * Rotates bitmap by specified degrees (e.g. 90°, 180°, 270°)
     */
    fun rotateBitmap(source: Bitmap, degrees: Float): Bitmap {
        if (degrees % 360f == 0f) return source
        val matrix = Matrix().apply { postRotate(degrees) }
        return Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, true)
    }

    /**
     * Adjusts brightness and contrast
     */
    fun adjustBrightnessContrast(source: Bitmap, brightness: Float, contrast: Float): Bitmap {
        val width = source.width
        val height = source.height
        val output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)

        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        val translate = (-0.5f * contrast + 0.5f) * 255f + brightness
        val cm = ColorMatrix(
            floatArrayOf(
                contrast, 0f, 0f, 0f, translate,
                0f, contrast, 0f, 0f, translate,
                0f, 0f, contrast, 0f, translate,
                0f, 0f, 0f, 1f, 0f
            )
        )
        paint.colorFilter = ColorMatrixColorFilter(cm)
        canvas.drawBitmap(source, 0f, 0f, paint)
        return output
    }

    /**
     * Saves bitmap to disk as high-quality JPEG
     */
    fun saveBitmapToFile(bitmap: Bitmap, file: File, quality: Int = 92): Long {
        file.parentFile?.mkdirs()
        FileOutputStream(file).use { out ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
            out.flush()
        }
        return file.length()
    }
}
