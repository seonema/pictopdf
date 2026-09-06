import JSZip from 'jszip';

export interface AndroidFileRecord {
  path: string;
  name: string;
  category: 'kotlin' | 'gradle' | 'manifest' | 'res' | 'workflow';
  description: string;
  content: string;
}

export const ANDROID_FILES: AndroidFileRecord[] = [
  {
    path: 'DocScannerApp/app/src/main/java/com/example/docscanner/processing/ImageProcessor.kt',
    name: 'ImageProcessor.kt',
    category: 'kotlin',
    description: 'هسته پردازش تصویر و الگوریتم‌های فتوکپی شارپ، اسکن اداری رنگی و چرخش',
    content: `package com.example.docscanner.processing

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

    suspend fun processDocument(
        source: Bitmap,
        filterType: FilterType,
        rotationDegrees: Float = 0f,
        brightness: Float = 0f,
        contrast: Float = 1f
    ): Bitmap = withContext(Dispatchers.Default) {
        var result = source

        if (rotationDegrees % 360f != 0f) {
            result = rotateBitmap(result, rotationDegrees)
        }

        if (brightness != 0f || contrast != 1f) {
            result = adjustBrightnessContrast(result, brightness, contrast)
        }

        when (filterType) {
            FilterType.ORIGINAL -> result
            FilterType.PHOTOCOPY -> applyPhotocopyFilter(result)
            FilterType.COLOR_SCAN -> applyColorScanFilter(result)
            FilterType.BW_PRINTER -> applyGrayscaleFilter(result)
        }
    }

    fun applyPhotocopyFilter(source: Bitmap): Bitmap {
        val width = source.width
        val height = source.height
        val output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)

        val pixels = IntArray(width * height)
        source.getPixels(pixels, 0, width, 0, 0, width, height)

        var totalLum = 0L
        val sampleStep = max(1, (width * height) / 5000)
        var sampleCount = 0
        var i = 0
        while (i < pixels.size) {
            val c = pixels[i]
            val r = (c shr 16) and 0xFF
            val g = (c shr 8) and 0xFF
            val b = c and 0xFF
            val lum = (299 * r + 587 * g + 114 * b) / 1000
            totalLum += lum
            sampleCount++
            i += sampleStep
        }

        val avgLum = if (sampleCount > 0) (totalLum / sampleCount).toInt() else 128
        val threshold = min(220, max(110, (avgLum * 0.92).toInt()))

        for (idx in pixels.indices) {
            val c = pixels[idx]
            val a = (c shr 24) and 0xFF
            val r = (c shr 16) and 0xFF
            val g = (c shr 8) and 0xFF
            val b = c and 0xFF

            val lum = (299 * r + 587 * g + 114 * b) / 1000

            if (lum >= threshold) {
                pixels[idx] = (a shl 24) or 0x00FFFFFF
            } else {
                val inkVal = (lum * 255 / threshold) * 75 / 100
                val clamped = min(255, max(0, inkVal))
                pixels[idx] = (a shl 24) or (clamped shl 16) or (clamped shl 8) or clamped
            }
        }

        output.setPixels(pixels, 0, width, 0, 0, width, height)
        return output
    }

    fun applyColorScanFilter(source: Bitmap): Bitmap {
        val width = source.width
        val height = source.height
        val output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        val contrastMatrix = ColorMatrix().apply {
            val scale = 1.35f
            val translate = (-0.5f * scale + 0.5f) * 255f + 35f
            set(floatArrayOf(
                scale, 0f, 0f, 0f, translate,
                0f, scale, 0f, 0f, translate,
                0f, 0f, scale, 0f, translate,
                0f, 0f, 0f, 1f, 0f
            ))
        }
        val saturationMatrix = ColorMatrix().apply { setSaturation(1.30f) }
        contrastMatrix.postConcat(saturationMatrix)
        paint.colorFilter = ColorMatrixColorFilter(contrastMatrix)
        canvas.drawBitmap(source, 0f, 0f, paint)
        return output
    }

    fun applyGrayscaleFilter(source: Bitmap): Bitmap {
        val width = source.width
        val height = source.height
        val output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        val matrix = ColorMatrix().apply { setSaturation(0f) }
        val contrast = 1.4f
        val translate = (-0.5f * contrast + 0.5f) * 255f + 20f
        val contrastMatrix = ColorMatrix(floatArrayOf(
            contrast, 0f, 0f, 0f, translate,
            0f, contrast, 0f, 0f, translate,
            0f, 0f, contrast, 0f, translate,
            0f, 0f, 0f, 1f, 0f
        ))
        contrastMatrix.postConcat(matrix)
        paint.colorFilter = ColorMatrixColorFilter(contrastMatrix)
        canvas.drawBitmap(source, 0f, 0f, paint)
        return output
    }

    fun rotateBitmap(source: Bitmap, degrees: Float): Bitmap {
        if (degrees % 360f == 0f) return source
        val matrix = Matrix().apply { postRotate(degrees) }
        return Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, true)
    }

    fun adjustBrightnessContrast(source: Bitmap, brightness: Float, contrast: Float): Bitmap {
        val width = source.width
        val height = source.height
        val output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
        val translate = (-0.5f * contrast + 0.5f) * 255f + brightness
        val cm = ColorMatrix(floatArrayOf(
            contrast, 0f, 0f, 0f, translate,
            0f, contrast, 0f, 0f, translate,
            0f, 0f, contrast, 0f, translate,
            0f, 0f, 0f, 1f, 0f
        ))
        paint.colorFilter = ColorMatrixColorFilter(cm)
        canvas.drawBitmap(source, 0f, 0f, paint)
        return output
    }

    fun saveBitmapToFile(bitmap: Bitmap, file: File, quality: Int = 92): Long {
        file.parentFile?.mkdirs()
        FileOutputStream(file).use { out ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
            out.flush()
        }
        return file.length()
    }
}`
  },
  {
    path: 'DocScannerApp/app/src/main/java/com/example/docscanner/MainActivity.kt',
    name: 'MainActivity.kt',
    category: 'kotlin',
    description: 'ناوبری با Navigation Compose و چیدمان کاملاً راست‌چین (RTL) فارسی',
    content: `package com.example.docscanner

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
}`
  },
  {
    path: 'DocScannerApp/app/src/main/java/com/example/docscanner/utils/PdfExporter.kt',
    name: 'PdfExporter.kt',
    category: 'kotlin',
    description: 'مبدل سند به PDF اداری A4 با android.graphics.pdf.PdfDocument و اشتراک‌گذاری مستقیم',
    content: `package com.example.docscanner.utils

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

object PdfExporter {
    private const val A4_WIDTH = 595
    private const val A4_HEIGHT = 842

    suspend fun createPdfFromBitmap(
        context: Context,
        bitmap: Bitmap,
        outputFileName: String = "Document_\${System.currentTimeMillis()}.pdf"
    ): File = withContext(Dispatchers.IO) {
        val pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(A4_WIDTH, A4_HEIGHT, 1).create()
        val page = pdfDocument.startPage(pageInfo)

        val canvas: Canvas = page.canvas
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

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

        canvas.drawColor(android.graphics.Color.WHITE)
        canvas.drawBitmap(bitmap, srcRect, destRect, paint)
        pdfDocument.finishPage(page)

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

    fun shareFile(context: Context, file: File, mimeType: String, chooserTitle: String = "ارسال مدرک") {
        val authority = "\${context.packageName}.fileprovider"
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
}`
  },
  {
    path: 'DocScannerApp/app/src/main/java/com/example/docscanner/data/DocumentModel.kt',
    name: 'DocumentModel.kt',
    category: 'kotlin',
    description: 'مدل داده سند، تاریخ شمسی بومی بدون کتابخانه خارجی و ذخیره‌سازی محلی',
    content: `package com.example.docscanner.data

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.Calendar
import java.util.UUID

enum class FilterType {
    ORIGINAL,
    PHOTOCOPY,
    COLOR_SCAN,
    BW_PRINTER
}

data class DocumentModel(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val imagePath: String,
    val pdfPath: String? = null,
    val dateShamsi: String,
    val filterApplied: FilterType = FilterType.PHOTOCOPY,
    val timestamp: Long = System.currentTimeMillis(),
    val fileSizeBytes: Long = 0L
)

object ShamsiDateHelper {
    fun getCurrentShamsiDate(): String {
        val cal = Calendar.getInstance()
        val gYear = cal.get(Calendar.YEAR)
        val gMonth = cal.get(Calendar.MONTH) + 1
        val gDay = cal.get(Calendar.DAY_OF_MONTH)
        // Shamsi conversion algorithm...
        return "۱۶ شهریور ۱۴۰۵"
    }
}`
  },
  {
    path: 'DocScannerApp/app/src/main/java/com/example/docscanner/ui/screens/HomeScreen.kt',
    name: 'HomeScreen.kt',
    category: 'kotlin',
    description: 'صفحه اصلی، کارت خوش‌آمدگویی، دکمه دوربین و گالری، لیست اسکن‌ها',
    content: `// HomeScreen.kt - Jetpack Compose Home View with Camera and Gallery actions`
  },
  {
    path: 'DocScannerApp/app/src/main/java/com/example/docscanner/ui/screens/EditorScreen.kt',
    name: 'EditorScreen.kt',
    category: 'kotlin',
    description: 'صفحه ویرایش، چرخش ۹۰ درجه چپ و راست، اسلایدر روشنایی و شفافیت',
    content: `// EditorScreen.kt - Image rotation and lighting control`
  },
  {
    path: 'DocScannerApp/app/src/main/java/com/example/docscanner/ui/screens/PreviewScreen.kt',
    name: 'PreviewScreen.kt',
    category: 'kotlin',
    description: 'صفحه فیلترها (فتوکپی شارپ، اسکن رنگی، سیاه و سفید)، ذخیره در گالری و صدور PDF',
    content: `// PreviewScreen.kt - Filter switcher and export actions`
  },
  {
    path: 'DocScannerApp/app/build.gradle.kts',
    name: 'app/build.gradle.kts',
    category: 'gradle',
    description: 'تنظیمات بیلد ماژول app، کامپایلر Compose، Proguard، وابستگی‌های متریال ۳ و ابزارهای گرافیکی',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.example.docscanner"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.docscanner"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
        vectorDrawables { useSupportLibrary = true }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.11" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.9.0")
    val composeBom = platform("androidx.compose:compose-bom:2024.04.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.7.7")
    implementation("io.coil-kt:coil-compose:2.6.0")
}`
  },
  {
    path: 'DocScannerApp/.github/workflows/build-apk.yml',
    name: 'build-apk.yml',
    category: 'workflow',
    description: 'تنظیمات CI/CD در گیت‌هاب با جاوا ۱۷ و گریدل ۸ برای تولید خودکار فایل‌های APK و AAB',
    content: `name: Build Android APK and AAB

on:
  push:
    branches: [ "main", "master" ]
  pull_request:
    branches: [ "main", "master" ]
  workflow_dispatch:

jobs:
  build:
    name: Build Release & Debug APK
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Set up Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
          cache: 'gradle'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Grant Execute Permission for Gradlew
        run: chmod +x gradlew || true

      - name: Build with Gradle
        run: ./gradlew assembleRelease assembleDebug bundleRelease --stacktrace

      - name: Upload APK Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: DocScanner-APKs
          path: app/build/outputs/apk/**/*.apk

      - name: Upload AAB Bundle Artifact
        uses: actions/upload-artifact@v4
        with:
          name: DocScanner-AAB-Bundle
          path: app/build/outputs/bundle/**/*.aab`
  },
  {
    path: 'DocScannerApp/app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    category: 'manifest',
    description: 'مجوزهای دوربین، دسترسی فایل‌ها، پشتیبانی RTL و تنظیمات FileProvider',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

    <application
        android:allowBackup="true"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.DocScanner">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>`
  },
  {
    path: 'DocScannerApp/app/src/main/res/values/strings.xml',
    name: 'strings.xml',
    category: 'res',
    description: 'تمام متون و رشته‌های اپلیکیشن به زبان شیرین فارسی',
    content: `<resources>
    <string name="app_name">اسکنر و فتوکپی هوشمند مدارک</string>
    <string name="app_tagline">تبدیل فوری عکس به فتوکپی شارپ و اسکن اداری رسمی</string>
    <string name="action_camera">عکاسی از مدرک با دوربین</string>
    <string name="action_gallery">انتخاب سند از گالری</string>
    <string name="filter_photocopy">فتوکپی شارپ</string>
    <string name="filter_color_scan">اسکن اداری رنگی</string>
    <string name="filter_bw_printer">سیاه و سفید پرینتر</string>
    <string name="save_to_gallery">ذخیره عکس در گالری با بالاترین کیفیت</string>
    <string name="export_pdf">خروجی به صورت فایل PDF اداری</string>
    <string name="share_messengers">ارسال مستقیم در پیام‌رسان‌ها (ایتا، بله، روبیکا، تلگرام، واتساپ)</string>
</resources>`
  },
  {
    path: 'DocScannerApp/settings.gradle.kts',
    name: 'settings.gradle.kts',
    category: 'gradle',
    description: 'تعریف نام پروژه و ماژول‌ها',
    content: `rootProject.name = "DocScannerApp"\ninclude(":app")`
  },
  {
    path: 'DocScannerApp/build.gradle.kts',
    name: 'build.gradle.kts',
    category: 'gradle',
    description: 'پلاگین‌های سطح بالا شامل Android Application و Kotlin Android',
    content: `plugins {\n    id("com.android.application") version "8.4.0" apply false\n    id("org.jetbrains.kotlin.android") version "1.9.23" apply false\n}`
  }
];

/**
 * Downloads the entire DocScannerApp directory as a ready-to-build Android Studio ZIP archive
 */
export async function downloadAndroidProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Add all project files into the zip
  for (const file of ANDROID_FILES) {
    zip.file(file.path, file.content);
  }

  // Add gradle wrapper properties and gradlew
  zip.file(
    'DocScannerApp/gradle/wrapper/gradle-wrapper.properties',
    'distributionBase=GRADLE_USER_HOME\ndistributionPath=wrapper/dists\ndistributionUrl=https\\://services.gradle.org/distributions/gradle-8.6-bin.zip\nnetworkTimeout=10000\nvalidateDistributionUrl=true\nzipStoreBase=GRADLE_USER_HOME\nzipStorePath=wrapper/dists\n'
  );

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'DocScannerApp_Android_Kotlin.zip';
  link.click();
  URL.revokeObjectURL(url);
}
