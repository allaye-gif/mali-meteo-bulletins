---
name: Studio Météo UI architecture
description: 4-mode editing interface for the MALI-METEO bulletin editor — paint brush system, compass rose, undo/redo, copy-paste
---

## Rule
EditBulletin.tsx manages `editMode` ('temperature' | 'condition' | 'vent' | 'vigilance'), `activeBrush`, `clipboard`, and a history stack (useRef). MaliInteractiveMap.tsx receives mode+brush and routes interactions accordingly.

## Mode behaviour
- **temperature**: city click → TempPanel (big +/- steppers). Scroll wheel on marker = ±1°C via `onTempScroll`.
- **condition**: palette in ContextBar → activeBrush = condition value. City click = `onPaintCity` → immediate apply, no panel.
- **vent**: city click → WindPanel (CompassRose SVG + speed stepper).
- **vigilance**: palette in ContextBar → activeBrush = vigilance niveau. Region click OR drag = `onPaintRegion` → immediate paint.

## Key components (all in MaliInteractiveMap.tsx)
- `CompassRose` — SVG with 8 wedge-shaped clickable sectors + animated pointer
- `Stepper` — reusable +/- numeric control
- `TempPanel` / `WindPanel` / `VigilanceEditPanel` — bottom panels per mode
- `CityListSidebar` — collapsible city list (🏙️ toggle, 220px wide) with copy/paste per row

## History (undo/redo)
- Stack: `history.current: Snapshot[]`, `historyIdx.current: number`
- `pushHistory()` truncates future, appends. Max 40 snapshots.
- Ctrl+Z / Ctrl+Y keyboard shortcuts wired via `window.addEventListener('keydown')`.
- triggerSave is a ref (`triggerSaveRef`) to avoid stale closure in undo/redo.

## Copy/paste
- `clipboard: VilleData | null` state in EditBulletin
- Paste copies all fields (tmax, tmin, condition, directionVent, vitesseVent), overwrites `nom` with target city name
- Available in TempPanel header, WindPanel header, CityListSidebar rows, and via `onCopy`/`onPaste` props

## Vigilance in BulletinPreview
- `data.vigilanceNiveaux` (NOT `data.donneesVigilance`) feeds `MiniVigilanceMap`

**Why:** brushing modes eliminate the click→popup→select round-trip; history prevents data loss; compass rose matches UX quality the user expects.
