# Bella-Ralph Track Design — Spec
**Date:** 2026-03-30
**Scale:** N Scale (Bachmann EZ Track), with future HO/O/G support
**Hosting:** Vercel (free tier)
**Stack:** React + Konva.js

---

## Overview

Bella-Ralph Track Design is a browser-based 2D model train layout designer. Users drag and snap Bachmann N Scale EZ Track pieces onto an infinite canvas to plan their layouts. The app validates connections, generates a parts list with pricing, and exports layouts as PNG or saveable JSON files. Designed for beginners, works equally well for experienced modelers.

---

## Architecture

Three main layers:

### 1. Track Data Layer
Static JSON catalogue of all 51 Bachmann N Scale EZ Track pieces, keyed by scale:
```json
{ "N": [...], "HO": [], "O": [], "G": [] }
```
Each piece contains precise geometry for rendering and snapping math. Adding future scales requires only populating the relevant key — no code changes.

### 2. Canvas Layer (Konva.js)
An interactive `Stage` with four named layers:
- `GridLayer` — optional reference grid
- `BoundaryLayer` — optional user-defined table boundary rectangle
- `TrackLayer` — all placed track pieces as Konva shapes
- `SnapIndicatorLayer` — visual feedback when endpoints are near each other

### 3. UI Shell (React)
- Left sidebar: piece palette (grouped by category, searchable), live parts list with quantities and total cost
- Top toolbar: Undo, Redo, Validate, Export menu, Save/Load
- Bottom status bar: open endpoint count, overlap count

State managed via React `useReducer`. Layout state (placed pieces, positions, rotations, boundary) lives in one reducer, enabling straightforward undo/redo and save/load.

---

## Track Piece Data Model

```json
{
  "id": "44815",
  "name": "10\" Straight",
  "category": "straight",
  "price": 32.00,
  "geometry": {
    "type": "straight",
    "length": 10
  },
  "connectors": [
    { "id": "A", "x": 0, "y": 0, "angle": 180 },
    { "id": "B", "x": 10, "y": 0, "angle": 0 }
  ]
}
```

**Connector rules by piece type:**
- Straight: 2 connectors (A at start, B at end)
- Curved: 2 connectors, positions computed from radius + arc degrees
- Turnout: 3 connectors (1 input, 2 outputs — straight and diverging)
- Crossing: 4 connectors (2 pairs at crossing angle)
- Bumper: 1 connector (open end)

**Placed piece instance state:**
```json
{
  "instanceId": "uuid",
  "pieceId": "44815",
  "x": 120,
  "y": 340,
  "rotation": 0,
  "connectedTo": {
    "A": null,
    "B": "other-uuid:A"
  }
}
```

---

## Snapping Logic

When a piece is dragged:
1. Transform all connector positions of the dragged piece to world coordinates
2. Check all free (unconnected) connectors of placed pieces within a snap threshold (~8px)
3. A valid snap requires: proximity AND angle difference = 180° (connectors face each other)
4. On valid snap: piece position is adjusted so endpoints align exactly; the pair is marked `connectedTo` in state
5. Visual: snapping endpoint shown in green; open endpoints in red

**Rotation modes:**
- Default: fixed increments (7.5°, 15°, 30° depending on piece type)
- Override: free rotate mode toggled from toolbar

---

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Toolbar: [Undo] [Redo] [Validate] [Export ▼] [Save]│
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│   Sidebar    │         Canvas (Konva Stage)         │
│              │                                      │
│  [Search...] │   Infinite, zoomable, pannable       │
│              │   Track pieces drag/snap here        │
│  Straights   │                                      │
│  Curves      │   [Set Boundary] overlay button      │
│  Turnouts    │                                      │
│  Crossings   │                                      │
│  Bumpers     │                                      │
│  Specials    │                                      │
│              │                                      │
│ ──────────── │                                      │
│  Parts List  │                                      │
│  10" x3 $96  │                                      │
│  11.25R x6.. │                                      │
└──────────────┴──────────────────────────────────────┘
│  Status: 3 open endpoints · 0 overlaps              │
└─────────────────────────────────────────────────────┘
```

**Beginner onboarding:** First launch shows a 3-step tooltip sequence:
1. Pick a piece from the sidebar
2. Drag it onto the canvas
3. Connect pieces by dragging endpoints near each other

---

## Validation

Triggered manually via toolbar button, and automatically before any export.

| Check | Description | Visual Indicator |
|---|---|---|
| Open endpoints | Connector not linked to another piece | Red dot on connector |
| Overlapping pieces | Bounding box + shape intersection | Red highlight on pieces |
| Floating pieces | On canvas but connected to nothing | Orange outline |

Results shown inline on canvas + collapsible validation panel listing each issue by description.

---

## Export & Save

| Action | Format | Details |
|---|---|---|
| Save layout | `.brtrack` (JSON) | Full layout state: pieces, positions, rotations, boundary |
| Load layout | `.brtrack` (JSON) | Restores full state |
| Export PNG | PNG image | Konva `stage.toDataURL()`, crops to boundary if set |
| Export parts list | Printable HTML / CSV | Item no., name, qty, unit price, total cost |

---

## Future Scale Support

The catalogue JSON is structured by scale: `{ "N": [...], "HO": [], "O": [], "G": [] }`.

The canvas uses a `scaleFactor` (pixels per real-world inch) that adjusts per scale. A scale selector in the toolbar switches the active catalogue. No geometry or snapping code changes required to add new scales — only the catalogue data needs to be populated.

---

## Catalogue Summary (N Scale — 51 products, ~35 placeable piece types)

The catalogue contains 51 products, but not all are individual placeable pieces:
- **Bulk packs** (e.g. "10" Straight - Bulk", "19" Radius - Bulk") are the same geometry as their standard counterpart — deduplicated in the palette, only the piece type is shown.
- **Track system sets** (e.g. "Over-Under Figure-8 Track Pack", "Auto-Reversing System", "World's Greatest Hobby Pack") are pre-bundled multi-piece sets — not placeable as single pieces. These are excluded from the palette.

The palette shows unique, individually placeable track piece types:

| Category | Count | Examples |
|---|---|---|
| Straights | 7 | 5", 10", 30", short connectors (0.75"–4.5") |
| Curves | 14 | 11.25"–19" radius, half/quarter sections, concrete tie variants |
| Turnouts | 8 | #4 L/R, #6 L/R, Remote L/R, Concrete L/R |
| Crossings | 4 | 30°, 45°, 60°, 90° |
| Bumpers | 2 | Hayes, Flashing LED |
| Specials | 2 | Terminal rerailers (straight + curved) |

---

## Hosting

Deploy to **Vercel** free tier. Single-page React app with no backend — all data is static JSON bundled with the app. Public URL shareable with anyone.

---

## Out of Scope (v1)

- User accounts / cloud save
- 3D preview
- Scenery / terrain elements
- Animation / train simulation
- Mobile touch optimization (desktop-first)
