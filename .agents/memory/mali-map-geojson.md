---
name: Mali map GeoJSON
description: How the Mali admin1 shapefile was converted to GeoJSON and how regions map to the 20 cities.
---

## Shapefile → GeoJSON conversion

Only `.shp` files were uploaded (no `.dbf`). Converted using a hand-written Node.js binary parser (no npm package needed).

The admin1 shapefile has exactly **20 features** — one per city used in bulletins.

Region names were assigned by index using centroid proximity matching to known city coordinates:
```
idx 0→Kayes, 1→Koulikoro, 2→Sikasso, 3→Ségou, 4→Mopti, 5→Tombouctou,
6→Gao, 7→Kidal, 8→Taoudéni, 9→Ménaka, 10→Nioro, 11→Kita, 12→Dioïla,
13→Nara, 14→Bougouni, 15→Koutiala, 16→San, 17→Douentza, 18→Bandiagara, 19→Bamako
```

Output: `artifacts/meteo-app/public/mali-admin1.geojson`

**Why:** Mali's admin1 boundaries at this resolution correspond 1:1 to the 20 meteorological stations, making the shapefile ideal for the interactive map.
