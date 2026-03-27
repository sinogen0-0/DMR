# Build Tracker: Dungeon Deck Recorder MVP

**Project**: Dungeon Deck Recorder  
**Technology Stack**: Svelte + SvelteKit + Capacitor + TypeScript  
**Status**: Planning → Implementation  
**Last Updated**: [UPDATE DATE]

---

## Overview

Build a fully offline, device-specific audio recording, transcription, and dossier extraction app. Audio records in FLAC, converts to M4A after transcription. Uses Compromise.js for entity extraction (NPCs, locations, plots, characters) with auto-merge at 90% similarity and user-driven merge below threshold. Clicking linked entities in transcriptions opens dossiers in modal overlays. UI follows Industrial Aesthetic design system with breadcrumb navigation and settings.

---

## Phase 1: Core Audio & Transcription

### ☐ Step 1: Set up SvelteKit + Capacitor Project Structure

**Objective**: Initialize SvelteKit project with Capacitor integration, TypeScript, and platform detection.

**Deliverables**:
- SvelteKit project created with TypeScript enabled
- Capacitor initialized for iOS and Android
- Platform detection utility (web vs. mobile)
- Basic project structure with `src/lib/` for services/stores and `src/routes/` for pages

**Context & References**:
- SvelteKit Docs: https://kit.svelte.dev/
- Capacitor Docs: https://capacitorjs.com/docs

**Files to Create**:
- `src/lib/utils/platformDetector.ts` — Platform detection (web/iOS/Android)
- `.env.example` — Environment template
- `capacitor.config.ts` — Capacitor configuration

**Acceptance Criteria**:
- [ ] SvelteKit dev server runs locally (`npm run dev`)
- [ ] Capacitor configured for iOS and Android
- [ ] Platform detection returns correct environment (web/mobile)
- [ ] TypeScript compiles without errors

**Status**: ⏳ Not Started

---

### ☐ Step 2: Implement Audio Recording Service

**Objective**: Create audio recording service using Web Audio API (web) and Capacitor Audio plugin (mobile), defaulting to FLAC format.

**Deliverables**:
- Audio recording service with start/stop/pause functionality
- FLAC recording support (use recorder.js or similar WASM library for FLAC encoding)
- Platform-specific implementations (Web Audio API vs. Capacitor)
- Error handling and permission management

**Context & References**:
- [DESIGN.md](./DESIGN.md) — Industrial Aesthetic (UI styling, if needed)
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- Capacitor Audio: https://capacitorjs.com/docs/apis/audio
- Recorder.js: https://github.com/mattdiamond/Recorderjs

**Files to Create**:
- `src/lib/services/audioService.ts` — Main recording service
- `src/lib/services/audio/webAudioRecorder.ts` — Web Audio API implementation
- `src/lib/services/audio/capacitorAudioRecorder.ts` — Capacitor implementation

**Acceptance Criteria**:
- [ ] Audio records in FLAC format
- [ ] Recording start/stop/pause works on web
- [ ] Recording permissions handled correctly
- [ ] Service exports platform-agnostic interface

**Status**: ⏳ Not Started

---

### ☐ Step 3: Create Storage Abstraction (IndexedDB/Filesystem API)

**Objective**: Implement storage layer for recordings using IndexedDB (web) and Filesystem API (mobile), with FLAC → M4A conversion after transcription.

**Deliverables**:
- Storage abstraction service (unified interface for web/mobile)
- IndexedDB schema for recordings metadata
- Filesystem API integration for mobile file storage
- FLAC → M4A conversion utility (use ffmpeg.wasm for web, native for mobile)
- Methods: saveRecording(), loadRecording(), deleteRecording(), listRecordings()

**Context & References**:
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- Capacitor Filesystem: https://capacitorjs.com/docs/apis/filesystem
- ffmpeg.wasm: https://www.npmjs.com/package/@ffmpeg/ffmpeg

**Files to Create**:
- `src/lib/services/storageService.ts` — Unified storage interface
- `src/lib/services/storage/indexedDBStorage.ts` — IndexedDB implementation
- `src/lib/services/storage/filesystemStorage.ts` — Filesystem API implementation
- `src/lib/services/storage/codecConverter.ts` — FLAC → M4A conversion

**Acceptance Criteria**:
- [ ] Recordings save to IndexedDB (web) with metadata
- [ ] Recordings save to device filesystem (mobile)
- [ ] FLAC → M4A conversion completes successfully
- [ ] Conversion triggered after transcription step
- [ ] Storage service provides unified CRUD interface

**Status**: ⏳ Not Started

---

### ☐ Step 4: Implement Web Speech API Transcription Service

**Objective**: Build transcription service using Web Speech API for offline speech-to-text functionality.

**Deliverables**:
- Transcription service that processes audio Blobs
- Web Speech API integration with fallback handling
- Language detection and configuration
- Streaming transcription results with real-time updates

**Context & References**:
- Web Speech API: https://wicg.github.io/speech-api/
- MDN Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

**Files to Create**:
- `src/lib/services/transcriptionService.ts` — Web Speech API wrapper
- `src/lib/services/transcription/speechRecognition.ts` — Speech Recognition implementation

**Acceptance Criteria**:
- [ ] Web Speech API initializes and accepts audio Blob
- [ ] Transcription returns text output
- [ ] Error handling for unsupported browsers/API failures
- [ ] Service returns unified interface for later extensions

**Status**: ⏳ Not Started

---

## Phase 2: Dossier Extraction & Categorization

### ☐ Step 5: Integrate Compromise.js for Entity Extraction (NER)

**Objective**: Integrate Compromise.js to extract entities (names, locations) from transcriptions with D&D-specific customization.

**Deliverables**:
- Compromise.js integration with custom D&D entity lists
- Entity extraction function: analyzeTranscription(text) → Entity[]
- Types: NPC names, Player Characters, Locations, Story Plot elements
- Confidence scoring for each extraction
- Custom word list for fantasy D&D terms

**Context & References**:
- Compromise.js: https://www.npmjs.com/package/compromise
- Entity Types: CHARACTERS, NPC_REGISTRY, LOCATIONS, STORY_PLOTS

**Files to Create**:
- `src/lib/services/extractionService.ts` — Compromise.js wrapper
- `src/lib/data/dndEntityLists.ts` — D&D-specific entity word lists
- `src/lib/types/extraction.ts` — Entity type definitions

**Acceptance Criteria**:
- [ ] Compromise.js initializes without errors
- [ ] Entity extraction identifies names and locations from sample D&D text
- [ ] Custom D&D word list improves accuracy
- [ ] Returns typed Entity[] with confidence scores

**Status**: ⏳ Not Started

---

### ☐ Step 6: Build Categorization Service

**Objective**: Classify extracted entities into dossier types (NPC, Player Character, Location, Story Plot).

**Deliverables**:
- Categorization service using rule-based/keyword classification
- Functions: categorizeEntity(entity) → DossierType
- Mapping for each entity type with confidence scoring
- Fallback handling for ambiguous classifications

**Files to Create**:
- `src/lib/services/categorizationService.ts` — Entity categorization logic
- `src/lib/data/categorizationRules.ts` — Classification rules and keywords

**Acceptance Criteria**:
- [ ] categorizeEntity() returns one of: NPC, PLAYER_CHARACTER, LOCATION, STORY_PLOT
- [ ] Rule-based classification achieves >80% accuracy on test data
- [ ] Fallback category assigned when ambiguous

**Status**: ⏳ Not Started

---

### ☐ Step 7: Create Extraction Approval UI (Transcription Review Screen)

**Objective**: Build UI workflow for user to confirm/edit/reject AI-extracted entities before saving to dossiers.

**Deliverables**:
- New screen: `src/routes/transcriptions/[id]/review.svelte`
- Display transcription text alongside extracted entities
- Multi-step approval workflow: show extraction → user confirms → saves to dossiers
- Edit capability for entity name, type, and description
- Apply Industrial Aesthetic: see [DESIGN.md](./DESIGN.md) (inset fields, outset buttons)
- Component: `src/components/ExtractionPreview.svelte` for rendering extractions

**Context & References**:
- [DESIGN.md](./DESIGN.md) — Industrial Aesthetic guidelines (rows 1-150)
- Stitch Design: Reference "THE DOSSIERS" screen structure

**Files to Create**:
- `src/routes/transcriptions/[id]/review.svelte` — Extraction review page
- `src/components/ExtractionPreview.svelte` — Entity display/edit component

**Acceptance Criteria**:
- [ ] Review screen displays transcription text on left, extractions on right
- [ ] User can confirm, edit, or reject each extraction
- [ ] Edited extractions persist correctly
- [ ] UI follows Industrial Aesthetic (inset/outset bevels, warm palette)
- [ ] Accepted extractions pass to Step 8 (dossier saving)

**Status**: ⏳ Not Started

---

### ☐ Step 8: Implement Dossier Data Model (SvelteStore + IndexedDB)

**Objective**: Create structured dossier data model with fields for each entity type, stored in SvelteStore and IndexedDB.

**Deliverables**:
- Dossier TypeScript types: `Dossier`, `NPCDossier`, `LocationDossier`, `PlotDossier`, `CharacterDossier`
- SvelteStore for dossier state management
- IndexedDB schema for dossier persistence
- CRUD methods: createDossier(), readDossier(), updateDossier(), deleteDossier(), listDossiers(filter)
- Fields per dossier: name, type, description, relationships, appearances, locations mentioned, created_at, updated_at

**Context & References**:
- Stitch Design reference for dossier structure (from design files)

**Files to Create**:
- `src/lib/types/dossier.ts` — Dossier type definitions
- `src/lib/stores/dossierStore.ts` — SvelteStore + IndexedDB integration
- `src/lib/services/dossierService.ts` — Dossier CRUD operations

**Acceptance Criteria**:
- [ ] Dossier types support NPC, Player Character, Location, Story Plot
- [ ] SvelteStore reactive updates work
- [ ] Dossiers persist to IndexedDB
- [ ] CRUD operations complete successfully
- [ ] Relationships can be stored (e.g., NPC linked to location)

**Status**: ⏳ Not Started

---

## Phase 3: Dossier Management & Merging

### ☐ Step 9: Build Auto-Merge Logic (90% Similarity Threshold)

**Objective**: Implement automatic entity merging at 90% similarity threshold; entities below 90% trigger user-driven merge workflow.

**Deliverables**:
- Similarity matching algorithm (string similarity, Levenshtein distance, etc.)
- Auto-merge function: checkAndMergeEntity(newEntity, existingDossiers) → merge result or user-driven prompt
- User-driven merge UI component for manual conflict resolution
- Merge history tracking (which entities merged, when, which fields kept)

**Files to Create**:
- `src/lib/services/mergeService.ts` — Merge logic and similarity matching
- `src/lib/utils/similarity.ts` — String similarity algorithm
- `src/components/MergeConflictResolver.svelte` — User-driven merge UI

**Acceptance Criteria**:
- [ ] Similarity matching returns 0-100 score
- [ ] Auto-merge triggers at ≥90% similarity
- [ ] Manual merge prompt triggers for <90% similarity
- [ ] Merged dossier retains all relevant information
- [ ] Merge history recorded

**Status**: ⏳ Not Started

---

### ☐ Step 10: Implement Entity Reference Linking

**Objective**: Enable clicking linked words/entities in transcription text to open dossier in modal overlay.

**Deliverables**:
- Entity detection in transcription text (highlight mentions)
- Click handler to identify clicked entity
- Modal component (`src/components/DossierModal.svelte`) to display dossier preview
- "Open Full Dossier" link from modal to dossier detail page
- Close modal on background click or close button

**Files to Create**:
- `src/components/DossierModal.svelte` — Modal component
- `src/lib/utils/entityLinking.ts` — Transcription text parsing for entity highlighting
- Update `src/routes/transcriptions/[id]/+page.svelte` — Add entity highlighting and click handlers

**Acceptance Criteria**:
- [ ] Linked entities highlighted in transcription text
- [ ] Clicking entity opens DossierModal
- [ ] Modal displays dossier name, type, key info
- [ ] "Open Full Dossier" link navigates to detail page
- [ ] Modal closes on background click or close button
- [ ] Modal doesn't obscure transcription context (positioned appropriately)

**Status**: ⏳ Not Started

---

## Phase 4: Dossier Browsing & Management

### ☐ Step 11: Build Dossier Browse UI (By Type)

**Objective**: Create dossier browsing interface with tabs for each entity type (CHARACTERS, NPCs, LOCATIONS, STORY_PLOTS) and breadcrumb navigation.

**Deliverables**:
- Screen: `src/routes/dossiers/[type]/+page.svelte` — Dossier list filtered by type
- Tabs for entity types: CHARACTERS, NPC_REGISTRY, LOCATIONS, STORY_PLOTS
- Filter/sort UI (sort by date, name, status)
- Card component displaying: image, name, type indicator, merged entity LED dot, mention count, last updated
- Breadcrumb component showing: Home > Dossiers > [Type]
- Pagination or infinite scroll for long lists

**Context & References**:
- [DESIGN.md](./DESIGN.md) — Industrial Aesthetic (outset card bevels, LED indicators, tonal separation)
- Stitch Design: Reference existing "THE DOSSIERS" screen for tabs and card layout

**Files to Create**:
- `src/routes/dossiers/+page.svelte` — Dossier hub with type selection
- `src/routes/dossiers/[type]/+page.svelte` — Dossier list by type
- `src/components/DossierCard.svelte` — Enhanced card with merged indicator, mention count
- `src/components/Breadcrumbs.svelte` — Navigation breadcrumb component

**Acceptance Criteria**:
- [ ] Tabs filter dossiers by type
- [ ] Cards display: image, name, type, LED dot (merged), mention count, last updated
- [ ] Breadcrumbs show: Home > Dossiers > [Type Name]
- [ ] Clicking card navigates to dossier detail
- [ ] UI follows Industrial Aesthetic (no rounded corners, asymmetrical spacing, warm palette)

**Status**: ⏳ Not Started

---

### ☐ Step 12: Create Dossier Detail View

**Objective**: Build detailed view for individual dossier with editing capability, relationship management, and mention tracking.

**Deliverables**:
- Screen: `src/routes/dossiers/[id]/+page.svelte` — Dossier detail page
- Display all dossier fields (name, type, description, relationships, appearances, locations mentioned)
- Edit mode: allow updating fields inline
- Relationships section: view/manage linked entities (e.g., NPC linked to location)
- Mentions section: show all transcriptions where this entity appears
- Breadcrumb: Home > Dossiers > [Type] > [Entity Name]
- Delete option with confirmation

**Context & References**:
- [DESIGN.md](./DESIGN.md) — Industrial Aesthetic

**Files to Create**:
- `src/routes/dossiers/[id]/+page.svelte` — Dossier detail page

**Acceptance Criteria**:
- [ ] All dossier fields display correctly
- [ ] Edit mode allows updating fields
- [ ] Changes save to SvelteStore and IndexedDB
- [ ] Relationships can be added/removed
- [ ] Mentions section shows all associated transcriptions
- [ ] Breadcrumb reflects: Home > Dossiers > [Type] > [Entity Name]
- [ ] Delete functionality works with confirmation

**Status**: ⏳ Not Started

---

## Phase 5: Design Adaptation & New UI Screens

### ☐ Step 13: Audit & Document Existing Stitch Design

**Objective**: Review Stitch design files, identify reusable components and layouts, document gaps for new features.

**Deliverables**:
- `STITCH_DESIGN_AUDIT.md` — Document existing screens and what's reusable
- List of reusable UI patterns: tabs, card layouts, filter/sort UI, bottom nav, spacing, typography
- Identified gaps: transcription review UI, settings page, entity linking workflow, breadcrumbs
- Color/spacing/typography extraction for consistency

**Context & References**:
- Stitch Design: Extract screens from `stitch_dungeon_deck_recorder.zip` and `code.html`

**Files to Create**:
- `STITCH_DESIGN_AUDIT.md` — Design audit document

**Acceptance Criteria**:
- [ ] All existing Stitch screens documented
- [ ] Reusable components identified with specific patterns/measurements
- [ ] Gaps and new screens clearly marked
- [ ] Design system tokens extracted (colors, spacing, typography matches)

**Status**: ⏳ Not Started

---

### ☐ Step 14: Design Transcription Review Screen

**Objective**: Create mock/prototype for Transcription Review screen showing extraction approval workflow.

**Deliverables**:
- Screen design: transcription text on left, extracted entities preview on right
- Controls: Confirm, Edit, Reject buttons for each extraction
- Visual hierarchy and layout reflecting Industrial Aesthetic ([DESIGN.md](./DESIGN.md))
- Inset input fields for editing, outset action buttons
- Header strip with "Review Transcription" label

**Context & References**:
- [DESIGN.md](./DESIGN.md) — Industrial Aesthetic inset/outset bevels, warm palette, functional orange buttons

**Acceptance Criteria**:
- [ ] Screen design approved by user
- [ ] Layout matches Industrial Aesthetic guidelines
- [ ] Interaction flow (confirm/edit/reject) is clear
- [ ] Ready for implementation (Step 7 will build this)

**Status**: ⏳ Not Started

---

### ☐ Step 15: Design Settings Page

**Objective**: Create mock/prototype for Settings page with codec toggle, merge threshold slider, and reference link style preference.

**Deliverables**:
- Screen design with organized control modules
- Controls: Audio codec toggle (FLAC-to-M4A vs Opus), merge similarity threshold slider (default 90%), reference link style (modal vs full-page)
- Header strip with "SETTINGS" label
- Save/Cancel buttons
- Visual hierarchy following Industrial Aesthetic

**Context & References**:
- [DESIGN.md](./DESIGN.md) — Header strip pattern, control module organization, warm palette

**Acceptance Criteria**:
- [ ] Screen design approved by user
- [ ] All settings controls visible and organized
- [ ] Layout follows Industrial Aesthetic
- [ ] Ready for implementation

**Status**: ⏳ Not Started

---

### ☐ Step 16: Design Dossier Modal Component

**Objective**: Create mock/prototype for floating modal used when clicking linked entities in transcriptions.

**Deliverables**:
- Modal design: compact display of dossier preview
- Content: dossier name, type indicator (LED dot), key field, short description
- Controls: "Open Full Dossier" link, close button ("×")
- Positioning: right-aligned side panel or center modal (user preference from Step 15)
- Visual style: 24px blur ambient shadow, inset content area, warm palette

**Context & References**:
- [DESIGN.md](./DESIGN.md) — Ambient shadow, inset content, warm palette

**Acceptance Criteria**:
- [ ] Modal design approved by user
- [ ] Doesn't obstruct transcription context
- [ ] Styling follows Industrial Aesthetic
- [ ] Ready for implementation

**Status**: ⏳ Not Started

---

### ☐ Step 17: Implement Breadcrumb Navigation Component

**Objective**: Build reusable breadcrumb component for use across dossier screens.

**Deliverables**:
- Component: `src/components/Breadcrumbs.svelte`
- Accepts breadcrumb items (path) as prop
- Renders: Home > [Item 1] > [Item 2] > etc.
- Click handlers for navigation
- Visual styling: labels, separators (use "/" or ">"), warm palette
- Follows Industrial Aesthetic

**Context & References**:
- [DESIGN.md](./DESIGN.md) — Typography (label-sm for breadcrumb labels), spacing

**Files to Create**:
- `src/components/Breadcrumbs.svelte` — Breadcrumb component

**Acceptance Criteria**:
- [ ] Component accepts breadcrumb path array
- [ ] Renders correctly with separators
- [ ] Click handlers navigate correctly
- [ ] Styling follows Industrial Aesthetic

**Status**: ⏳ Not Started

---

### ☐ Step 18: Adapt Existing Dossier Browse Screen

**Objective**: Enhance the existing Stitch "THE DOSSIERS" screen with breadcrumbs, merged entity indicators, and mention counts.

**Deliverables**:
- Update `src/routes/dossiers/[type]/+page.svelte` to:
  - Add breadcrumb at top (Home > Dossiers > [Type])
  - Enhance cards to show: image, name, type, LED dot (merged indicator), mention count from transcriptions, last updated timestamp
  - Keep existing tabs (CHARACTERS, NPC_REGISTRY, LOCATIONS, STORY_PLOTS)
  - Maintain filter/sort UI from Stitch
  - Asymmetrical spacing and outset card bevels (Industrial Aesthetic)

**Context & References**:
- [DESIGN.md](./DESIGN.md) — Outset card bevels, LED indicators (secondary color), asymmetrical spacing
- [STITCH_DESIGN_AUDIT.md](./STITCH_DESIGN_AUDIT.md) — (from Step 13) Reference card layout, tabs, spacing

**Files to Update**:
- `src/routes/dossiers/[type]/+page.svelte`
- `src/components/DossierCard.svelte` — (create/update with merged indicator + mention count)

**Acceptance Criteria**:
- [ ] Breadcrumbs display and navigate correctly
- [ ] Cards show all required info: image, name, type, LED dot, mention count, last updated
- [ ] Tabs filter dossiers correctly
- [ ] Visual style maintains Industrial Aesthetic
- [ ] Card layout aligns with Stitch design patterns

**Status**: ⏳ Not Started

---

### ☐ Step 19: Build Transcription View with Entity Linking

**Objective**: Build transcription viewer that highlights linked entities and opens dossier modal on click.

**Deliverables**:
- Screen: `src/routes/transcriptions/[id]/+page.svelte` — Display transcription with entity linking
- Highlight linked entities (NPCs, locations, plots) in transcription text
- Click handler: opening DossierModal with dossier preview
- Modal positioning: side panel (right-aligned) or center modal per user preference (Step 15)
- Context: Show which dossier is linked, breadcrumb showing: Home > Transcriptions > [Date/Title]

**Context & References**:
- [DESIGN.md](./DESIGN.md) — Highlighting style, warm palette

**Files to Create/Update**:
- `src/routes/transcriptions/[id]/+page.svelte` — Transcription viewer with entity linking
- `src/lib/utils/entityLinking.ts` — Parse transcription text, identify and highlight entities
- (Reuse Step 10's DossierModal component)

**Acceptance Criteria**:
- [ ] Linked entities highlighted in transcription text
- [ ] Clicking entity opens DossierModal
- [ ] Modal displays correctly without obscuring context
- [ ] "Open Full Dossier" link navigates to detail page
- [ ] Close modal functionality works

**Status**: ⏳ Not Started

---

## Phase 6: Testing & Deployment

### ☐ Step 20: Test & Deploy MVP

**Objective**: Complete end-to-end testing and deploy to Vercel (web), iOS, and Android.

**Deliverables**:
- Web testing: Record audio → transcribe → extract → approve → browse dossiers → click links (full flow)
- Mobile testing: Same flow on iOS simulator and Android emulator
- Performance testing: Compromise.js on large transcriptions, merge performance, storage performance
- Deployment to Vercel (web)
- Build iOS app bundle for App Store
- Build Android APK for Play Store

**Testing Checklist**:
- [ ] Audio recording and transcription work offline
- [ ] Entity extraction accurate for D&D language
- [ ] Auto-merge and manual merge workflows function correctly
- [ ] Dossier CRUD operations work across all platforms
- [ ] Entity linking highlights and modals work
- [ ] Settings persist across sessions
- [ ] Different entity types (NPC, Location, Plot, Character) handle correctly
- [ ] Breadcrumbs navigate correctly
- [ ] Industrial Aesthetic applied consistently across screens
- [ ] No console errors on web or mobile

**Files/Tools**:
- `vercel.json` — Vercel deployment config
- Build scripts for iOS/Android

**Acceptance Criteria**:
- [ ] MVP runs successfully on web (Vercel)
- [ ] MVP builds and runs on iOS simulator
- [ ] MVP builds and runs on Android emulator
- [ ] Full audio → transcribe → extract → dossier workflow functional
- [ ] No critical bugs or errors
- [ ] Ready for user acceptance testing

**Status**: ⏳ Not Started

---

## Progress Summary

| Phase | Steps | Status |
|-------|-------|--------|
| Phase 1: Core Audio & Transcription | 1-4 | ⏳ Not Started |
| Phase 2: Extraction & Categorization | 5-8 | ⏳ Not Started |
| Phase 3: Dossier Management & Merging | 9-10 | ⏳ Not Started |
| Phase 4: Dossier Browsing & Management | 11-12 | ⏳ Not Started |
| Phase 5: Design Adaptation & New UI | 13-19 | ⏳ Not Started |
| Phase 6: Testing & Deployment | 20 | ⏳ Not Started |
| **TOTAL** | **20 steps** | **⏳ Not Started** |

---

## Key Context Files to Reference

- [DESIGN.md](./DESIGN.md) — Industrial Aesthetic design system (colors, typography, spacing, elevation principles)
- [STITCH_DESIGN_AUDIT.md](./STITCH_DESIGN_AUDIT.md) — (to be created in Step 13) Audit of reusable Stitch design components
- Stitch Design Files: `stitch_dungeon_deck_recorder.zip` and `code.html` — Original designs

---

## Approval Workflow

After each step is completed:
1. **Agent reports completion** with deliverables and acceptance criteria met
2. **User reviews** the completed work
3. **User approves or requests changes**
4. **Mark step as ✅ Complete** and proceed to next step

---

## Notes

- All screens must follow `DESIGN.md` (Industrial Aesthetic)
- Use existing Stitch design as foundation where applicable
- Platform detection should inform web vs. mobile implementations
- IndexedDB for web, Filesystem API for mobile storage
- Focus on offline-first functionality (no cloud dependencies)
- Merge at 90% similarity threshold, manual merge for lower matches
- Settings page allows toggling between codec options and merge behavior