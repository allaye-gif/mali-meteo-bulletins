---
name: Leaflet hooks rule
description: Critical rule for react-leaflet inner components (e.g. MapContent using useMap).
---

## The rule

Inside react-leaflet inner components (components that call `useMap()`), **all React hooks must be declared before any conditional return**. Even `useCallback` after an early `if (!data) return null` violates Rules of Hooks and causes runtime errors.

## Symptom

```
Error: Rendered more hooks than during the previous render.
at MapContent MaliInteractiveMap.tsx:126
```

## Fix

Move ALL `useCallback`, `useRef`, `useEffect` etc. to the top of the function body — then do conditional returns at the bottom, just before the JSX.

**Why:** React counts hooks in render order. An early `return null` skips hooks on the second render (when data becomes available), causing a mismatch.
