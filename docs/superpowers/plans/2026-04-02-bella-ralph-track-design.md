# Bella-Ralph Track Design — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based 2D N Scale model train layout designer with drag-and-snap Bachmann EZ Track piece placement, connection validation, and PNG/parts-list/file export.

**Architecture:** React SPA + Konva.js canvas. Pure-function geometry utilities handle all coordinate math and snap detection. Layout state lives in a `useReducer` with full undo/redo. No backend — all data is static JSON bundled with the app. Deploy to Vercel free tier.

**Tech Stack:** React 18, Konva 9 + react-konva 18, Vite 5, Vitest, Vercel

---

## File Structure

```
bella-ralph-track-design/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── constants.js                  # PIXELS_PER_INCH, SNAP_THRESHOLD, etc.
│   ├── data/
│   │   └── catalogue.json            # All placeable N-scale pieces + geometry
│   ├── geometry/
│   │   ├── connectors.js             # Transform connector to world-space coords
│   │   └── snap.js                   # Snap candidate detection + angle matching
│   ├── hooks/
│   │   ├── useLayoutReducer.js       # Layout state + undo/redo
│   │   └── useValidation.js          # Open endpoints, overlaps, floaters
│   ├── components/
│   │   ├── Toolbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── StatusBar.jsx
│   │   ├── ValidationPanel.jsx
│   │   ├── Onboarding.jsx
│   │   └── canvas/
│   │       ├── LayoutCanvas.jsx      # Konva Stage, zoom/pan
│   │       ├── TrackPiece.jsx        # Single placed piece shape
│   │       ├── GridLayer.jsx
│   │       ├── BoundaryLayer.jsx
│   │       └── SnapIndicator.jsx
│   └── utils/
│       ├── export.js                 # PNG export, parts list HTML/CSV
│       └── fileio.js                 # Save/load .brtrack JSON
└── src/__tests__/
    ├── setup.js
    ├── connectors.test.js
    ├── snap.test.js
    ├── useLayoutReducer.test.js
    └── useValidation.test.js
```

---

## Coordinate System & Constants

- All catalogue dimensions are in **real layout inches** (the measurement you'd use on your table).
- Canvas renders at `PIXELS_PER_INCH = 10` pixels per inch at 100% zoom. A 10" straight = 100px.
- A 4×8 ft layout = 480×960px — fits comfortably at default zoom.
- Connector `angle` is measured **clockwise from rightward (0°)** in screen coordinates (y-axis points down).
- Two connectors snap when `|angleDiff(a1, a2) − 180°| < ANGLE_TOLERANCE` AND `distance < SNAP_THRESHOLD`.

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.js`, `vercel.json`, `index.html`, `src/main.jsx`, `src/__tests__/setup.js`

- [ ] **Step 1: Scaffold Vite + React project**

```bash
cd /Users/victorsoares/code/bella-ralph-track-design
npm create vite@latest . -- --template react --force
```

Expected: Vite project files created (index.html, src/App.jsx, etc.)

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install konva react-konva
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 4: Replace `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
  },
})
```

- [ ] **Step 5: Create `src/__tests__/setup.js`**

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Create `vercel.json`**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 7: Add test script to `package.json`**

Open `package.json` and ensure `scripts` includes:
```json
"test": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts at http://localhost:5173

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite+React project with Konva and Vitest"
```

---

## Task 2: Constants & Catalogue Data

**Files:**
- Create: `src/constants.js`
- Create: `src/data/catalogue.json`

- [ ] **Step 1: Create `src/constants.js`**

```js
export const PIXELS_PER_INCH = 10   // at 100% zoom, N scale
export const SNAP_THRESHOLD = 8     // pixels — max distance for snap
export const ANGLE_TOLERANCE = 10   // degrees — max angle error for snap
export const TRACK_WIDTH = 4        // pixels — rendered track roadbed width
export const RAIL_OFFSET = 1.5      // pixels — half-distance between rails

export const SCALE_FACTORS = {
  N:  10,   // pixels per layout inch
  HO: 8,
  O:  6,
  G:  4,
}
```

- [ ] **Step 2: Create `src/data/catalogue.json`**

All connector coordinates are in **inches**. Angles in **degrees** (clockwise from right).
Curves are defined in their canonical orientation: piece starts at (0,0), curves clockwise (downward in screen).
To get a counter-clockwise (upward) curve, the user mirrors the piece horizontally (the canvas supports `mirrorX`).

```json
{
  "N": [
    {
      "id": "S-0.75", "name": "0.75\" Connector", "category": "straight",
      "itemNo": "44899", "price": 3.56,
      "geometry": { "type": "straight", "length": 0.75 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 0.75, "y": 0, "angle": 0 }
      ]
    },
    {
      "id": "S-0.875", "name": "0.875\" Connector", "category": "straight",
      "itemNo": "44899", "price": 3.56,
      "geometry": { "type": "straight", "length": 0.875 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 0.875, "y": 0, "angle": 0 }
      ]
    },
    {
      "id": "S-1.125", "name": "1.125\" Connector", "category": "straight",
      "itemNo": "44829", "price": 5.79,
      "geometry": { "type": "straight", "length": 1.125 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 1.125, "y": 0, "angle": 0 }
      ]
    },
    {
      "id": "S-1.5", "name": "1.5\" Connector", "category": "straight",
      "itemNo": "44899", "price": 3.56,
      "geometry": { "type": "straight", "length": 1.5 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 1.5, "y": 0, "angle": 0 }
      ]
    },
    {
      "id": "S-2.25", "name": "2.25\" Short Section", "category": "straight",
      "itemNo": "44829", "price": 5.79,
      "geometry": { "type": "straight", "length": 2.25 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 2.25, "y": 0, "angle": 0 }
      ]
    },
    {
      "id": "S-4.5", "name": "4.5\" Short Section", "category": "straight",
      "itemNo": "44829", "price": 5.79,
      "geometry": { "type": "straight", "length": 4.5 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 4.5, "y": 0, "angle": 0 }
      ]
    },
    {
      "id": "44811", "name": "5\" Straight", "category": "straight",
      "itemNo": "44811", "price": 3.50,
      "geometry": { "type": "straight", "length": 5 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 5, "y": 0, "angle": 0 }
      ]
    },
    {
      "id": "44815", "name": "10\" Straight", "category": "straight",
      "itemNo": "44815", "price": 5.33,
      "geometry": { "type": "straight", "length": 10 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 10, "y": 0, "angle": 0 }
      ]
    },
    {
      "id": "44887", "name": "30\" Straight", "category": "straight",
      "itemNo": "44887", "price": 18.26,
      "geometry": { "type": "straight", "length": 30 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 30, "y": 0, "angle": 0 }
      ]
    },
    {
      "id": "44820", "name": "10\" Terminal Rerailer", "category": "special",
      "itemNo": "44820", "price": 15.95,
      "geometry": { "type": "straight", "length": 10 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 10, "y": 0, "angle": 0 }
      ]
    },
    {
      "id": "44802", "name": "11.25\" Curved Terminal Rerailer", "category": "special",
      "itemNo": "44802", "price": 15.50,
      "geometry": { "type": "curve", "radius": 11.25, "arc": 30 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 5.625, "y": 1.508, "angle": 30 }
      ]
    },
    {
      "id": "44801", "name": "11.25\" Radius Curve (30°)", "category": "curve",
      "itemNo": "44801", "price": 3.33,
      "geometry": { "type": "curve", "radius": 11.25, "arc": 30 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 5.625, "y": 1.508, "angle": 30 }
      ]
    },
    {
      "id": "44821", "name": "11.25\" Radius Half Section (15°)", "category": "curve",
      "itemNo": "44821", "price": 3.33,
      "geometry": { "type": "curve", "radius": 11.25, "arc": 15 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 2.912, "y": 0.384, "angle": 15 }
      ]
    },
    {
      "id": "44831", "name": "11.25\" Radius Quarter Section (7.5°)", "category": "curve",
      "itemNo": "44831", "price": 2.75,
      "geometry": { "type": "curve", "radius": 11.25, "arc": 7.5 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 1.469, "y": 0.097, "angle": 7.5 }
      ]
    },
    {
      "id": "44001", "name": "11.25\" Radius Curve — Concrete Ties (30°)", "category": "curve",
      "itemNo": "44001", "price": 3.33,
      "geometry": { "type": "curve", "radius": 11.25, "arc": 30, "ties": "concrete" },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 5.625, "y": 1.508, "angle": 30 }
      ]
    },
    {
      "id": "44852", "name": "12.50\" Radius Curve (30°)", "category": "curve",
      "itemNo": "44852", "price": 4.42,
      "geometry": { "type": "curve", "radius": 12.5, "arc": 30 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 6.25, "y": 1.675, "angle": 30 }
      ]
    },
    {
      "id": "44822", "name": "12.50\" Radius Half Section (15°)", "category": "curve",
      "itemNo": "44822", "price": 3.33,
      "geometry": { "type": "curve", "radius": 12.5, "arc": 15 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 3.235, "y": 0.426, "angle": 15 }
      ]
    },
    {
      "id": "44832", "name": "12.50\" Radius Quarter Section (7.5°)", "category": "curve",
      "itemNo": "44832", "price": 2.58,
      "geometry": { "type": "curve", "radius": 12.5, "arc": 7.5 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 1.632, "y": 0.107, "angle": 7.5 }
      ]
    },
    {
      "id": "44853", "name": "14\" Radius Curve (30°)", "category": "curve",
      "itemNo": "44853", "price": 4.67,
      "geometry": { "type": "curve", "radius": 14, "arc": 30 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 7.0, "y": 1.874, "angle": 30 }
      ]
    },
    {
      "id": "44854", "name": "15.50\" Radius Curve (30°)", "category": "curve",
      "itemNo": "44854", "price": 4.67,
      "geometry": { "type": "curve", "radius": 15.5, "arc": 30 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 7.75, "y": 2.075, "angle": 30 }
      ]
    },
    {
      "id": "44834", "name": "15.50\" Radius Quarter Section (7.5°)", "category": "curve",
      "itemNo": "44834", "price": 3.29,
      "geometry": { "type": "curve", "radius": 15.5, "arc": 7.5 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 2.023, "y": 0.133, "angle": 7.5 }
      ]
    },
    {
      "id": "44855", "name": "17.50\" Radius Curve (15°)", "category": "curve",
      "itemNo": "44855", "price": 3.96,
      "geometry": { "type": "curve", "radius": 17.5, "arc": 15 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 4.529, "y": 0.597, "angle": 15 }
      ]
    },
    {
      "id": "44825", "name": "17.50\" Radius Half Section (7.5°)", "category": "curve",
      "itemNo": "44825", "price": 3.33,
      "geometry": { "type": "curve", "radius": 17.5, "arc": 7.5 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 2.284, "y": 0.151, "angle": 7.5 }
      ]
    },
    {
      "id": "44835", "name": "17.50\" Radius Quarter Section (3.75°)", "category": "curve",
      "itemNo": "44835", "price": 3.13,
      "geometry": { "type": "curve", "radius": 17.5, "arc": 3.75 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 1.145, "y": 0.037, "angle": 3.75 }
      ]
    },
    {
      "id": "44804", "name": "19\" Radius Curve (15°)", "category": "curve",
      "itemNo": "44804", "price": 4.58,
      "geometry": { "type": "curve", "radius": 19, "arc": 15 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 4.917, "y": 0.648, "angle": 15 }
      ]
    },
    {
      "id": "44856", "name": "19\" Radius Half Section (7.5°)", "category": "curve",
      "itemNo": "44856", "price": 3.13,
      "geometry": { "type": "curve", "radius": 19, "arc": 7.5 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 2.480, "y": 0.164, "angle": 7.5 }
      ]
    },
    {
      "id": "44836", "name": "19\" Radius Quarter Section (3.75°)", "category": "curve",
      "itemNo": "44836", "price": 2.38,
      "geometry": { "type": "curve", "radius": 19, "arc": 3.75 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 1.243, "y": 0.040, "angle": 3.75 }
      ]
    },
    {
      "id": "44861", "name": "Remote Turnout — Left", "category": "turnout",
      "itemNo": "44861", "price": 65.00,
      "geometry": { "type": "turnout", "hand": "left", "frog": "standard", "divergeRadius": 11.25 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 3.75, "y": 0, "angle": 0 },
        { "id": "C", "x": 3.70, "y": -0.610, "angle": 340.8 }
      ]
    },
    {
      "id": "44862", "name": "Remote Turnout — Right", "category": "turnout",
      "itemNo": "44862", "price": 65.00,
      "geometry": { "type": "turnout", "hand": "right", "frog": "standard", "divergeRadius": 11.25 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 3.75, "y": 0, "angle": 0 },
        { "id": "C", "x": 3.70, "y": 0.610, "angle": 19.2 }
      ]
    },
    {
      "id": "44859", "name": "#6 Turnout — Left", "category": "turnout",
      "itemNo": "44859", "price": 74.75,
      "geometry": { "type": "turnout", "hand": "left", "frog": "#6" },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 5.5, "y": 0, "angle": 0 },
        { "id": "C", "x": 5.42, "y": -0.90, "angle": 350.54 }
      ]
    },
    {
      "id": "44860", "name": "#6 Turnout — Right", "category": "turnout",
      "itemNo": "44860", "price": 74.75,
      "geometry": { "type": "turnout", "hand": "right", "frog": "#6" },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 5.5, "y": 0, "angle": 0 },
        { "id": "C", "x": 5.42, "y": 0.90, "angle": 9.46 }
      ]
    },
    {
      "id": "44863", "name": "#4 Turnout — Left", "category": "turnout",
      "itemNo": "44863", "price": 73.75,
      "geometry": { "type": "turnout", "hand": "left", "frog": "#4" },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 3.75, "y": 0, "angle": 0 },
        { "id": "C", "x": 3.62, "y": -0.91, "angle": 346.0 }
      ]
    },
    {
      "id": "44864", "name": "#4 Turnout — Right", "category": "turnout",
      "itemNo": "44864", "price": 73.75,
      "geometry": { "type": "turnout", "hand": "right", "frog": "#4" },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 3.75, "y": 0, "angle": 0 },
        { "id": "C", "x": 3.62, "y": 0.91, "angle": 14.0 }
      ]
    },
    {
      "id": "44875", "name": "#6 Single Crossover — Left", "category": "turnout",
      "itemNo": "44875", "price": 132.00,
      "geometry": { "type": "crossover", "hand": "left", "frog": "#6", "trackSpacing": 1.5 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 7.5, "y": 0, "angle": 0 },
        { "id": "C", "x": 0, "y": -1.5, "angle": 180 },
        { "id": "D", "x": 7.5, "y": -1.5, "angle": 0 }
      ]
    },
    {
      "id": "44876", "name": "#6 Single Crossover — Right", "category": "turnout",
      "itemNo": "44876", "price": 132.00,
      "geometry": { "type": "crossover", "hand": "right", "frog": "#6", "trackSpacing": 1.5 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 7.5, "y": 0, "angle": 0 },
        { "id": "C", "x": 0, "y": 1.5, "angle": 180 },
        { "id": "D", "x": 7.5, "y": 1.5, "angle": 0 }
      ]
    },
    {
      "id": "44061", "name": "Remote Turnout — Left (Concrete Ties)", "category": "turnout",
      "itemNo": "44061", "price": 66.00,
      "geometry": { "type": "turnout", "hand": "left", "frog": "standard", "divergeRadius": 11.25, "ties": "concrete" },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 3.75, "y": 0, "angle": 0 },
        { "id": "C", "x": 3.70, "y": -0.610, "angle": 340.8 }
      ]
    },
    {
      "id": "44062", "name": "Remote Turnout — Right (Concrete Ties)", "category": "turnout",
      "itemNo": "44062", "price": 66.00,
      "geometry": { "type": "turnout", "hand": "right", "frog": "standard", "divergeRadius": 11.25, "ties": "concrete" },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 },
        { "id": "B", "x": 3.75, "y": 0, "angle": 0 },
        { "id": "C", "x": 3.70, "y": 0.610, "angle": 19.2 }
      ]
    },
    {
      "id": "44840", "name": "30° Crossing", "category": "crossing",
      "itemNo": "44840", "price": 29.75,
      "geometry": { "type": "crossing", "angle": 30, "halfLength": 5 },
      "connectors": [
        { "id": "A", "x": -5, "y": 0, "angle": 180 },
        { "id": "B", "x": 5, "y": 0, "angle": 0 },
        { "id": "C", "x": -4.330, "y": -2.5, "angle": 210 },
        { "id": "D", "x": 4.330, "y": 2.5, "angle": 30 }
      ]
    },
    {
      "id": "44843", "name": "45° Crossing", "category": "crossing",
      "itemNo": "44843", "price": 29.75,
      "geometry": { "type": "crossing", "angle": 45, "halfLength": 5 },
      "connectors": [
        { "id": "A", "x": -5, "y": 0, "angle": 180 },
        { "id": "B", "x": 5, "y": 0, "angle": 0 },
        { "id": "C", "x": -3.536, "y": -3.536, "angle": 225 },
        { "id": "D", "x": 3.536, "y": 3.536, "angle": 45 }
      ]
    },
    {
      "id": "44842", "name": "60° Crossing", "category": "crossing",
      "itemNo": "44842", "price": 29.75,
      "geometry": { "type": "crossing", "angle": 60, "halfLength": 5 },
      "connectors": [
        { "id": "A", "x": -5, "y": 0, "angle": 180 },
        { "id": "B", "x": 5, "y": 0, "angle": 0 },
        { "id": "C", "x": -2.5, "y": -4.330, "angle": 240 },
        { "id": "D", "x": 2.5, "y": 4.330, "angle": 60 }
      ]
    },
    {
      "id": "44841", "name": "90° Crossing", "category": "crossing",
      "itemNo": "44841", "price": 29.75,
      "geometry": { "type": "crossing", "angle": 90, "halfLength": 5 },
      "connectors": [
        { "id": "A", "x": -5, "y": 0, "angle": 180 },
        { "id": "B", "x": 5, "y": 0, "angle": 0 },
        { "id": "C", "x": 0, "y": -5, "angle": 270 },
        { "id": "D", "x": 0, "y": 5, "angle": 90 }
      ]
    },
    {
      "id": "44891", "name": "Hayes Bumper", "category": "bumper",
      "itemNo": "44891", "price": 11.25,
      "geometry": { "type": "bumper", "length": 1.5 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 }
      ]
    },
    {
      "id": "44858", "name": "Flashing LED Bumper", "category": "bumper",
      "itemNo": "44858", "price": 36.00,
      "geometry": { "type": "bumper", "length": 1.3 },
      "connectors": [
        { "id": "A", "x": 0, "y": 0, "angle": 180 }
      ]
    }
  ],
  "HO": [],
  "O": [],
  "G": []
}
```

- [ ] **Step 3: Verify JSON is valid**

```bash
node -e "require('./src/data/catalogue.json'); console.log('valid')"
```

Expected: `valid`

- [ ] **Step 4: Commit**

```bash
git add src/constants.js src/data/catalogue.json
git commit -m "feat: add constants and full N-scale Bachmann EZ Track catalogue"
```

---

## Task 3: Geometry Utilities

**Files:**
- Create: `src/geometry/connectors.js`
- Create: `src/geometry/snap.js`
- Create: `src/__tests__/connectors.test.js`
- Create: `src/__tests__/snap.test.js`

- [ ] **Step 1: Write failing tests for connectors**

Create `src/__tests__/connectors.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { getWorldConnectors } from '../geometry/connectors'

describe('getWorldConnectors', () => {
  it('returns connectors unchanged when rotation=0 and no mirror', () => {
    const piece = {
      x: 100, y: 50, rotation: 0, mirrorX: false,
      connectors: [{ id: 'A', x: 0, y: 0, angle: 180 }, { id: 'B', x: 10, y: 0, angle: 0 }]
    }
    const [a, b] = getWorldConnectors(piece, 10)
    expect(a.worldX).toBeCloseTo(100)
    expect(a.worldY).toBeCloseTo(50)
    expect(a.worldAngle).toBeCloseTo(180)
    expect(b.worldX).toBeCloseTo(200)
    expect(b.worldY).toBeCloseTo(50)
    expect(b.worldAngle).toBeCloseTo(0)
  })

  it('rotates connectors by piece rotation', () => {
    // 10" straight rotated 90° — B should be directly below A
    const piece = {
      x: 0, y: 0, rotation: 90, mirrorX: false,
      connectors: [{ id: 'A', x: 0, y: 0, angle: 180 }, { id: 'B', x: 10, y: 0, angle: 0 }]
    }
    const [a, b] = getWorldConnectors(piece, 10)
    expect(a.worldX).toBeCloseTo(0)
    expect(a.worldY).toBeCloseTo(0)
    expect(b.worldX).toBeCloseTo(0)
    expect(b.worldY).toBeCloseTo(100)  // 10 inches * 10 px/in
    expect(b.worldAngle).toBeCloseTo(90)
  })

  it('mirrors connectors when mirrorX=true', () => {
    const piece = {
      x: 0, y: 0, rotation: 0, mirrorX: true,
      connectors: [{ id: 'A', x: 0, y: 0, angle: 180 }, { id: 'B', x: 5.625, y: 1.508, angle: 30 }]
    }
    const [a, b] = getWorldConnectors(piece, 10)
    // x stays, y negated, angle reflected
    expect(b.worldY).toBeCloseTo(-15.08)
    expect(b.worldAngle).toBeCloseTo(330) // 360 - 30
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/__tests__/connectors.test.js
```

Expected: FAIL — `getWorldConnectors` not found

- [ ] **Step 3: Implement `src/geometry/connectors.js`**

```js
/**
 * Transform a piece's catalogue connectors into world-space coordinates.
 * @param {object} piece - { x, y, rotation (degrees), mirrorX, connectors }
 * @param {number} ppi   - pixels per inch (from PIXELS_PER_INCH or zoom-adjusted)
 * @returns {Array}      - connectors with { id, worldX, worldY, worldAngle }
 */
export function getWorldConnectors(piece, ppi) {
  const { x, y, rotation, mirrorX, connectors } = piece
  const rad = (rotation * Math.PI) / 180

  return connectors.map((c) => {
    // Apply mirrorX before rotation: negate local Y
    const lx = c.x * ppi
    const ly = mirrorX ? -c.y * ppi : c.y * ppi

    // Rotate by piece.rotation
    const worldX = x + lx * Math.cos(rad) - ly * Math.sin(rad)
    const worldY = y + lx * Math.sin(rad) + ly * Math.cos(rad)

    // Angle: mirror negates Y-component of angle, then add rotation
    const localAngle = mirrorX ? (360 - c.angle) % 360 : c.angle
    const worldAngle = (localAngle + rotation + 360) % 360

    return { id: c.id, worldX, worldY, worldAngle }
  })
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run src/__tests__/connectors.test.js
```

Expected: PASS (3 tests)

- [ ] **Step 5: Write failing tests for snap**

Create `src/__tests__/snap.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { angleDiff, isSnapValid, findBestSnap } from '../geometry/snap'

describe('angleDiff', () => {
  it('returns 0 for equal angles', () => expect(angleDiff(45, 45)).toBe(0))
  it('returns 180 for opposite angles', () => expect(angleDiff(0, 180)).toBe(180))
  it('handles wrap-around', () => expect(angleDiff(350, 10)).toBeCloseTo(20))
})

describe('isSnapValid', () => {
  it('returns true when connectors face each other', () => {
    expect(isSnapValid({ worldAngle: 0 }, { worldAngle: 180 })).toBe(true)
    expect(isSnapValid({ worldAngle: 30 }, { worldAngle: 210 })).toBe(true)
  })
  it('returns false when connectors face same direction', () => {
    expect(isSnapValid({ worldAngle: 0 }, { worldAngle: 0 })).toBe(false)
  })
  it('returns false when angle diff is not ~180 degrees', () => {
    expect(isSnapValid({ worldAngle: 0 }, { worldAngle: 90 })).toBe(false)
  })
})

describe('findBestSnap', () => {
  it('returns null when no pieces placed', () => {
    const dragged = [{ id: 'A', worldX: 100, worldY: 100, worldAngle: 180 }]
    expect(findBestSnap(dragged, [], 8, 10)).toBeNull()
  })

  it('returns snap candidate when connectors are close and facing each other', () => {
    const dragged = [{ id: 'A', worldX: 100, worldY: 100, worldAngle: 0 }]
    const placed = [{
      instanceId: 'abc',
      connectors: [{ id: 'B', worldX: 104, worldY: 100, worldAngle: 180 }],
      connectedTo: { B: null }
    }]
    const snap = findBestSnap(dragged, placed, 8, 10)
    expect(snap).not.toBeNull()
    expect(snap.draggedConnectorId).toBe('A')
    expect(snap.targetInstanceId).toBe('abc')
    expect(snap.targetConnectorId).toBe('B')
  })

  it('ignores already-connected target connectors', () => {
    const dragged = [{ id: 'A', worldX: 100, worldY: 100, worldAngle: 0 }]
    const placed = [{
      instanceId: 'abc',
      connectors: [{ id: 'B', worldX: 104, worldY: 100, worldAngle: 180 }],
      connectedTo: { B: 'other:C' }   // already connected
    }]
    expect(findBestSnap(dragged, placed, 8, 10)).toBeNull()
  })
})
```

- [ ] **Step 6: Run test — verify it fails**

```bash
npx vitest run src/__tests__/snap.test.js
```

Expected: FAIL

- [ ] **Step 7: Implement `src/geometry/snap.js`**

```js
import { ANGLE_TOLERANCE } from '../constants'

/**
 * Shortest angular difference between two angles (0–180).
 */
export function angleDiff(a1, a2) {
  const diff = Math.abs((a1 - a2 + 360) % 360)
  return Math.min(diff, 360 - diff)
}

/**
 * Two connectors can snap if they face opposite directions (diff ≈ 180°).
 */
export function isSnapValid(c1, c2) {
  return Math.abs(angleDiff(c1.worldAngle, c2.worldAngle) - 180) < ANGLE_TOLERANCE
}

/**
 * Given world-space connectors of the piece being dragged, find the closest
 * valid snap among all free connectors of placed pieces.
 *
 * @param {Array}  draggedConnectors  - world connectors of dragged piece
 * @param {Array}  placedWorldPieces  - [{ instanceId, connectors: [{id, worldX, worldY, worldAngle}], connectedTo }]
 * @param {number} snapThreshold      - pixels
 * @param {number} angleTolerance     - degrees
 * @returns {{ draggedConnectorId, targetInstanceId, targetConnectorId, dx, dy } | null}
 */
export function findBestSnap(draggedConnectors, placedWorldPieces, snapThreshold, angleTolerance) {
  let best = null
  let bestDist = Infinity

  for (const dc of draggedConnectors) {
    for (const placed of placedWorldPieces) {
      for (const tc of placed.connectors) {
        // Skip already-connected target connectors
        if (placed.connectedTo[tc.id] !== null && placed.connectedTo[tc.id] !== undefined) continue

        const dist = Math.hypot(dc.worldX - tc.worldX, dc.worldY - tc.worldY)
        if (dist > snapThreshold) continue
        if (!isSnapValid(dc, tc)) continue
        if (dist < bestDist) {
          bestDist = dist
          best = {
            draggedConnectorId: dc.id,
            targetInstanceId: placed.instanceId,
            targetConnectorId: tc.id,
            // offset to apply to dragged piece position to achieve perfect alignment
            dx: tc.worldX - dc.worldX,
            dy: tc.worldY - dc.worldY,
          }
        }
      }
    }
  }
  return best
}
```

- [ ] **Step 8: Run tests — verify they pass**

```bash
npx vitest run src/__tests__/snap.test.js src/__tests__/connectors.test.js
```

Expected: PASS (all tests)

- [ ] **Step 9: Commit**

```bash
git add src/geometry/ src/__tests__/connectors.test.js src/__tests__/snap.test.js
git commit -m "feat: geometry utilities — world-space connectors and snap detection"
```

---

## Task 4: Layout Reducer

**Files:**
- Create: `src/hooks/useLayoutReducer.js`
- Create: `src/__tests__/useLayoutReducer.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/useLayoutReducer.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { layoutReducer, initialState } from '../hooks/useLayoutReducer'

function place(state, pieceId, x = 0, y = 0, rotation = 0) {
  return layoutReducer(state, {
    type: 'PLACE_PIECE',
    payload: { instanceId: 'inst-1', pieceId, x, y, rotation, mirrorX: false }
  })
}

describe('PLACE_PIECE', () => {
  it('adds a piece to the layout', () => {
    const s = place(initialState, '44815', 100, 200)
    expect(s.pieces).toHaveLength(1)
    expect(s.pieces[0].pieceId).toBe('44815')
    expect(s.pieces[0].x).toBe(100)
    expect(s.pieces[0].connectedTo).toEqual({ A: null, B: null })
  })
})

describe('DELETE_PIECE', () => {
  it('removes a piece and clears connections to it', () => {
    let s = place(initialState, '44815', 100, 200)
    s = layoutReducer(s, {
      type: 'CONNECT',
      payload: { instanceId: 'inst-1', connectorId: 'B', targetInstanceId: 'inst-2', targetConnectorId: 'A' }
    })
    // Add a second piece manually so we can test connection clearing
    s = layoutReducer(s, {
      type: 'PLACE_PIECE',
      payload: { instanceId: 'inst-2', pieceId: '44815', x: 200, y: 200, rotation: 0, mirrorX: false }
    })
    s = layoutReducer(s, { type: 'DELETE_PIECE', payload: { instanceId: 'inst-1' } })
    expect(s.pieces).toHaveLength(1)
    expect(s.pieces[0].connectedTo.A).toBeNull()
  })
})

describe('MOVE_PIECE', () => {
  it('updates position and clears all connections (moved piece is now floating)', () => {
    let s = place(initialState, '44815', 100, 200)
    s = layoutReducer(s, { type: 'MOVE_PIECE', payload: { instanceId: 'inst-1', x: 300, y: 400 } })
    expect(s.pieces[0].x).toBe(300)
    expect(s.pieces[0].connectedTo).toEqual({ A: null, B: null })
  })
})

describe('UNDO / REDO', () => {
  it('undoes a place action', () => {
    let s = place(initialState, '44815')
    expect(s.pieces).toHaveLength(1)
    s = layoutReducer(s, { type: 'UNDO' })
    expect(s.pieces).toHaveLength(0)
  })

  it('redoes an undone action', () => {
    let s = place(initialState, '44815')
    s = layoutReducer(s, { type: 'UNDO' })
    s = layoutReducer(s, { type: 'REDO' })
    expect(s.pieces).toHaveLength(1)
  })
})

describe('SET_BOUNDARY', () => {
  it('sets and clears the boundary', () => {
    let s = layoutReducer(initialState, { type: 'SET_BOUNDARY', payload: { width: 96, height: 48 } })
    expect(s.boundary).toEqual({ width: 96, height: 48 })
    s = layoutReducer(s, { type: 'SET_BOUNDARY', payload: null })
    expect(s.boundary).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/__tests__/useLayoutReducer.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement `src/hooks/useLayoutReducer.js`**

```js
import { useReducer } from 'react'

export const initialState = {
  pieces: [],          // PlacedPiece[]
  boundary: null,      // { width, height } in inches | null
  past: [],            // snapshots for undo
  future: [],          // snapshots for redo
}

/**
 * PlacedPiece shape:
 * { instanceId: string, pieceId: string, x: number, y: number,
 *   rotation: number, mirrorX: boolean, connectedTo: { [connectorId]: "instanceId:connectorId" | null } }
 */

function buildConnectedTo(connectors) {
  return Object.fromEntries(connectors.map((c) => [c.id, null]))
}

function snapshot(state) {
  return { pieces: state.pieces, boundary: state.boundary }
}

export function layoutReducer(state, action) {
  // Actions that modify layout push to past, clear future
  const modifying = ['PLACE_PIECE', 'DELETE_PIECE', 'MOVE_PIECE', 'CONNECT', 'DISCONNECT',
                     'SET_BOUNDARY', 'LOAD_LAYOUT', 'CLEAR_LAYOUT']

  if (action.type === 'UNDO') {
    if (state.past.length === 0) return state
    const prev = state.past[state.past.length - 1]
    return {
      ...state,
      ...prev,
      past: state.past.slice(0, -1),
      future: [snapshot(state), ...state.future],
    }
  }

  if (action.type === 'REDO') {
    if (state.future.length === 0) return state
    const next = state.future[0]
    return {
      ...state,
      ...next,
      past: [...state.past, snapshot(state)],
      future: state.future.slice(1),
    }
  }

  const newState = coreReducer(state, action)
  if (modifying.includes(action.type)) {
    return { ...newState, past: [...state.past, snapshot(state)], future: [] }
  }
  return newState
}

function coreReducer(state, action) {
  switch (action.type) {
    case 'PLACE_PIECE': {
      const { instanceId, pieceId, x, y, rotation, mirrorX, connectors } = action.payload
      const piece = {
        instanceId, pieceId, x, y, rotation: rotation ?? 0, mirrorX: mirrorX ?? false,
        connectedTo: buildConnectedTo(connectors || []),
      }
      return { ...state, pieces: [...state.pieces, piece] }
    }

    case 'MOVE_PIECE': {
      const { instanceId, x, y } = action.payload
      // Moving disconnects all connections (piece is now floating)
      const pieces = state.pieces.map((p) => {
        if (p.instanceId !== instanceId) {
          // Clear any connections pointing to the moved piece
          const connectedTo = Object.fromEntries(
            Object.entries(p.connectedTo).map(([k, v]) =>
              v && v.startsWith(instanceId + ':') ? [k, null] : [k, v]
            )
          )
          return { ...p, connectedTo }
        }
        const connectedTo = Object.fromEntries(Object.keys(p.connectedTo).map((k) => [k, null]))
        return { ...p, x, y, connectedTo }
      })
      return { ...state, pieces }
    }

    case 'DELETE_PIECE': {
      const { instanceId } = action.payload
      const pieces = state.pieces
        .filter((p) => p.instanceId !== instanceId)
        .map((p) => {
          const connectedTo = Object.fromEntries(
            Object.entries(p.connectedTo).map(([k, v]) =>
              v && v.startsWith(instanceId + ':') ? [k, null] : [k, v]
            )
          )
          return { ...p, connectedTo }
        })
      return { ...state, pieces }
    }

    case 'CONNECT': {
      const { instanceId, connectorId, targetInstanceId, targetConnectorId } = action.payload
      const pieces = state.pieces.map((p) => {
        if (p.instanceId === instanceId)
          return { ...p, connectedTo: { ...p.connectedTo, [connectorId]: `${targetInstanceId}:${targetConnectorId}` } }
        if (p.instanceId === targetInstanceId)
          return { ...p, connectedTo: { ...p.connectedTo, [targetConnectorId]: `${instanceId}:${connectorId}` } }
        return p
      })
      return { ...state, pieces }
    }

    case 'DISCONNECT': {
      const { instanceId, connectorId } = action.payload
      const target = state.pieces.find((p) => p.instanceId === instanceId)
        ?.connectedTo[connectorId]
      const pieces = state.pieces.map((p) => {
        if (p.instanceId === instanceId)
          return { ...p, connectedTo: { ...p.connectedTo, [connectorId]: null } }
        if (target) {
          const [tid, tcid] = target.split(':')
          if (p.instanceId === tid)
            return { ...p, connectedTo: { ...p.connectedTo, [tcid]: null } }
        }
        return p
      })
      return { ...state, pieces }
    }

    case 'SET_BOUNDARY':
      return { ...state, boundary: action.payload }

    case 'LOAD_LAYOUT':
      return { ...initialState, ...action.payload }

    case 'CLEAR_LAYOUT':
      return { ...initialState }

    default:
      return state
  }
}

export function useLayoutReducer() {
  return useReducer(layoutReducer, initialState)
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/__tests__/useLayoutReducer.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useLayoutReducer.js src/__tests__/useLayoutReducer.test.js
git commit -m "feat: layout reducer with undo/redo, connect/disconnect, boundary"
```

---

## Task 5: Validation Logic

**Files:**
- Create: `src/hooks/useValidation.js`
- Create: `src/__tests__/useValidation.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/useValidation.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { validateLayout } from '../hooks/useValidation'
import catalogue from '../data/catalogue.json'

const piece10in = catalogue.N.find((p) => p.id === '44815') // 10" straight

function makePiece(overrides) {
  return {
    instanceId: 'p1', pieceId: '44815', x: 0, y: 0, rotation: 0, mirrorX: false,
    connectedTo: { A: null, B: null },
    ...overrides,
  }
}

describe('validateLayout', () => {
  it('returns no issues for empty layout', () => {
    const result = validateLayout([], catalogue.N, 10)
    expect(result.openEndpoints).toHaveLength(0)
    expect(result.floatingPieces).toHaveLength(0)
    expect(result.overlappingPieces).toHaveLength(0)
  })

  it('detects open endpoints on an unconnected piece', () => {
    const pieces = [makePiece({ connectedTo: { A: null, B: null } })]
    const result = validateLayout(pieces, catalogue.N, 10)
    expect(result.openEndpoints).toHaveLength(2) // both connectors open
  })

  it('detects floating piece (on canvas but connected to nothing)', () => {
    const pieces = [makePiece({ connectedTo: { A: null, B: null } })]
    const result = validateLayout(pieces, catalogue.N, 10)
    expect(result.floatingPieces).toContain('p1')
  })

  it('does not flag floating piece when it has at least one connection', () => {
    const pieces = [makePiece({ connectedTo: { A: 'p2:B', B: null } })]
    const result = validateLayout(pieces, catalogue.N, 10)
    expect(result.floatingPieces).not.toContain('p1')
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
npx vitest run src/__tests__/useValidation.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement `src/hooks/useValidation.js`**

```js
import { useMemo } from 'react'
import { getWorldConnectors } from '../geometry/connectors'

/**
 * Pure validation function — usable in tests and the hook.
 * @param {Array}  pieces      - placed piece instances
 * @param {Array}  catalogueN  - N-scale catalogue pieces (for connector definitions)
 * @param {number} ppi         - pixels per inch
 * @returns {{ openEndpoints, floatingPieces, overlappingPieces }}
 */
export function validateLayout(pieces, catalogueItems, ppi) {
  const catMap = Object.fromEntries(catalogueItems.map((c) => [c.id, c]))

  const openEndpoints = []
  const floatingPieces = []
  const overlappingPieces = []

  for (const piece of pieces) {
    const catPiece = catMap[piece.pieceId]
    if (!catPiece) continue

    // Attach connectors from catalogue for world-space calculation
    const pieceWithConnectors = { ...piece, connectors: catPiece.connectors }
    const worldConns = getWorldConnectors(pieceWithConnectors, ppi)

    let hasAnyConnection = false

    for (const wc of worldConns) {
      const isConnected = piece.connectedTo[wc.id] !== null && piece.connectedTo[wc.id] !== undefined
      if (isConnected) {
        hasAnyConnection = true
      } else {
        openEndpoints.push({ instanceId: piece.instanceId, connectorId: wc.id, worldX: wc.worldX, worldY: wc.worldY })
      }
    }

    if (!hasAnyConnection) {
      floatingPieces.push(piece.instanceId)
    }
  }

  // Overlap detection: simple bounding-box check
  // Get bounding boxes for all pieces (approximated as rectangles)
  const boxes = pieces.map((piece) => {
    const catPiece = catMap[piece.pieceId]
    if (!catPiece) return null
    const pieceWithConnectors = { ...piece, connectors: catPiece.connectors }
    const worldConns = getWorldConnectors(pieceWithConnectors, ppi)
    const xs = worldConns.map((c) => c.worldX)
    const ys = worldConns.map((c) => c.worldY)
    const pad = 3 // px padding
    return {
      instanceId: piece.instanceId,
      minX: Math.min(...xs) - pad,
      maxX: Math.max(...xs) + pad,
      minY: Math.min(...ys) - pad,
      maxY: Math.max(...ys) + pad,
    }
  }).filter(Boolean)

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]
      const overlap =
        a.minX < b.maxX && a.maxX > b.minX &&
        a.minY < b.maxY && a.maxY > b.minY
      if (overlap) {
        if (!overlappingPieces.includes(a.instanceId)) overlappingPieces.push(a.instanceId)
        if (!overlappingPieces.includes(b.instanceId)) overlappingPieces.push(b.instanceId)
      }
    }
  }

  return { openEndpoints, floatingPieces, overlappingPieces }
}

export function useValidation(pieces, catalogueItems, ppi) {
  return useMemo(
    () => validateLayout(pieces, catalogueItems, ppi),
    [pieces, catalogueItems, ppi]
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/__tests__/useValidation.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useValidation.js src/__tests__/useValidation.test.js
git commit -m "feat: validation logic — open endpoints, floating pieces, overlap detection"
```

---

## Task 6: Canvas Foundation

**Files:**
- Create: `src/components/canvas/LayoutCanvas.jsx`
- Create: `src/components/canvas/GridLayer.jsx`

- [ ] **Step 1: Create `src/components/canvas/GridLayer.jsx`**

```jsx
import { Layer, Line } from 'react-konva'

// gridSpacing in pixels (e.g., 100px = 10" at 10px/in)
export default function GridLayer({ width, height, gridSpacing = 100, visible }) {
  if (!visible) return null

  const lines = []
  for (let x = 0; x <= width; x += gridSpacing) {
    lines.push(<Line key={`v${x}`} points={[x, 0, x, height]} stroke="#e0e0e0" strokeWidth={0.5} />)
  }
  for (let y = 0; y <= height; y += gridSpacing) {
    lines.push(<Line key={`h${y}`} points={[0, y, width, y]} stroke="#e0e0e0" strokeWidth={0.5} />)
  }
  return <Layer>{lines}</Layer>
}
```

- [ ] **Step 2: Create `src/components/canvas/LayoutCanvas.jsx`**

```jsx
import { useRef, useEffect, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import GridLayer from './GridLayer'

const CANVAS_SIZE = 3000 // virtual canvas px (300" at 10px/in)

export default function LayoutCanvas({ children, showGrid, onCanvasClick, pendingPieceId }) {
  const containerRef = useRef(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [stageScale, setStageScale] = useState(1)

  // Fit container
  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Zoom with mouse wheel
  function handleWheel(e) {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()

    const scaleBy = 1.1
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
    const clamped = Math.max(0.1, Math.min(8, newScale))

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    setStageScale(clamped)
    setStagePos({
      x: pointer.x - mousePointTo.x * clamped,
      y: pointer.y - mousePointTo.y * clamped,
    })
  }

  function handleStageClick(e) {
    if (e.target === e.target.getStage() && onCanvasClick) {
      const stage = e.target.getStage()
      const pos = stage.getRelativePointerPosition()
      onCanvasClick(pos)
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: 'hidden', background: '#f5f5f5',
               cursor: pendingPieceId ? 'crosshair' : 'default' }}
    >
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        draggable={!pendingPieceId}
        onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
        onWheel={handleWheel}
        onClick={handleStageClick}
      >
        <GridLayer width={CANVAS_SIZE} height={CANVAS_SIZE} gridSpacing={100} visible={showGrid} />
        <Layer>{children}</Layer>
      </Stage>
    </div>
  )
}
```

- [ ] **Step 3: Verify dev server still runs without errors**

```bash
npm run dev
```

Expected: no errors in browser console

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/
git commit -m "feat: canvas foundation — Konva Stage with zoom/pan and grid layer"
```

---

## Task 7: Track Piece Rendering

**Files:**
- Create: `src/components/canvas/TrackPiece.jsx`

Each piece is rendered as a Konva `Path` (SVG arc for curves) + connector dots.
Pieces render in their **local coordinate space** — the Konva `Group` handles world position/rotation.

- [ ] **Step 1: Create `src/components/canvas/TrackPiece.jsx`**

```jsx
import { Group, Path, Circle, Rect } from 'react-konva'
import { PIXELS_PER_INCH } from '../../constants'

const PPT = PIXELS_PER_INCH  // pixels per track-inch at 100% zoom

const ROADBED_COLOR = '#888'
const RAIL_COLOR = '#ccc'
const OPEN_ENDPOINT_COLOR = '#ef4444'
const CONNECTED_ENDPOINT_COLOR = '#22c55e'

/**
 * Build SVG path string for a piece geometry.
 * All coordinates are in pixels (inches * PPT).
 */
function buildPath(geometry) {
  if (geometry.type === 'straight') {
    const L = geometry.length * PPT
    return `M 0 0 L ${L} 0`
  }

  if (geometry.type === 'curve') {
    const R = geometry.radius * PPT
    const D = geometry.arc * (Math.PI / 180)
    const Bx = R * Math.sin(D)
    const By = R * (1 - Math.cos(D))
    // SVG arc: rx ry x-rotation large-arc-flag sweep-flag x y
    // sweep=1 = clockwise
    return `M 0 0 A ${R} ${R} 0 0 1 ${Bx.toFixed(2)} ${By.toFixed(2)}`
  }

  if (geometry.type === 'bumper') {
    const L = geometry.length * PPT
    return `M 0 0 L ${L} 0 M ${L} -4 L ${L} 4`
  }

  if (geometry.type === 'turnout') {
    // Draw straight path + diverging path
    return null  // rendered via custom shapes below
  }

  if (geometry.type === 'crossing') {
    return null  // rendered via custom shapes below
  }

  return `M 0 0 L 20 0`  // fallback
}

function TurnoutShape({ geometry, connectors }) {
  const [, straightConn, divergeConn] = connectors  // A, B, C
  const Bx = (straightConn?.x ?? 0) * PPT
  const Cx = (divergeConn?.x ?? 0) * PPT
  const Cy = (divergeConn?.y ?? 0) * PPT
  return (
    <>
      <Path data={`M 0 0 L ${Bx} 0`} stroke={ROADBED_COLOR} strokeWidth={6} lineCap="round" />
      <Path data={`M 0 0 L ${Cx} ${Cy}`} stroke={ROADBED_COLOR} strokeWidth={6} lineCap="round" />
    </>
  )
}

function CrossingShape({ geometry }) {
  const H = geometry.halfLength * PPT
  const θ = geometry.angle
  const rad = θ * (Math.PI / 180)
  const cx = H * Math.cos(rad)
  const cy = H * Math.sin(rad)
  return (
    <>
      <Path data={`M ${-H} 0 L ${H} 0`} stroke={ROADBED_COLOR} strokeWidth={6} lineCap="round" />
      <Path data={`M ${-cx} ${-cy} L ${cx} ${cy}`} stroke={ROADBED_COLOR} strokeWidth={6} lineCap="round" />
    </>
  )
}

export default function TrackPiece({
  piece,            // PlacedPiece instance
  catPiece,         // catalogue entry
  ppi = PPT,        // pixels per inch (zoom-adjusted externally if needed)
  isSelected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}) {
  const { x, y, rotation, mirrorX, connectedTo } = piece
  const { geometry, connectors } = catPiece

  const pathData = buildPath(geometry)
  const isTurnout = geometry.type === 'turnout' || geometry.type === 'crossover'
  const isCrossing = geometry.type === 'crossing'

  return (
    <Group
      x={x}
      y={y}
      rotation={rotation}
      scaleX={mirrorX ? -1 : 1}
      draggable
      onClick={(e) => { e.cancelBubble = true; onSelect?.() }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    >
      {/* Track body */}
      {isTurnout && <TurnoutShape geometry={geometry} connectors={connectors} />}
      {isCrossing && <CrossingShape geometry={geometry} />}
      {!isTurnout && !isCrossing && pathData && (
        <Path
          data={pathData}
          stroke={isSelected ? '#3b82f6' : ROADBED_COLOR}
          strokeWidth={6}
          lineCap="round"
          fill="transparent"
        />
      )}

      {/* Connector endpoint indicators */}
      {connectors.map((c) => {
        const cx = c.x * ppi
        const cy = c.y * ppi
        const isConnected = connectedTo[c.id] !== null && connectedTo[c.id] !== undefined
        return (
          <Circle
            key={c.id}
            x={cx}
            y={cy}
            radius={3}
            fill={isConnected ? CONNECTED_ENDPOINT_COLOR : OPEN_ENDPOINT_COLOR}
          />
        )
      })}
    </Group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/canvas/TrackPiece.jsx
git commit -m "feat: TrackPiece renderer — straight, curve, turnout, crossing, bumper shapes"
```

---

## Task 8: Sidebar — Palette & Parts List

**Files:**
- Create: `src/components/Sidebar.jsx`

- [ ] **Step 1: Create `src/components/Sidebar.jsx`**

```jsx
import { useState } from 'react'
import catalogue from '../data/catalogue.json'

const CATEGORIES = [
  { key: 'straight', label: 'Straights' },
  { key: 'curve',    label: 'Curves' },
  { key: 'turnout',  label: 'Turnouts' },
  { key: 'crossing', label: 'Crossings' },
  { key: 'bumper',   label: 'Bumpers' },
  { key: 'special',  label: 'Specials' },
]

export default function Sidebar({ scale = 'N', pieces, onSelectPiece, selectedPieceId }) {
  const [search, setSearch] = useState('')
  const [openCats, setOpenCats] = useState(new Set(['straight', 'curve']))

  const catalogueItems = catalogue[scale] ?? []

  const filtered = catalogueItems.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.itemNo.includes(search)
  )

  // Parts list: aggregate placed pieces
  const catMap = Object.fromEntries(catalogueItems.map((c) => [c.id, c]))
  const partsMap = {}
  for (const p of pieces) {
    partsMap[p.pieceId] = (partsMap[p.pieceId] ?? 0) + 1
  }
  const partsList = Object.entries(partsMap).map(([id, qty]) => {
    const cat = catMap[id]
    return { id, qty, name: cat?.name ?? id, price: cat?.price ?? 0, itemNo: cat?.itemNo ?? '' }
  })
  const totalCost = partsList.reduce((sum, p) => sum + p.price * p.qty, 0)

  function toggleCat(key) {
    setOpenCats((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div style={{ width: 220, display: 'flex', flexDirection: 'column', borderRight: '1px solid #ddd',
                  background: '#fff', overflow: 'hidden' }}>
      {/* Search */}
      <div style={{ padding: '8px' }}>
        <input
          type="text"
          placeholder="Search pieces..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
        />
      </div>

      {/* Palette */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {CATEGORIES.map(({ key, label }) => {
          const items = filtered.filter((p) => p.category === key)
          if (items.length === 0) return null
          const isOpen = openCats.has(key)
          return (
            <div key={key}>
              <button
                onClick={() => toggleCat(key)}
                style={{ width: '100%', textAlign: 'left', padding: '6px 8px', border: 'none',
                         background: '#f3f4f6', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
              >
                {isOpen ? '▾' : '▸'} {label} ({items.length})
              </button>
              {isOpen && items.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectPiece(p.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '5px 16px',
                    border: 'none', borderBottom: '1px solid #f0f0f0',
                    background: selectedPieceId === p.id ? '#dbeafe' : '#fff',
                    cursor: 'pointer', fontSize: 11,
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  <div style={{ color: '#888' }}>#{p.itemNo} · ${p.price.toFixed(2)}</div>
                </button>
              ))}
            </div>
          )
        })}
      </div>

      {/* Parts list */}
      <div style={{ borderTop: '1px solid #ddd', padding: 8, fontSize: 11 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Parts List</div>
        {partsList.length === 0 && <div style={{ color: '#aaa' }}>No pieces placed yet</div>}
        {partsList.map((p) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{p.name}</span>
            <span style={{ color: '#555', whiteSpace: 'nowrap' }}>×{p.qty} ${(p.price * p.qty).toFixed(0)}</span>
          </div>
        ))}
        {partsList.length > 0 && (
          <div style={{ marginTop: 4, fontWeight: 700, borderTop: '1px solid #eee', paddingTop: 4 }}>
            Total: ${totalCost.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.jsx
git commit -m "feat: sidebar with piece palette, search, category groups, and live parts list"
```

---

## Task 9: Toolbar

**Files:**
- Create: `src/components/Toolbar.jsx`

- [ ] **Step 1: Create `src/components/Toolbar.jsx`**

```jsx
export default function Toolbar({
  canUndo, canRedo, onUndo, onRedo,
  onValidate, onExportPNG, onExportPartsList,
  onSave, onLoad,
  showGrid, onToggleGrid,
  freeRotate, onToggleFreeRotate,
  scale, onScaleChange,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                  borderBottom: '1px solid #ddd', background: '#fff', flexShrink: 0 }}>
      <span style={{ fontWeight: 700, fontSize: 14, marginRight: 8 }}>🚂 Bella-Ralph Track Design</span>

      <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">↩ Undo</button>
      <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">↪ Redo</button>

      <span style={{ width: 1, height: 20, background: '#ddd', margin: '0 4px' }} />

      <button onClick={onValidate}>✓ Validate</button>

      <span style={{ width: 1, height: 20, background: '#ddd', margin: '0 4px' }} />

      <button onClick={onSave}>💾 Save</button>
      <button onClick={onLoad}>📂 Load</button>

      <span style={{ width: 1, height: 20, background: '#ddd', margin: '0 4px' }} />

      <details style={{ position: 'relative' }}>
        <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '4px 8px',
                          border: '1px solid #ccc', borderRadius: 4 }}>
          Export ▾
        </summary>
        <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff',
                      border: '1px solid #ccc', borderRadius: 4, zIndex: 100, minWidth: 160 }}>
          <button onClick={onExportPNG}    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', cursor: 'pointer' }}>Export as PNG</button>
          <button onClick={onExportPartsList} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', cursor: 'pointer' }}>Export Parts List (HTML)</button>
        </div>
      </details>

      <span style={{ width: 1, height: 20, background: '#ddd', margin: '0 4px' }} />

      <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        <input type="checkbox" checked={showGrid} onChange={onToggleGrid} /> Grid
      </label>
      <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        <input type="checkbox" checked={freeRotate} onChange={onToggleFreeRotate} /> Free Rotate
      </label>

      <span style={{ width: 1, height: 20, background: '#ddd', margin: '0 4px' }} />

      <label style={{ fontSize: 12 }}>
        Scale:{' '}
        <select value={scale} onChange={(e) => onScaleChange(e.target.value)}>
          <option value="N">N Scale</option>
          <option value="HO" disabled>HO (coming soon)</option>
          <option value="O"  disabled>O (coming soon)</option>
          <option value="G"  disabled>G (coming soon)</option>
        </select>
      </label>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Toolbar.jsx
git commit -m "feat: toolbar — undo/redo, validate, export menu, grid toggle, free-rotate, scale selector"
```

---

## Task 10: Status Bar, Validation Panel & Boundary Layer

**Files:**
- Create: `src/components/StatusBar.jsx`
- Create: `src/components/ValidationPanel.jsx`
- Create: `src/components/canvas/BoundaryLayer.jsx`

- [ ] **Step 1: Create `src/components/StatusBar.jsx`**

```jsx
export default function StatusBar({ openEndpoints, overlappingPieces, floatingPieces, onSetBoundary }) {
  const issues = openEndpoints.length + overlappingPieces.length + floatingPieces.length
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 12px',
                  borderTop: '1px solid #ddd', background: '#fafafa', fontSize: 12, flexShrink: 0 }}>
      <span style={{ color: openEndpoints.length ? '#ef4444' : '#22c55e' }}>
        {openEndpoints.length} open endpoint{openEndpoints.length !== 1 ? 's' : ''}
      </span>
      <span style={{ color: overlappingPieces.length ? '#ef4444' : '#22c55e' }}>
        {overlappingPieces.length} overlap{overlappingPieces.length !== 1 ? 's' : ''}
      </span>
      <span style={{ color: floatingPieces.length ? '#f59e0b' : '#22c55e' }}>
        {floatingPieces.length} floating piece{floatingPieces.length !== 1 ? 's' : ''}
      </span>
      <span style={{ marginLeft: 'auto' }}>
        <button onClick={onSetBoundary} style={{ fontSize: 11 }}>Set Boundary…</button>
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/ValidationPanel.jsx`**

```jsx
export default function ValidationPanel({ openEndpoints, overlappingPieces, floatingPieces, visible }) {
  if (!visible) return null
  const hasIssues = openEndpoints.length + overlappingPieces.length + floatingPieces.length > 0
  return (
    <div style={{ position: 'absolute', top: 48, right: 8, width: 280, background: '#fff',
                  border: '1px solid #ddd', borderRadius: 6, padding: 12, zIndex: 50, fontSize: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Validation Results</div>
      {!hasIssues && <div style={{ color: '#22c55e' }}>✓ No issues found</div>}
      {openEndpoints.map((ep, i) => (
        <div key={i} style={{ color: '#ef4444', marginBottom: 2 }}>
          ● Open endpoint: piece {ep.instanceId} connector {ep.connectorId}
        </div>
      ))}
      {overlappingPieces.map((id) => (
        <div key={id} style={{ color: '#ef4444', marginBottom: 2 }}>● Overlap: piece {id}</div>
      ))}
      {floatingPieces.map((id) => (
        <div key={id} style={{ color: '#f59e0b', marginBottom: 2 }}>● Floating: piece {id}</div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/canvas/BoundaryLayer.jsx`**

```jsx
import { Layer, Rect, Text } from 'react-konva'
import { PIXELS_PER_INCH } from '../../constants'

export default function BoundaryLayer({ boundary }) {
  if (!boundary) return null
  const w = boundary.width * PIXELS_PER_INCH
  const h = boundary.height * PIXELS_PER_INCH
  return (
    <Layer>
      <Rect
        x={0} y={0} width={w} height={h}
        stroke="#3b82f6" strokeWidth={2} dash={[10, 5]}
        fill="rgba(59,130,246,0.03)"
      />
      <Text x={4} y={4} text={`${boundary.width}" × ${boundary.height}"`}
            fontSize={12} fill="#3b82f6" />
    </Layer>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/StatusBar.jsx src/components/ValidationPanel.jsx src/components/canvas/BoundaryLayer.jsx
git commit -m "feat: status bar, validation panel, boundary layer"
```

---

## Task 11: Export Utilities

**Files:**
- Create: `src/utils/export.js`
- Create: `src/utils/fileio.js`
- Create: `src/__tests__/export.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/export.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { buildPartsList } from '../utils/export'

const mockCatalogue = [
  { id: '44815', name: '10" Straight', itemNo: '44815', price: 5.33 },
  { id: '44801', name: '11.25" Curve',  itemNo: '44801', price: 3.33 },
]

const mockPieces = [
  { pieceId: '44815' },
  { pieceId: '44815' },
  { pieceId: '44801' },
]

describe('buildPartsList', () => {
  it('aggregates pieces by type with quantity and total cost', () => {
    const parts = buildPartsList(mockPieces, mockCatalogue)
    const straight = parts.find((p) => p.id === '44815')
    const curve    = parts.find((p) => p.id === '44801')
    expect(straight.qty).toBe(2)
    expect(straight.total).toBeCloseTo(10.66)
    expect(curve.qty).toBe(1)
    expect(curve.total).toBeCloseTo(3.33)
  })

  it('returns grand total', () => {
    const parts = buildPartsList(mockPieces, mockCatalogue)
    const grandTotal = parts.reduce((s, p) => s + p.total, 0)
    expect(grandTotal).toBeCloseTo(13.99)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/__tests__/export.test.js
```

- [ ] **Step 3: Implement `src/utils/export.js`**

```js
/**
 * Aggregate placed pieces into a parts list.
 * @returns Array of { id, name, itemNo, qty, unitPrice, total }
 */
export function buildPartsList(pieces, catalogueItems) {
  const catMap = Object.fromEntries(catalogueItems.map((c) => [c.id, c]))
  const counts = {}
  for (const p of pieces) {
    counts[p.pieceId] = (counts[p.pieceId] ?? 0) + 1
  }
  return Object.entries(counts).map(([id, qty]) => {
    const cat = catMap[id] ?? { name: id, itemNo: '?', price: 0 }
    return { id, name: cat.name, itemNo: cat.itemNo, qty, unitPrice: cat.price, total: cat.price * qty }
  })
}

/**
 * Export canvas to PNG. Pass a Konva Stage ref.
 */
export function exportToPNG(stageRef, boundary, ppi) {
  const stage = stageRef.current
  if (!stage) return

  if (boundary) {
    const dataUrl = stage.toDataURL({
      x: 0, y: 0,
      width: boundary.width * ppi,
      height: boundary.height * ppi,
      pixelRatio: 2,
    })
    downloadFile(dataUrl, 'bella-ralph-layout.png')
  } else {
    const dataUrl = stage.toDataURL({ pixelRatio: 1 })
    downloadFile(dataUrl, 'bella-ralph-layout.png')
  }
}

/**
 * Export parts list as a printable HTML file.
 */
export function exportPartsListHTML(pieces, catalogueItems) {
  const parts = buildPartsList(pieces, catalogueItems)
  const grandTotal = parts.reduce((s, p) => s + p.total, 0)

  const rows = parts
    .map((p) => `<tr><td>${p.itemNo}</td><td>${p.name}</td><td>${p.qty}</td>
      <td>$${p.unitPrice.toFixed(2)}</td><td>$${p.total.toFixed(2)}</td></tr>`)
    .join('')

  const html = `<!DOCTYPE html><html><head><title>Parts List</title>
<style>body{font-family:sans-serif;padding:2rem}table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}
.total{font-weight:700;margin-top:1rem}</style></head><body>
<h1>Bella-Ralph Track Design — Parts List</h1>
<table><thead><tr><th>Item #</th><th>Name</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="total">Grand Total: $${grandTotal.toFixed(2)}</p>
</body></html>`

  downloadFile('data:text/html;charset=utf-8,' + encodeURIComponent(html), 'bella-ralph-parts-list.html')
}

function downloadFile(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
```

- [ ] **Step 4: Implement `src/utils/fileio.js`**

```js
/**
 * Save layout state to a .brtrack JSON file.
 */
export function saveLayout(layoutState) {
  const data = {
    version: 1,
    scale: 'N',
    pieces: layoutState.pieces,
    boundary: layoutState.boundary,
    savedAt: new Date().toISOString(),
  }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'bella-ralph-layout.brtrack'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Load a .brtrack file. Returns a Promise resolving to the parsed layout.
 */
export function loadLayout() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.brtrack,.json'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return reject(new Error('No file selected'))
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result)
          resolve({ pieces: data.pieces ?? [], boundary: data.boundary ?? null })
        } catch (err) {
          reject(new Error('Invalid .brtrack file'))
        }
      }
      reader.readAsText(file)
    }
    input.click()
  })
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npx vitest run src/__tests__/export.test.js
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/ src/__tests__/export.test.js
git commit -m "feat: export utilities — parts list, PNG export, save/load .brtrack"
```

---

## Task 12: Onboarding Tooltip

**Files:**
- Create: `src/components/Onboarding.jsx`

- [ ] **Step 1: Create `src/components/Onboarding.jsx`**

```jsx
import { useState, useEffect } from 'react'

const STEPS = [
  { title: 'Pick a piece', body: 'Click any track piece in the left sidebar to select it.' },
  { title: 'Place it', body: 'Click anywhere on the canvas to place the piece. Drag from the palette too.' },
  { title: 'Connect pieces', body: 'Drag a piece close to another — endpoints snap together automatically when facing each other.' },
]

const STORAGE_KEY = 'brtrack_onboarding_done'

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
  }, [])

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      localStorage.setItem(STORAGE_KEY, '1')
      setVisible(false)
    }
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  const s = STEPS[step]
  return (
    <div style={{ position: 'fixed', bottom: 40, right: 40, width: 280, background: '#1e293b',
                  color: '#fff', borderRadius: 10, padding: 20, zIndex: 200,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
        Step {step + 1} of {STEPS.length}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{s.title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>{s.body}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={dismiss}
          style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 12 }}>
          Skip
        </button>
        <button onClick={next}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6,
                   padding: '6px 16px', cursor: 'pointer', fontWeight: 600 }}>
          {step < STEPS.length - 1 ? 'Next →' : 'Get Started'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Onboarding.jsx
git commit -m "feat: onboarding tooltip sequence — 3-step guide for new users"
```

---

## Task 13: App Assembly

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/App.css`
- Modify: `src/main.jsx`

This task wires all components together with the reducer state, keyboard shortcuts, and pending-piece placement flow.

- [ ] **Step 1: Replace `src/App.jsx`**

```jsx
import { useState, useRef, useCallback } from 'react'
import catalogue from './data/catalogue.json'
import { useLayoutReducer } from './hooks/useLayoutReducer'
import { useValidation } from './hooks/useValidation'
import { getWorldConnectors } from './geometry/connectors'
import { findBestSnap } from './geometry/snap'
import { PIXELS_PER_INCH, SNAP_THRESHOLD } from './constants'
import { saveLayout, loadLayout } from './utils/fileio'
import { exportToPNG, exportPartsListHTML } from './utils/export'
import Toolbar from './components/Toolbar'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import ValidationPanel from './components/ValidationPanel'
import Onboarding from './components/Onboarding'
import LayoutCanvas from './components/canvas/LayoutCanvas'
import BoundaryLayer from './components/canvas/BoundaryLayer'
import TrackPiece from './components/canvas/TrackPiece'
import './App.css'

const ppi = PIXELS_PER_INCH

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function App() {
  const [state, dispatch] = useLayoutReducer()
  const [selectedPieceId, setSelectedPieceId] = useState(null)   // catalogue id (palette selection)
  const [selectedInstanceId, setSelectedInstanceId] = useState(null)
  const [freeRotate, setFreeRotate] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [showValidation, setShowValidation] = useState(false)
  const [scale, setScale] = useState('N')
  const stageRef = useRef(null)

  const catalogueItems = catalogue[scale] ?? []
  const catMap = Object.fromEntries(catalogueItems.map((c) => [c.id, c]))

  const validation = useValidation(state.pieces, catalogueItems, ppi)

  // Place a piece when canvas is clicked (click-to-place mode)
  function handleCanvasClick(pos) {
    if (!selectedPieceId) return
    const catPiece = catMap[selectedPieceId]
    if (!catPiece) return
    const instanceId = uuid()
    dispatch({
      type: 'PLACE_PIECE',
      payload: { instanceId, pieceId: selectedPieceId, x: pos.x, y: pos.y,
                 rotation: 0, mirrorX: false, connectors: catPiece.connectors },
    })
    setSelectedPieceId(null)
  }

  // Drag end: snap if possible, then update position
  function handleDragEnd(instanceId, e) {
    const node = e.target
    const newX = node.x()
    const newY = node.y()
    const piece = state.pieces.find((p) => p.instanceId === instanceId)
    if (!piece) return
    const catPiece = catMap[piece.pieceId]
    if (!catPiece) return

    const draggedWithNewPos = { ...piece, x: newX, y: newY, connectors: catPiece.connectors }
    const draggedWorldConns = getWorldConnectors(draggedWithNewPos, ppi)

    const placedWorldPieces = state.pieces
      .filter((p) => p.instanceId !== instanceId)
      .map((p) => {
        const cp = catMap[p.pieceId]
        if (!cp) return null
        return { instanceId: p.instanceId, connectedTo: p.connectedTo,
                 connectors: getWorldConnectors({ ...p, connectors: cp.connectors }, ppi) }
      })
      .filter(Boolean)

    const snap = findBestSnap(draggedWorldConns, placedWorldPieces, SNAP_THRESHOLD, 10)

    if (snap) {
      dispatch({
        type: 'MOVE_PIECE',
        payload: { instanceId, x: newX + snap.dx, y: newY + snap.dy },
      })
      node.x(newX + snap.dx)
      node.y(newY + snap.dy)
      dispatch({
        type: 'CONNECT',
        payload: { instanceId, connectorId: snap.draggedConnectorId,
                   targetInstanceId: snap.targetInstanceId, targetConnectorId: snap.targetConnectorId },
      })
    } else {
      dispatch({ type: 'MOVE_PIECE', payload: { instanceId, x: newX, y: newY } })
    }
  }

  // Right-click to rotate selected placed piece
  function handleRightClick(instanceId, e) {
    e.evt.preventDefault()
    const piece = state.pieces.find((p) => p.instanceId === instanceId)
    if (!piece) return
    const catPiece = catMap[piece.pieceId]
    if (!catPiece) return

    let increment = 30
    if (!freeRotate) {
      const arc = catPiece.geometry.arc
      if (arc) increment = arc
      else if (catPiece.geometry.type === 'straight') increment = 45
      else increment = 30
    } else {
      increment = 5
    }

    dispatch({
      type: 'MOVE_PIECE',
      payload: { instanceId, x: piece.x, y: piece.y, rotation: (piece.rotation + increment) % 360 },
    })
    // Re-apply rotation without clearing connections when just rotating
    // Note: MOVE_PIECE clears connections, which is intentional on rotation
  }

  // Delete selected instance on Delete/Backspace
  useCallback(() => {
    function onKey(e) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedInstanceId) {
        dispatch({ type: 'DELETE_PIECE', payload: { instanceId: selectedInstanceId } })
        setSelectedInstanceId(null)
      }
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey)
        dispatch({ type: 'UNDO' })
      if ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey))
        dispatch({ type: 'REDO' })
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey)
        dispatch({ type: 'REDO' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedInstanceId])

  function handleSetBoundary() {
    const w = prompt('Layout width in inches (e.g. 96 for 8ft):')
    const h = prompt('Layout height in inches (e.g. 48 for 4ft):')
    if (w && h) dispatch({ type: 'SET_BOUNDARY', payload: { width: +w, height: +h } })
  }

  async function handleLoad() {
    try {
      const layout = await loadLayout()
      dispatch({ type: 'LOAD_LAYOUT', payload: layout })
    } catch {/* user cancelled */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Toolbar
        canUndo={state.past.length > 0}
        canRedo={state.future.length > 0}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onValidate={() => setShowValidation((v) => !v)}
        onExportPNG={() => exportToPNG(stageRef, state.boundary, ppi)}
        onExportPartsList={() => exportPartsListHTML(state.pieces, catalogueItems)}
        onSave={() => saveLayout(state)}
        onLoad={handleLoad}
        showGrid={showGrid} onToggleGrid={() => setShowGrid((v) => !v)}
        freeRotate={freeRotate} onToggleFreeRotate={() => setFreeRotate((v) => !v)}
        scale={scale} onScaleChange={setScale}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Sidebar
          scale={scale}
          pieces={state.pieces}
          onSelectPiece={setSelectedPieceId}
          selectedPieceId={selectedPieceId}
        />
        <LayoutCanvas
          showGrid={showGrid}
          onCanvasClick={handleCanvasClick}
          pendingPieceId={selectedPieceId}
          stageRef={stageRef}
        >
          <BoundaryLayer boundary={state.boundary} />
          {state.pieces.map((piece) => {
            const catPiece = catMap[piece.pieceId]
            if (!catPiece) return null
            return (
              <TrackPiece
                key={piece.instanceId}
                piece={piece}
                catPiece={catPiece}
                ppi={ppi}
                isSelected={piece.instanceId === selectedInstanceId}
                onSelect={() => setSelectedInstanceId(piece.instanceId)}
                onDragEnd={(e) => handleDragEnd(piece.instanceId, e)}
                onContextMenu={(e) => handleRightClick(piece.instanceId, e)}
              />
            )
          })}
        </LayoutCanvas>
        {showValidation && (
          <ValidationPanel
            openEndpoints={validation.openEndpoints}
            overlappingPieces={validation.overlappingPieces}
            floatingPieces={validation.floatingPieces}
            visible={showValidation}
          />
        )}
      </div>
      <StatusBar
        openEndpoints={validation.openEndpoints}
        overlappingPieces={validation.overlappingPieces}
        floatingPieces={validation.floatingPieces}
        onSetBoundary={handleSetBoundary}
      />
      <Onboarding />
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/App.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
button { cursor: pointer; padding: 4px 10px; border: 1px solid #ccc; border-radius: 4px;
         background: #fff; font-size: 13px; }
button:hover:not(:disabled) { background: #f0f0f0; }
button:disabled { opacity: 0.4; cursor: not-allowed; }
```

- [ ] **Step 3: Update `src/main.jsx`**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 4: Fix `LayoutCanvas.jsx` to forward the stage ref**

Open `src/components/canvas/LayoutCanvas.jsx`. Add `stageRef` prop and apply it to `<Stage>`:

Change the function signature:
```jsx
export default function LayoutCanvas({ children, showGrid, onCanvasClick, pendingPieceId, stageRef }) {
```

Change `<Stage` opening tag to add:
```jsx
ref={stageRef}
```

Also update `handleStageClick` to work with the children Layer — wrap the `children` layer to a named Layer that includes `BoundaryLayer` and pieces:

The `children` prop currently renders inside `<Layer>`. The `BoundaryLayer` is already a `<Layer>` itself. Remove the wrapping `<Layer>` around children and just render `{children}` directly inside Stage:

```jsx
      {/* Replace the existing <Layer>{children}</Layer> with: */}
      {children}
```

- [ ] **Step 5: Run the app and verify it works end-to-end**

```bash
npm run dev
```

Verify:
1. App loads with toolbar, sidebar, canvas
2. Click a piece in sidebar → cursor changes to crosshair
3. Click on canvas → piece appears
4. Drag piece near another → snaps into place (green dots)
5. Right-click piece → rotates
6. Undo/Redo works (Ctrl+Z / Ctrl+Y)
7. Validate button shows panel
8. Status bar shows open endpoint count

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/App.css src/main.jsx src/components/canvas/LayoutCanvas.jsx
git commit -m "feat: assemble full app — piece placement, snapping, rotation, undo/redo, export"
```

---

## Task 14: Deploy to Vercel

- [ ] **Step 1: Create a GitHub repository**

Go to github.com, create a new public repo named `bella-ralph-track-design`.

- [ ] **Step 2: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/bella-ralph-track-design.git
git branch -M main
git push -u origin main
```

- [ ] **Step 3: Connect to Vercel**

1. Go to vercel.com → Log in → "Add New Project"
2. Import the `bella-ralph-track-design` GitHub repo
3. Framework preset: **Vite** (Vercel detects it automatically)
4. Build command: `npm run build`
5. Output directory: `dist`
6. Click **Deploy**

- [ ] **Step 4: Verify deployment**

Open the Vercel URL (e.g. `bella-ralph-track-design.vercel.app`).
Verify the app loads and all features work.

- [ ] **Step 5: Add Vercel URL to README (create a minimal one)**

```bash
echo "# Bella-Ralph Track Design\n\nN Scale Bachmann EZ Track layout designer.\n\nLive: https://bella-ralph-track-design.vercel.app" > README.md
git add README.md
git commit -m "docs: add README with live URL"
git push
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] N Scale Bachmann EZ Track full catalogue — Task 2
- [x] Snap-together pieces — Tasks 3, 8, 13
- [x] Infinite canvas with optional boundary — Tasks 6, 10, 13
- [x] Drag-and-drop + click-to-place — Task 13
- [x] Fixed rotation (default) + free rotate override — Task 13
- [x] 2D top-down view — Task 7
- [x] Validation: open endpoints, overlaps, floating — Task 5, 10
- [x] Export PNG — Task 11
- [x] Export parts list — Task 11
- [x] Save/load .brtrack — Task 11
- [x] Live parts list in sidebar — Task 8
- [x] Beginner onboarding (3-step) — Task 12
- [x] Scale selector (N only, others disabled) — Task 9
- [x] Vercel free hosting — Task 14

**No placeholders:** All code blocks are complete and implementable.

**Type consistency:** `piece.connectedTo` uses `"instanceId:connectorId"` string format consistently across reducer, snap, and validation. `getWorldConnectors` requires `piece.connectors` to be populated from catalogue before calling — this is done explicitly everywhere it's used.

**Known limitation:** The `MOVE_PIECE` action clears all connections (including on rotate). A future improvement would separate `ROTATE_PIECE` from `MOVE_PIECE` to preserve connections on rotation.
