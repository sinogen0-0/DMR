# STITCH Design Audit: Dungeon Deck Recorder

## 1. Scope and Sources

This audit documents what can be reused from the Stitch export and what still needs new design work.

Primary sources reviewed:
- [code.html](code.html)
- [screen.png](screen.png)
- [DESIGN.md](DESIGN.md)
- [src/routes/+layout.svelte](src/routes/+layout.svelte)
- [src/routes/+page.svelte](src/routes/+page.svelte)
- [src/routes/dossiers/+page.svelte](src/routes/dossiers/+page.svelte)
- [src/routes/dossiers/[id]/+page.svelte](src/routes/dossiers/[id]/+page.svelte)
- [src/components/DossierCard.svelte](src/components/DossierCard.svelte)
- [src/components/Breadcrumbs.svelte](src/components/Breadcrumbs.svelte)

Assumption:
- The exported Stitch artifact currently provides one fully realized visual screen family centered on THE DOSSIERS with shared shell/chrome patterns.

## 2. Existing Stitch Screens (Documented)

### 2.1 THE DOSSIERS (Archive Browser)

What exists in Stitch:
- Top app bar with brand mark and section nav
- Hero header: SYSTEM_DIRECTORY / ARCHIVES + THE DOSSIERS
- Status LED row: ARCHIVE_LINK_ACTIVE
- Folder-tab strip with 4 tabs:
  - CHARACTERS
  - NPC_REGISTRY
  - LOCATIONS
  - STORY_LOGS
- Main folder body with inset search/sort strip
- Feature card (large dossier)
- Secondary mini card list (compact dossiers)
- Dashed add-new-entity card
- Bottom metadata strip (drive space + last sync)
- Mobile bottom nav (DECK / ARCHIVES / INTEL)

### 2.2 Shared Visual Language from Stitch

Reusable across screens:
- Hard-edged chassis styling with no rounded corners
- Outset and inset bevel utility classes
- Vent texture strip motif
- LED indicator semantics for active/system state
- Label hierarchy using tight uppercase tracking for machine-like metadata

## 3. Reusable Patterns and Components

### 3.1 Reusable Layout Patterns

1. App shell and chrome
- Fixed top bar: 56px height (`h-14`)
- Main content offset: 80px top padding (`pt-20`)
- Optional mobile bottom dock nav

2. Folder interior pattern
- Tab strip appears to sit on top of a recessed folder body
- Body uses a raised frame with recessed inner control rows

3. Dense utility rows
- Small uppercase labels for metadata/status
- Horizontal vent strips as separator/filler

### 3.2 Reusable Component Candidates

1. FolderTabs
- 4-segment tab row
- Active tab with stronger contrast and outset bevel
- Inactive tabs with low-contrast labels and hover lift

2. ArchiveHeader
- Eyebrow label + large title + right-aligned LED status pill

3. DossierFeatureCard
- Dominant card with image, subject badge, role metadata, status report bay, key stats, primary/secondary actions

4. DossierMiniCard
- Compact row card with thumbnail, name, subtitle, chevron affordance

5. RecessedSearchBar
- Inset container with search icon field and sort/filter control block

6. SystemFooterStrip
- Drive meter, timestamp, vent segment

7. DockNavMobile
- 3-icon bottom nav with active segment emphasis

### 3.3 Existing In-App Reuse Already Implemented

Already aligned to Stitch/Industrial language:
- Dossier browse experience:
  - [src/routes/dossiers/+page.svelte](src/routes/dossiers/+page.svelte)
- Dossier card pattern with LED and metadata:
  - [src/components/DossierCard.svelte](src/components/DossierCard.svelte)
- Breadcrumb utility:
  - [src/components/Breadcrumbs.svelte](src/components/Breadcrumbs.svelte)
- Dossier detail page (edit + relationship + mentions):
  - [src/routes/dossiers/[id]/+page.svelte](src/routes/dossiers/[id]/+page.svelte)

## 4. Design Tokens and Measurements Extracted

### 4.1 Core Color Tokens (from Stitch config)

- Surface/base: `#fef9f0`
- Surface container high: `#eee8d8`
- Surface container highest: `#e9e2d0`
- Primary accent: `#9a442d`
- Secondary indicator: `#4b654e`
- Main text: `#363226`
- Outline variant: `#b8b2a0`

### 4.2 Typography

- Headline/label family: Space Grotesk
- Body family: Inter
- Frequent treatment:
  - Uppercase labels
  - Wide tracking for metadata labels (`tracking-widest` / `tracking-[0.2em]`)
  - Heavy display title for section identity

### 4.3 Elevation and Surface Rules

- Outset bevel utility
  - `inset 1px 1px 0 #ffffff, inset -1px -1px 0 #b8b2a0`
- Inset bevel utility
  - `inset 1px 1px 0 #b8b2a0, inset -1px -1px 0 #ffffff`
- Sharp corners globally (radius 0)

### 4.4 Spacing and Density Markers

- Top app bar height: 56px
- Main content top offset: 80px
- Dense interior controls: 8px to 16px spacing bands
- Folder body frame gives visual depth via layered padding and borders

## 5. Gap Analysis for Upcoming Work

### 5.1 Implemented vs Missing

Implemented now:
- Dossier hub and typed browse
- Dossier cards with LED/status metadata
- Dossier detail editing
- Breadcrumb navigation

Still visually under-adapted from Stitch shell:
- Global fixed top app chrome and mobile bottom dock nav are not yet integrated in layout
- Recessed folder tab visual treatment is approximated but not yet a dedicated reusable tabs component
- Search/filter inset strip style can be normalized into a shared component
- System footer strip motif (drive/last sync) is absent from app shell

### 5.2 New Screens Requiring Net-New Design (not in Stitch export)

1. Transcription review flow
- Requires two-pane decision workflow (transcript + extraction actions)
- Existing implementation exists functionally, but can be visually conformed further

2. Tagging parameters screen
- Functional controls exist; needs full shell-level visual consistency pass

3. Settings screen
- Not yet implemented in the shell language; should use modular recessed control bays

4. Entity-linking transcript reader
- Exists functionally; should inherit archive-shell tokens for consistency

## 6. Recommendation Matrix

1. Highest-value design system extraction first
- Create shared shell components:
  - Top app bar
  - FolderTabs
  - RecessedSearchBar
  - MobileDockNav

2. Then normalize page surfaces
- Move repeated bevel/border values into reusable utility classes or CSS variables
- Keep Space Grotesk label treatment standardized for metadata chips and section headers

3. Finally run consistency pass on existing pages
- [src/routes/dossiers/+page.svelte](src/routes/dossiers/+page.svelte)
- [src/routes/dossiers/[id]/+page.svelte](src/routes/dossiers/[id]/+page.svelte)
- [src/routes/transcriptions/[id]/review.svelte](src/routes/transcriptions/[id]/review.svelte)
- [src/routes/tagging-parameters/+page.svelte](src/routes/tagging-parameters/+page.svelte)

## 7. Acceptance Criteria Check (Step 13)

- All existing Stitch screens documented: Complete (current export centers on THE DOSSIERS + shared shell patterns)
- Reusable components identified with specific patterns/measurements: Complete
- Gaps and new screens clearly marked: Complete
- Design system tokens extracted (colors, spacing, typography): Complete
