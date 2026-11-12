# Add project specific ProGuard rules here.
-keep class org.webrtc.** { *; }
-keepclassmembers class org.webrtc.** { *; }
-keep class com.brosync.app.** { *; }
-keepclassmembers class com.brosync.app.** { *; }
-keepattributes *Annotation*
-dontwarn org.webrtc.**
