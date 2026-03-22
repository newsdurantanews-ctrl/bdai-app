# BDAi ProGuard Rules - Maximum Obfuscation
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-dontpreverify
-verbose
-optimizations !code/simplification/arithmetic,!field/*,!class/merging/*

# Obfuscate all
-keep public class com.bdai.azad.MainActivity
-keep public class com.bdai.azad.AdminActivity
-keep public class com.bdai.azad.SplashActivity
-keep public class com.bdai.azad.BDAiMessagingService

# Keep JS interface methods
-keepclassmembers class com.bdai.azad.BDAiBridge {
    @android.webkit.JavascriptInterface <methods>;
}

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Rename everything else
-repackageclasses 'x'
-allowaccessmodification

# String encryption simulation
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
    public static *** e(...);
}
