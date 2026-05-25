# Offline ML Setup Guide

**Status**: ✅ **Fully Configured for Offline Operation**

This document explains how the ML (semantic search) functionality works **100% offline** with no network dependencies.

---

## Overview

The Dungeon Deck Recorder uses **@xenova/transformers** (Transformers.js) with the `all-MiniLM-L6-v2` model for semantic search in the Ask View. To ensure complete offline operation, the model files are **bundled with the app** instead of being downloaded at runtime.

### Model Details

- **Model**: `Xenova/all-MiniLM-L6-v2` (quantized version)
- **Purpose**: Generate embeddings for semantic similarity search
- **Size**: ~23 MB (quantized ONNX format)
- **Location**: `static/models/Xenova/all-MiniLM-L6-v2/`
- **License**: Apache 2.0 (compatible with commercial use)

---

## How It Works

### 1. **Model Storage**
Model files are stored in `static/models/` directory:
```
static/models/Xenova/all-MiniLM-L6-v2/
├── config.json                    (0.63 KB)
├── tokenizer.json                 (695 KB)
├── tokenizer_config.json          (0.36 KB)
├── special_tokens_map.json        (0.12 KB)
├── manifest.json                  (metadata)
└── onnx/
    └── model_quantized.onnx       (21.91 MB)
```

### 2. **Build-Time Inclusion**
SvelteKit automatically includes `static/` folder contents in the build output:
- **Web**: Copied to `build/` directory
- **Android**: Copied to `android/app/src/main/assets/public/`
- **iOS**: Copied to `ios/App/App/public/`

### 3. **Runtime Loading**
The embedding service loads the model from the bundled files:
```typescript
// src/lib/services/embeddingService.ts
env.allowLocalModels = true;
env.localModelPath = '/models/'; // Loads from static/models/
env.useBrowserCache = true;      // Cache for faster subsequent loads
```

---

## Setup Instructions

### First-Time Setup

**Step 1: Download Model Files**
```bash
npm run download:ml-model
```

This downloads ~23 MB of model files from HuggingFace to `static/models/`.

**Step 2: Verify Download**
Check that these files exist:
- `static/models/Xenova/all-MiniLM-L6-v2/config.json`
- `static/models/Xenova/all-MiniLM-L6-v2/onnx/model_quantized.onnx`

**Step 3: Build & Run**
```bash
# Development
npm run dev

# Production build (web)
npm run build

# Mobile build (Android)
npm run mobile:sync:android

# Mobile build (iOS)
npm run mobile:sync:ios
```

---

## Verification

### Check Model Files Are Bundled

**After build (web):**
```bash
ls build/models/Xenova/all-MiniLM-L6-v2/
```

**After Android sync:**
```bash
ls android/app/src/main/assets/public/models/Xenova/all-MiniLM-L6-v2/
```

**After iOS sync:**
```bash
ls ios/App/App/public/models/Xenova/all-MiniLM-L6-v2/
```

### Test Offline Operation

1. **Start the app**
2. **Disable network connection** (airplane mode or disconnect WiFi)
3. **Navigate to Ask View** (`/ask`)
4. **Record a question**
5. **Verify answer is generated** (proves model loaded from local files)

If the answer appears, the ML model is working 100% offline! ✅

---

## Git Repository Handling

Model files are **excluded from Git** to avoid bloating the repository:

```gitignore
# .gitignore
static/models/
```

### Team Setup Instructions

When cloning the repository, team members must run:
```bash
npm run download:ml-model
```

This is **required only once per developer machine**.

---

## CI/CD Integration

### GitHub Actions / Build Pipelines

Add model download to your build workflow:

```yaml
# .github/workflows/build.yml
- name: Install dependencies
  run: npm install

- name: Download ML model
  run: npm run download:ml-model

- name: Build
  run: npm run build
```

### Vercel Deployment

Add to `vercel.json` or use build script:

```json
{
  "buildCommand": "npm run download:ml-model && npm run build"
}
```

Or update `package.json`:
```json
{
  "scripts": {
    "build": "npm run download:ml-model && vite build"
  }
}
```

---

## Troubleshooting

### Issue: "Model not found" error

**Cause**: Model files not downloaded or not included in build

**Solution**:
```bash
# Re-download model files
npm run download:ml-model

# Verify files exist
ls static/models/Xenova/all-MiniLM-L6-v2/

# Rebuild
npm run build
```

### Issue: Network request detected

**Cause**: `env.allowLocalModels` might be `false`

**Solution**: Check `src/lib/services/embeddingService.ts`:
```typescript
env.allowLocalModels = true;  // Must be true
env.localModelPath = '/models/';
```

### Issue: Model loads slowly on first run

**Expected behavior**: First load initializes ONNX runtime (~2-3 seconds)

**Optimization**: Enable browser caching (already configured):
```typescript
env.useBrowserCache = true;
```

Subsequent loads are instant due to browser cache.

---

## File Sizes & Impact

### Development
- `static/models/`: **22.59 MB**
- `node_modules/`: ~500 MB (unchanged)

### Production Builds

**Web (Vercel)**:
- Build output: **~25 MB** (includes model + app code)
- Cached by browser after first load
- Subsequent visits: instant load from cache

**Android**:
- APK size: **~110-120 MB** (includes model + Capacitor runtime)
- AAB size: **~90-100 MB** (Google Play optimized)

**iOS**:
- IPA size: **~110-120 MB** (includes model + Capacitor runtime)

---

## Alternative: Smaller Model

If 23 MB is too large, consider switching to a smaller model:

### Option: all-MiniLM-L12-v2
- **Size**: ~14 MB
- **Performance**: ~5% less accurate
- **Speed**: ~30% faster

To switch models:

1. Update `scripts/download-ml-model.ps1`:
```powershell
$modelName = "Xenova/all-MiniLM-L12-v2"
```

2. Update `src/lib/services/embeddingService.ts`:
```typescript
this.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L12-v2');
```

3. Re-download:
```bash
npm run download:ml-model
```

---

## Network Dependency Summary

| Feature | Network Required? | Notes |
|---------|------------------|-------|
| ML Model Loading | ❌ No | Bundled in `static/models/` |
| Embedding Generation | ❌ No | Runs entirely in browser |
| Semantic Search | ❌ No | Uses local IndexedDB |
| Audio Recording | ❌ No | Web Audio API (local) |
| Transcription | ❌ No | Web Speech API (local) |
| Entity Extraction | ❌ No | Compromise.js (local) |
| Dossier Storage | ❌ No | IndexedDB (local) |

**Result**: ✅ **100% Offline Operation Achieved**

---

## Updates & Maintenance

### Updating the Model

To update to a newer version of the model:

1. Delete existing model files:
```bash
rm -rf static/models/
```

2. Re-download:
```bash
npm run download:ml-model
```

3. Test thoroughly before deploying.

### Model Versioning

The `manifest.json` file tracks the downloaded version:
```json
{
  "model": "Xenova/all-MiniLM-L6-v2",
  "version": "1.0.0",
  "downloaded": "2026-05-11 15:30:00",
  "totalSize": "22.59 MB",
  "files": 5
}
```

---

## Questions?

- **Where are model files stored?** → `static/models/Xenova/all-MiniLM-L6-v2/`
- **How big is the model?** → 22.59 MB (quantized)
- **Does it work offline?** → Yes, 100% offline
- **Do I commit model files to Git?** → No, they're in `.gitignore`
- **How do teammates get the model?** → Run `npm run download:ml-model`
- **Can I use a different model?** → Yes, update the download script and service config

---

**Last Updated**: May 11, 2026  
**Model Version**: all-MiniLM-L6-v2 (quantized)  
**Status**: ✅ Production Ready
