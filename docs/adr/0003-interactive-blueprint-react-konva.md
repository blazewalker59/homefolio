# 3. Interactive blueprint (Floor/Shape model) built on react-konva

Date: 2026-06-07

## Status

Accepted

Supersedes the "Blueprint rendering: static image only for v1; interactive
floor plan deferred to post-v1" decision previously recorded in `CONTEXT.md`.

## Context

The original scope defined a Blueprint as a static image for visual reference
only — no room coordinates, no click-to-navigate — with the interactive version
explicitly deferred. We are reversing that: the Blueprint becomes an interactive,
grid-based sandbox where the user draws, resizes, and moves room shapes to lay
out the home, then clicks into a room to manage it.

No blueprint code exists yet (no route, no static-image upload), so this is a
green-field decision, not a migration off an existing implementation.

## Decision

**The Blueprint is interactive**, modelled with two new entities that keep the
existing Room model untouched:

- **Floor** — a named level of the home (Basement/Ground/Upstairs). Belongs to a
  Home, ordered, with a reserved nullable `scale`. Floor is _purely spatial_: it
  lives on the Shape, never on the Room. An unplaced Room has no floor and the
  rooms list is unaffected.
- **Shape** — a freeform region on exactly one Floor, stored as grid-unit polygon
  points (supports L-shapes, not just rectangles). A Shape optionally links 1:1
  to a Room; unlinked Shapes are allowed and can carry their own label.

Schema:

```
floors:  id, home_id→homes (cascade), name, sort_order, scale (nullable), timestamps
shapes:  id, home_id→homes (cascade), floor_id→floors (cascade),
         room_id→rooms (ON DELETE SET NULL, partial-unique where not null),
         points (jsonb {x,y}[]), label (nullable), color (nullable), z (int), timestamps
```

The FK behaviours encode the domain rules directly: `room_id ON DELETE SET NULL`
_is_ "deleting a Room leaves its Shape unlinked"; the partial-unique on `room_id`
enforces the 1 Room ↔ 1 Shape rule; floor cascade removes a floor's shapes.

**Interaction model:**

- Explicit **Edit/View toggle**. View → clicking a Shape opens its linked Room
  (navigation, no accidental edits). Edit → draw/move/resize, navigation off.
- **Rect-first drawing** (drag a grid-snapped rectangle), refined to L-shapes via
  vertex editing.
- **Linking** a Shape targets an existing Room _or_ creates a new Room on the
  spot (collecting name + category, since `rooms.category` is required).
- **Debounced autosave**.
- **Abstract grid** for v1 (alignment only — no feet/meters, no computed area),
  with coordinates stored unit-agnostically and a reserved nullable `scale` so
  real measurements can be added later without migration.

**Rendering library: react-konva.** Canvas-2D via Konva with React bindings.

## Considered Options

- **react-konva (chosen)** — strong performance, full control over aesthetics
  (matches the existing CSS-variable theme), a free bounding-box transformer, and
  a good fit for custom polygon drawing + grid snap + pan/zoom. Polygon vertex
  editing is custom work. Must be client-only (lazy-loaded, SSR-guarded).
- **SVG + dnd-kit** — lighter and SSR-friendlier, trivial polygons, DOM-native
  overlays; rejected because resize/zoom/snap are all hand-rolled and heavy
  scenes underperform canvas.
- **tldraw** — slickest out of the box, but an opinionated branded editor we'd be
  constraining/restyling to rooms-only, heavier, with commercial-license/watermark
  considerations and least control over the data model.
- **React Flow (@xyflow)** — ruled out: node/edge model fights freeform polygons.

## Consequences

- react-konva renders to `<canvas>` and touches `window`; it must be lazy-loaded
  and SSR-guarded under TanStack Start. Konva is a new client dependency with
  meaningful lock-in for the canvas layer (hence this ADR).
- The blueprint is self-contained: Floors and Shapes are new tables, and the
  Room model, rooms page, and onboarding are unchanged.
- "Create new Room from a Shape" must surface a category picker, because Rooms
  require a category.
- Autosave means write batching and in-flight-save handling on the client.
- The abstract-grid choice defers any square-footage / real-scale features; the
  reserved `scale` field keeps that path open without a migration.
