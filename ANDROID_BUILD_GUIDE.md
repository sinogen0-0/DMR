# Android Build & Deploy Guide (Without Android Studio)

This guide shows how to build and deploy the APK to your Android device using command-line tools only.

---

## Prerequisites

### 1. Android SDK Platform Tools (for `adb`)

**Download**: https://developer.android.com/studio/releases/platform-tools

**Install**:
1. Extract ZIP to `C:\Android\sdk\platform-tools\` (or any location)
2. Add to PATH: `C:\Android\sdk\platform-tools\`

**Verify**:
```bash
adb version
```

### 2. Enable USB Debugging on Device

**On your Android device:**
1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times (enables Developer Options)
3. Go to **Settings** → **Developer Options**
4. Enable **USB Debugging**
5. Connect device via USB
6. Authorize the computer when prompted on device

**Verify connection:**
```bash
adb devices
```

Should show your device (e.g., `SolarSino`)

---

## Quick Commands

### Option 1: Build & Deploy to Connected Device (Recommended)

```bash
npm run android:deploy
```

**What it does:**
1. ✅ Builds web app with ML model
2. ✅ Syncs to Android project
3. ✅ Builds APK (~110-120 MB)
4. ✅ Uninstalls old version
5. ✅ Installs new APK on device
6. ✅ Launches the app

**Requirements**: Device connected via USB with debugging enabled

---

### Option 2: Build APK Only (Manual Install)

```bash
npm run android:build-apk
```

**What it does:**
1. ✅ Builds web app with ML model
2. ✅ Syncs to Android project
3. ✅ Builds APK (~110-120 MB)

**Output**: `android\app\build\outputs\apk\debug\app-debug.apk`

**Manual install steps:**
1. Copy APK to device (USB/email/cloud)
2. Enable "Install from Unknown Sources" on device
3. Open APK file on device to install

---

## Detailed Build Process

### Step-by-Step Manual Build

```bash
# 1. Build web app (includes ML model)
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Build APK
cd android
.\gradlew.bat assembleDebug
cd ..

# 4. Install to device (if connected)
adb install android\app\build\outputs\apk\debug\app-debug.apk

# 5. Launch app
adb shell am start -n com.dungeondeck.recorder/.MainActivity
```

---

## Troubleshooting

### Device Not Detected

**Check connection:**
```bash
adb devices
```

**If empty:**
1. Reconnect USB cable
2. Enable USB debugging on device
3. Authorize computer on device
4. Try different USB cable/port
5. Restart adb server:
   ```bash
   adb kill-server
   adb start-server
   ```

---

### Installation Failed

**Error: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"**
- **Cause**: Previous version installed with different signature
- **Fix**: Uninstall old version first
  ```bash
  adb uninstall com.dungeondeck.recorder
  npm run android:deploy
  ```

**Error: "INSTALL_FAILED_INSUFFICIENT_STORAGE"**
- **Cause**: Not enough space on device
- **Fix**: Free up space (~120 MB needed)

**Error: "Installation failed: Unknown sources"**
- **Cause**: Unknown sources disabled
- **Fix**: Settings → Security → Enable "Install from Unknown Sources"

---

### Build Failed

**Error: "Gradle build failed"**
- **Check**: `android/build` folder permissions
- **Fix**: Clean build cache
  ```bash
  cd android
  .\gradlew.bat clean
  .\gradlew.bat assembleDebug
  cd ..
  ```

**Error: "Web build failed"**
- **Check**: TypeScript errors
- **Fix**: Run type check
  ```bash
  npm run type-check
  ```

---

## Build Outputs

### Debug APK (Development)

- **Path**: `android\app\build\outputs\apk\debug\app-debug.apk`
- **Size**: ~110-120 MB
- **Signing**: Debug keystore (auto-generated)
- **Use**: Testing on your own devices

### Release AAB (Production)

```bash
npm run android:build:release
```

- **Path**: `android\app\build\outputs\bundle\release\app-release.aab`
- **Size**: ~90-100 MB (optimized)
- **Signing**: Requires release keystore
- **Use**: Google Play Store upload

---

## Advanced Options

### Install APK Manually via ADB

```bash
# Uninstall old version
adb uninstall com.dungeondeck.recorder

# Install new APK
adb install android\app\build\outputs\apk\debug\app-debug.apk

# Launch app
adb shell am start -n com.dungeondeck.recorder/.MainActivity
```

### View Device Logs

```bash
# All logs
adb logcat

# App logs only
adb logcat | grep "Capacitor"

# Clear logs
adb logcat -c
```

### Take Screenshot

```bash
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png screenshot.png
```

---

## Build Variants

### Debug Build (Default)

```bash
npm run android:build-apk
# or
cd android && .\gradlew.bat assembleDebug
```

- Includes debugging symbols
- Larger APK size
- Allows USB debugging

### Release Build (Optimized)

```bash
npm run android:build:release
# or
cd android && .\gradlew.bat bundleRelease
```

- Minified and optimized
- Smaller bundle size
- Requires signing configuration

---

## Quick Reference

| Task | Command |
|------|---------|
| Build & deploy to device | `npm run android:deploy` |
| Build APK only | `npm run android:build-apk` |
| Build release bundle | `npm run android:build:release` |
| Check connected devices | `adb devices` |
| Install APK manually | `adb install <path-to-apk>` |
| Uninstall app | `adb uninstall com.dungeondeck.recorder` |
| Launch app | `adb shell am start -n com.dungeondeck.recorder/.MainActivity` |
| View logs | `adb logcat` |

---

## What's Included in APK

✅ **Twin Peaks Tape Deck UI** - Full CRT aesthetic  
✅ **Recording View** - Tape deck controls with reels  
✅ **Dossier View** - Category browser with scroll wheel  
✅ **Ask View** - ML-powered Q&A  
✅ **Offline ML Model** - 22.59 MB (all-MiniLM-L6-v2)  
✅ **All Services** - Audio, transcription, NER, categorization  
✅ **Capacitor Runtime** - Android bindings  

**Total APK Size**: ~110-120 MB

---

## File Locations

```
android/
├── app/
│   ├── build/
│   │   └── outputs/
│   │       ├── apk/
│   │       │   └── debug/
│   │       │       └── app-debug.apk      ← Debug APK
│   │       └── bundle/
│   │           └── release/
│   │               └── app-release.aab    ← Release Bundle
│   └── src/
│       └── main/
│           └── assets/
│               └── public/
│                   └── models/            ← ML Model (bundled)
```

---

## Testing Offline ML

After installing on device:

1. **Turn on Airplane Mode**
2. **Open Dungeon Deck Recorder**
3. **Navigate to ASK view** (top nav)
4. **Record a question**
5. **Check if answer appears** ✅

If answer generates while offline, ML model is working!

---

**Last Updated**: May 11, 2026  
**Minimum Android Version**: 6.0 (API 23)  
**Target Android Version**: 14 (API 34)
