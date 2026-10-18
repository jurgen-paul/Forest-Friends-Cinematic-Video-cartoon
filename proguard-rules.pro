# ==============================================================================
# ProGuard & R8 Configuration Rules
# Application: Forest Friends Cinematic Video Scorer (Android / TWA / Native)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. General Optimization & Obfuscation Flags
# ------------------------------------------------------------------------------
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose

# Optimization passes (default is 5 for maximum code shrinking and inlining)
-optimizationpasses 5
-optimizations !code/simplification/arithmetic,!field/*,!class/merging/*

# Keep source file names and line numbers in stack traces for crash reporting
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# ------------------------------------------------------------------------------
# 2. Android Core & Architecture Components
# ------------------------------------------------------------------------------
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider
-keep public class * extends android.app.backup.BackupAgentHelper
-keep public class * extends android.preference.Preference

-keepclasseswithmembernames class * {
    native <methods>;
}

-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet, int);
}

-keepclassmembers class * extends android.app.Activity {
    public void *(android.view.View);
}

-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# ------------------------------------------------------------------------------
# 3. WebView & JavaScript Interface Bridges
# ------------------------------------------------------------------------------
# Required for Trusted Web Activity (TWA) and WebView bridge to avoid breaking
# JavaScript bindings for audio playback, video controls, and native callbacks
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String);
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
}

-keepclassmembers class * extends android.webkit.WebChromeClient {
    public void *(android.webkit.WebView, ***);
}

# ------------------------------------------------------------------------------
# 4. Google Play Services & Play Core
# ------------------------------------------------------------------------------
-keep class com.google.android.gms.common.** { *; }
-dontwarn com.google.android.gms.**
-keep class com.google.android.play.core.** { *; }
-dontwarn com.google.android.play.core.**

# ------------------------------------------------------------------------------
# 5. Google GenAI & Lyria Audio Serialization Models
# ------------------------------------------------------------------------------
# Preserve DTOs, data classes, and serialized fields used in JSON transport
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
    @com.google.gson.annotations.Expose <fields>;
}

-keepclassmembers class * {
    @com.squareup.moshi.Json <fields>;
}

# Keep Jackson / Kotlinx serialization if used in client bridges
-keepattributes *JavascriptInterface*
-keepclassmembers class **$Companion { *; }

# ------------------------------------------------------------------------------
# 6. Audio Engine, WebAssembly & FFmpeg Native Bindings
# ------------------------------------------------------------------------------
# Keep JNI bindings and classes interacting with C/C++ audio pipelines
-keep class com.arthenica.ffmpegkit.** { *; }
-dontwarn com.arthenica.ffmpegkit.**
-keep class com.google.android.exoplayer2.** { *; }
-dontwarn com.google.android.exoplayer2.**
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# ------------------------------------------------------------------------------
# 7. Kotlin Coroutines & Reflection
# ------------------------------------------------------------------------------
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembernames class kotlinx.coroutines.** {
    volatile <fields>;
}
-dontwarn kotlinx.coroutines.**

# ------------------------------------------------------------------------------
# 8. Security & SSL / OkHttp / Netty
# ------------------------------------------------------------------------------
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase
