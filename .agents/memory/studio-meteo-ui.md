---
name: Studio Météo UI architecture
description: 4-mode editing interface for the MALI-METEO bulletin editor — paint brush system, compass rose, undo/redo, copy-paste, vigilance type+level
---

## Rule
EditBulletin.tsx manages `editMode`, `activeBrush`, `brushType`, `brushNiveau`, `clipboard`, and history. MaliInteractiveMap.tsx receives mode+brush and routes interactions accordingly.

## Mode behaviour
- **temperature**: city click → TempPanel (big +/- steppers). Scroll wheel on marker = ±1°C via `onTempScroll`.
- **condition**: palette in ContextBar → activeBrush = condition value. City click = `onPaintCity` → immediate apply, no panel.
- **vent**: city click → WindPanel (CompassRose SVG + speed stepper).
- **vigilance**: TWO-step brush: brushType (phenomenon) + brushNiveau (severity) → activeBrush = `"${type}|${niveau}"`. Region click OR drag = `onPaintRegion` → decodes both parts.

## Vigilance system (IMPORTANT — was plain colour-only, now type+level)
- `VIGILANCE_TYPES` in constants.ts: 8 phenomena — orages ⛈️, canicule 🔥, vent_fort 💨, poussiere 🌫️, fraicheur ❄️, pluies 🌧️, inondations 🌊, secheresse 🏜️
- `VIGILANCE_NIVEAUX`: 4 levels — pas_vigilance (vert), attentifs (jaune), tres_vigilants (orange), absolue (rouge)
- VigilanceData shape: `{ region: string; niveau: string; type: string }` — `type` field added (was missing)
- `getInitialVigilanceData()` now includes `type: 'aucun'`
- MiniVigilanceMap: renders type emoji icon on top of coloured regions (using centroid of largest ring)
- activeBrush encoding: `"${type}|${niveau}"` — paintRegion decodes via `split('|')`

## Key components (all in MaliInteractiveMap.tsx)
- `CompassRose` — SVG with 8 wedge sectors + animated pointer
- `Stepper` — reusable +/- numeric control
- `TempPanel` / `WindPanel` / `VigilanceEditPanel` — bottom panels per mode
- `CityListSidebar` — collapsible city list (🏙️ toggle) with copy/paste per row

## Marker size
- 26×26px circles (was 40px — too big, caused overlap in dense south Mali)
- Font: 10px for tmax, 7px for tmin/wind labels
- iconSize: [26,38], iconAnchor: [13,13]

## History (undo/redo)
- Stack: `history.current: Snapshot[]`, `historyIdx.current: number`. Max 40 snapshots.
- Ctrl+Z / Ctrl+Y keyboard shortcuts. triggerSave is a ref to avoid stale closure.

## Copy/paste
- `clipboard: VilleData | null` in EditBulletin. Paste overwrites `nom` with target city name.
- Available in TempPanel header, WindPanel header, CityListSidebar rows.

## BulletinPreview vigilance
- `data.vigilanceNiveaux` (NOT `data.donneesVigilance`) feeds `MiniVigilanceMap`

**Why:** brushing modes eliminate click→popup round-trips; type+level vigilance matches real meteorological practice (phenomenon + severity); smaller markers prevent southern Mali overlap.
