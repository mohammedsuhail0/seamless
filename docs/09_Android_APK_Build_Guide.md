# BroSync Android APK Build & Distribution Guide

This document describes how to compile, test, and distribute the **BroSync Android APK** (Host & Viewer) built with Capacitor.

---

## 1. Architecture Overview

- **Native Wrapper**: Capacitor 6 with native Android project in `packages/viewer/android`.
- **Package Identifier**: `com.brosync.app`
- **Application Name**: **BroSync**
- **Capabilities**:
  * **Screen Broadcasting**: Native Android `FOREGROUND_SERVICE_MEDIA_PROJECTION` capability. Tapping *"Start Lounge Stream"* initiates the native Android system screen capture prompt.
  * **Zero Latency WebRTC**: Low-latency hardware-accelerated video/audio relay.
  * **Cloud Sync**: All user sessions, created rooms, and past screenings automatically sync with Desktop and iOS Safari through the shared BroSync backend API.

---

## 2. Quick Commands

### A. Sync Latest Web Changes to Android
Whenever you modify UI in `packages/viewer`:
```bash
npm run android:sync
```
*(This builds the Vite web bundle and copies all assets directly into `packages/viewer/android/app/src/main/assets/public`)*

### B. Open Project in Android Studio
```bash
npm run android:open
```

---

## 3. Compiling the APK

### Generating a Debug APK (Instant Testing / Sideloading)
Using the Gradle wrapper inside `packages/viewer/android`:
- **Windows (PowerShell)**:
  ```powershell
  cd packages/viewer/android
  .\gradlew assembleDebug
  ```
- **macOS / Linux**:
  ```bash
  cd packages/viewer/android
  ./gradlew assembleDebug
  ```
- **Output Location**:
  `packages/viewer/android/app/build/outputs/apk/debug/app-debug.apk`

You can directly transfer and install this APK on any Android phone (enable *"Install unknown apps"* in Android settings).

---

## 4. Generating a Signed Release APK / AAB (Google Play Store)

1. Generate a keystore:
   ```bash
   keytool -genkey -v -keystore brosync-release.keystore -alias brosync -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Build release APK:
   ```bash
   cd packages/viewer/android
   ./gradlew assembleRelease
   ```
3. Sign the APK using `apksigner` or configure `signingConfigs` in `packages/viewer/android/app/build.gradle`.

---

## 5. Cross-Device Synchronization Behavior

| User Action | Desktop (Electron / Web) | Android APK | iOS Safari |
| :--- | :--- | :--- | :--- |
| **Login** | Obtains JWT from `/api/auth/login` | Obtains JWT from `/api/auth/login` | Obtains JWT from `/api/auth/login` |
| **Host a Room** | Creates room code via `/api/rooms` | Creates room code via `/api/rooms` | Creates room code via `/api/rooms` |
| **Screen Share** | Full OS display via Electron | Full mobile screen via Android capture | Web viewer (join & watch) |
| **Session History** | Fetches `GET /api/rooms/my/history` | Fetches `GET /api/rooms/my/history` | Fetches `GET /api/rooms/my/history` |
