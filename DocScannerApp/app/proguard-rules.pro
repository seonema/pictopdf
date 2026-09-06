# ProGuard and R8 optimization rules for DocScanner

# Jetpack Compose rules
-keepclassmembers class * extends androidx.compose.ui.Modifier { *; }
-dontwarn androidx.compose.**

# Kotlin Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembernames class kotlinx.** {
    volatile <fields>;
}

# Keep data models
-keep class com.example.docscanner.data.** { *; }

# Coil Image Loader
-keep class coil.** { *; }
-dontwarn coil.**
