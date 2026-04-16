# Step 20 MVP Test and Deployment Runbook

This runbook executes the Step 20 objective from BUILD_TRACKER.md.

## 1) Web MVP Validation

Run from repository root:

```bash
npm install
npm run test:mvp:web
```

Expected result:
- TypeScript check passes
- Production web build completes

Manual browser checks:
- Record audio, stop recording, and play back result
- Transcribe recorded session
- Run extraction and review entities by type
- Approve extraction results into dossiers
- Open transcription with linked entities and validate modal preview
- Confirm breadcrumbs and settings persistence after reload

## 2) Android Validation and Build

```bash
npm run mobile:sync:android
npm run android:test
npm run android:build:debug
npm run android:build:release
```

Expected result:
- Capacitor sync succeeds
- Gradle unit tests pass
- Debug APK and release AAB build successfully

Artifacts:
- Debug APK: android/app/build/outputs/apk/debug/
- Release AAB: android/app/build/outputs/bundle/release/

## 3) iOS Validation and Build (macOS only)

```bash
npm run mobile:sync:ios
npx cap open ios
```

Then in Xcode:
- Select App scheme and target device/simulator
- Product > Test
- Product > Archive

Expected result:
- iOS build and tests pass in Xcode
- Archive is created for App Store upload

## 4) Vercel Deployment

Project includes vercel.json configured for static SvelteKit output in build/.

CLI deployment:

```bash
npm install -g vercel
vercel login
vercel --prod
```

Dashboard deployment:
- Import repository in Vercel
- Build command: npm run build
- Output directory: build
- Deploy branch: main

## 5) Step 20 Acceptance Checklist

- [ ] MVP runs successfully on web deployment
- [ ] MVP builds and runs on iOS simulator
- [ ] MVP builds and runs on Android emulator/device
- [ ] End-to-end flow works (record -> transcribe -> extract -> dossier)
- [ ] No critical runtime errors
- [ ] Ready for user acceptance testing

## 6) Known Environment Constraints

- iOS build requires macOS + Xcode and cannot be completed on Windows
- Android release signing requires keystore configuration
- Web Speech API support depends on browser and platform implementation
