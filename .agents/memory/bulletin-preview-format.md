---
name: Bulletin preview format
description: Exact CSS values and layout for pixel-perfect MALI-METEO official bulletin reproduction (derived from Lovable reference code + official scanned bulletin images).
---

## Design tokens

```
FONT   = '"Segoe UI", "Liberation Sans", Arial, Helvetica, sans-serif'   ← sans-serif, NOT Times New Roman
BLUE   = '#2e74b5'      ← info bar, section titles, borders, footer bg
ORANGE_TITLE = '#c86a1f'  ← section heading "Prévision des températures..."
CELL_VILLE = '#c9c9c9'  ← grey: Ville row
CELL_TMAX  = '#d9a066'  ← warm orange: Tmax row
CELL_TMIN  = '#dce6f1'  ← light blue: Tmin row
CELL_BORDER = '2px solid #ffffff'
```

## Header
Use `header-full.jpg` as a full-width `<img>` — this is the real scanned header image.
Do NOT reconstruct it with CSS. Below it goes a blue info bar (BLUE background, white text, 15px) with:
  - left: "Bulletin [type] du [date] A [heure TU]"
  - right italic: "Valide jusqu'à [validite]"

## Situation Générale
- `<h2>` in BLUE, 22px bold, margin-bottom 12px
- Bordered box: `border: 2px solid BLUE`, padding 16px 20px
- Content: "Le temps sera marqué par :" in bold, then each field as `• [text]` paragraph

## Temperature tables
Column layout: 1/7 of page width per cell (label + up to 6 cities).
Last group with <6 cities uses `width: (totalCols/7)*100%` so last table is narrower.
- Ville row: CELL_VILLE bg, CELL_BORDER
- Tmax row: CELL_TMAX bg, CELL_BORDER  
- Tmin row: CELL_TMIN bg, CELL_BORDER (Radio, National, Journaux only — NOT Matinal)

Section title: ORANGE_TITLE, 22px bold, "Prévision des températures maximales de la journée"

## Footer
BLUE background, white text, centered, 13px:
- Line 1: "**Agence Nationale de la Météorologie** (MALI-METEO) sise Zone Aéroportuaire de Bamako-Sénou"
- Line 2: "BP : 237 | Tél. (223) 20 20 62 04 | Fax : (223) 20 20 21 10 | malimeteo@malimeteo.ml"

## Per bulletin type
- **Radio**: Header + info bar + SG + Tmax + Tmin tables
- **Matinal**: Header + info bar + SG + Tmax-only tables
- **Journaux**: Header + info bar + SG + vigilance map/city grid + Tmax + Tmin tables
- **ORTM**: Header + info bar + map overlay (mali-map-ortm.png) with city labels
- **National**: Header + info bar + SG + map overlay (mali-map-national.png) + Footer + PageBreak + Header again + Tmax + Tmin tables

## Assets (in artifacts/meteo-app/public/assets/)
- header-full.jpg — full scanned header (primary)
- header-bg.jpg — header background only
- mali-meteo-logo.png, mali-seal.png — logo files
- footer.jpg — scanned footer image (alternative to CSS footer)
- mali-map-ortm.png, mali-map-national.png — Mali map images for ORTM/National
- mali-vigilance-map.png — vigilance map for Journaux
