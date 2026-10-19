# 📱 Flutter Mobile Application: Android Build & Setup Guide

This guide details building and deploying the Flutter Robot Controller mobile application for Android tablets and phones.

---

## 1. Prerequisites

1. **Flutter SDK:** Version 3.12.2 or higher
2. **Android Studio:** With Android SDK (Platform API 34+ and Build-Tools)
3. **Java Development Kit (JDK):** JDK 17 or higher
4. **Android Device / Tablet:**
   - Minimum SDK: Android 5.0 (API 21)
   - Target SDK: Android 14 (API 34)

---

## 2. Environment Configuration

The Flutter app connects to the shared FastAPI backend:

```dart
// robot_project/flutter_app/lib/services/robot_service.dart
final service = RobotService(baseUrl: 'http://<BACKEND_IP>:8000');
```

When running in local development with an Android emulator, use `http://10.0.2.2:8000`.
When running on a physical Android tablet, ensure the tablet and server are on the same Wi-Fi subnet, and specify the server IP (e.g., `http://192.168.1.100:8000`).

---

## 3. Building Android Artifacts

Navigate to the Flutter project directory:

```bash
cd robot_project/flutter_app
```

### Get Dependencies
```bash
flutter pub get
```

### Run in Debug Mode
To run directly on a connected tablet over USB / Wi-Fi ADB:
```bash
flutter run
```

### Build Debug APK
Produces a test APK suitable for sideloading onto restaurant tablets:
```bash
flutter build apk --debug
```
Output location:
`build/app/outputs/flutter-apk/app-debug.apk`

### Build Production Release APK
Produces an optimized, tree-shaken release binary:
```bash
flutter build apk --release
```
Output location:
`build/app/outputs/flutter-apk/app-release.apk`

---

## 4. Brand Palette Verification
The app is styled with the official two-color brand palette:
- **Chalk Yellow:** `#FFFF99` (Used on buttons, toggles, badges, and markers with Deep Navy Blue text)
- **Deep Navy Blue:** `#000066` (Used on headers, card outlines, titles, and text)
- **High-Contrast Rule:** Text on Chalk Yellow is always `#000066`, never white.
