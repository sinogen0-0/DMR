# Dungeon Deck Recorder

A fully offline, cross-platform audio recording and transcription app built with Svelte, Capacitor, and TypeScript. Records audio, transcribes it using Web Speech API, extracts entities (NPCs, locations, plots) using Compromise.js, and organizes them into interactive dossiers.

## 🎯 Features

- **Audio Recording**: Record in FLAC format (high-quality) with optional Opus codec (efficient)
- **Offline Transcription**: Uses Web Speech API for speech-to-text without cloud dependencies
- **Entity Extraction**: Lightweight NER using Compromise.js for fantasy/D&D-specific language
- **Auto-Merging**: Automatically merges duplicate entities at 90% similarity threshold
- **Dossier Organization**: Browse and manage extracted entities by type (NPCs, Locations, Plots, Characters)
- **Entity Linking**: Click linked words in transcriptions to preview associated dossiers
- **Cross-Platform**: Runs on web (Vercel), iOS (App Store), and Android (Play Store)
- **Industrial Aesthetic**: Unique beige-box 1990s-inspired UI with inset/outset bevels

## 📋 Tech Stack

- **Frontend**: Svelte + SvelteKit with TypeScript
- **Cross-Platform**: Capacitor (iOS, Android)
- **Storage**: IndexedDB (web), Filesystem API (mobile)
- **NER**: Compromise.js
- **Styling**: Tailwind CSS + custom Industrial Aesthetic design system
- **Build**: Vite

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- For iOS builds: Xcode 14+
- For Android builds: Android Studio

### Installation

1. Clone the repository:
```bash
cd /path/to/DMR
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
# Build web version
npm run build

# Preview production build
npm run preview
```

### Mobile Development

#### iOS

```bash
# Add iOS platform
npx cap add ios

# Build and sync
npm run build
npx cap sync ios

# Open in Xcode
npx cap open ios
```

#### Android

```bash
# Add Android platform
npx cap add android

# Build and sync
npm run build
npx cap sync android

# Open in Android Studio
npx cap open android
```

## 📁 Project Structure

```
src/
├── lib/
│   ├── components/       # Reusable Svelte components
│   ├── services/         # Business logic (audio, transcription, storage, etc.)
│   ├── stores/          # SvelteKit stores for state management
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions (platform detection, etc.)
├── routes/              # SvelteKit pages and routes
├── app.html            # Main HTML template
├── app.d.ts            # SvelteKit environment types
└── app.css             # Global styles

public/                 # Static assets
package.json           # Dependencies and scripts
svelte.config.js      # SvelteKit configuration
tsconfig.json         # TypeScript configuration
vite.config.ts        # Vite configuration
capacitor.config.ts   # Capacitor configuration
```

## 🏗️ Implementation Phases

See [BUILD_TRACKER.md](./BUILD_TRACKER.md) for detailed implementation steps.

### Phase 1: Core Audio & Transcription (Steps 1-4)
- Project setup ✅
- Audio recording service
- Storage abstraction layer
- Web Speech API integration

### Phase 2: Extraction & Categorization (Steps 5-8)
- Compromise.js NER integration
- Entity categorization
- Extraction approval UI
- Dossier data model

### Phase 3: Merging & Linking (Steps 9-10)
- Auto-merge logic (90% threshold)
- Entity reference linking

### Phase 4: Dossier UI (Steps 11-12)
- Dossier browse by type
- Dossier detail view

### Phase 5: Design & Polish (Steps 13-19)
- Stitch design audit
- Breadcrumb navigation
- Settings page
- UI refinement

### Phase 6: Testing & Deployment (Step 20)
- Full testing on web, iOS, Android
- Deployment to app stores and Vercel

## 🎨 Design System

This app follows the **Industrial Aesthetic** design system. Key principles:

- **Color Palette**: Warm neutrals (beige, tan, ivory) with functional orange (#9a442d) and green (#4b654e) accents
- **Typography**: Space Grotesk for headers, Inter for body text
- **Elevation**: Physical inset/outset bevels instead of shadows
- **Spacing**: Asymmetrical, high-density layout mimicking industrial hardware
- **Components**: No rounded corners, tonal separation instead of borders

See [DESIGN.md](./DESIGN.md) for complete design guidelines.

## 🔧 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Check TypeScript types
- `npm run format` - Format code with Prettier
- `npm run lint` - Lint code with ESLint

## 📦 Key Dependencies

- `@capacitor/core` - Cross-platform app runtime
- `compromise` - Lightweight NLP for entity extraction
- `svelte` - Frontend framework
- `typescript` - Type safety

## 🐛 Known Limitations

- Web Speech API availability varies by browser (Chrome/Edge recommended)
- Compromise.js accuracy on D&D-specific language may require custom entity lists
- File sizes on mobile may be limited by device storage

## 🔐 Privacy

- **Offline First**: All data stays on device, no cloud uploads
- **Local Storage**: Uses IndexedDB (web) and Filesystem API (mobile)
- **No Tracking**: No analytics or user tracking
- **No Sync**: Each device maintains independent dataset

## 📄 Development Guide

### Adding a New Service

1. Create file in `src/lib/services/`
2. Export a singleton instance or factory function
3. Use TypeScript for type safety
4. Add unit tests

Example:
```typescript
// src/lib/services/myService.ts
export async function doSomething(): Promise<string> {
  return 'result';
}
```

### Adding a New Route

1. Create file in `src/routes/`
2. Create `+page.svelte` for the page content
3. Optionally create `+page.ts` for data loading
4. Use layout files for shared structure

### Adding a New Component

1. Create `.svelte` file in `src/lib/components/`
2. Ensure component name matches file name (PascalCase)
3. Export props via `export let`
4. Document props with JSDoc comments

## 🤝 Contributing

Contributions welcome! Please:

1. Follow the existing code style
2. Add TypeScript types
3. Test on both web and mobile platforms
4. Update BUILD_TRACKER.md if adding steps
5. Maintain Industrial Aesthetic design consistency

## 📝 License

See LICENSE file for details.

## 🤖 AI Development Note

This project is being developed with an AI assistant. Implementation steps are tracked in BUILD_TRACKER.md for transparency and reproducibility.

---

**Last Updated**: March 27, 2026
**Current Phase**: Phase 1, Step 1 (Setup) ✅
**Next**: Step 2 (Audio Recording Service)
