# Homefolio — Domain Context

## Glossary

### User

A homeowner who manages a single home. Multi-home and shared access are deferred.

### Home

The single property a user has claimed. The top-level container for all data. Has an address (required), name (optional, defaults to "My Home"), and property facts (year built, sqft, lot size, purchase date/price).

### Room

A physical space within a home (kitchen, bedroom, garage, backyard). Rooms hold spatial items — paint, windows, outlets, furniture, photos.

### System

A cross-cutting infrastructure that spans rooms (HVAC, electrical, plumbing). Systems hold system-level items — air filters, circuit breakers, water heaters.

### Item

A discrete thing tracked within a Home. Can optionally belong to a Room (physical location), a System (functional grouping), or both. Paint color, window, outlet, piece of furniture, air filter, thermostat, etc.

### Template

A schema definition that specifies the expected attributes for a type of Item. Templates provide structure (e.g., a "Window" template expects dimensions, manufacturer, type) while allowing users to create custom templates for item types not covered by built-in defaults. Custom templates support four field types: text, number, date, and dropdown (select).

### Document

A typed file stored in a generic file store. Documents have a type (receipt, image, manual, etc.) and can be attached to a Home, Room, System, or Item.

### Activity

A timestamped event in the home's history. Activities form a chronological log — e.g., "painted the kitchen," "replaced HVAC filter," "purchased couch." Most user actions auto-generate activity entries.

### Blueprint

An interactive floor plan of the home — a grid-based sandbox where the user draws, resizes, and moves shapes to lay out the home across one or more floors. Optional: the app functions without one. The Blueprint is a drawing layer reconciled with Rooms after the fact, not a live view of the rooms list. It doubles as a spatial navigation surface: a shape linked to a Room can be opened to manage that room.

### Floor

A named level of the home within the Blueprint (e.g. Basement, Ground, Upstairs). Floor is purely a spatial/blueprint concept — it lives on the shape, not on the Room. An unplaced Room has no floor. The Room model and rooms list are unaffected by floors.

### Shape

A single freeform region drawn on the Blueprint (supports L-shapes / polygons, not just rectangles). A Shape belongs to exactly one Floor and optionally links to exactly one Room (1:1 when linked). Shapes can sit unlinked. Linking a Shape to a Room either references an existing Room or creates a new one.
_Avoid_: rectangle, box, element (use "Shape").

### Maintenance Reminder

A time-based notification tied to an Item or System. Can be interval-based (every 90 days) or date-based (next service on 2026-09-01). Delivered in-app and optionally via email.

---

## Resolved Decisions

- **User ↔ Home**: One user, one home. Multi-home and shared access deferred.
- **Structural spine**: Home → Rooms + Systems (dual model). Rooms for physical spaces, Systems for cross-cutting infrastructure.
- **Item structure**: Items use Templates — a schema that defines expected attributes for a given item type. Built-in templates cover common types (paint, windows, outlets, furniture, air filters). Users can create custom templates for anything else. Items snapshot the template at creation time — updating a template later does not retroactively change existing items.
- **Item mobility**: Items can be moved between Rooms (e.g., move furniture from Living Room to Den). Moving preserves the item's full history and generates an activity entry.
- **Item dual membership**: An Item can belong to a Room (physical location), a System (functional grouping), or both. A thermostat lives in the hallway AND is part of HVAC. A water heater sits in the garage AND is part of plumbing.
- **Maintenance reminders**: Included in v1. Items and Systems can have an optional maintenance interval (e.g., every 90 days) or a specific next-maintenance date. Delivered in-app and via email. Reminders create pending tasks that the user must mark as "done" — completing a task auto-schedules the next occurrence and generates an activity entry.
- **Remodel forecasting**: Deferred to post-v1.
- **Property data acquisition**: Attempt a rich data pull via property data API (ATTOM, Zillow Group, or similar) on address lookup. If the API can't find the address, fall through to manual setup — user enters basic facts (bed/bath/sqft, year built) and adds rooms themselves. Never block the user.
- **Property data stored**: Home facts (bed/bath/sqft, year built, lot size) and sale history (purchase price, dates). Tax assessment history and previous listing photos deferred to post-v1.
- **Home sale**: When a user sells their home, the Home is archived (marked "sold" with sale date and price). All data becomes read-only. No deletion, no transfer to new owner in v1.
- **Financial tracking**: Track total spending only (purchase price + sum of all receipt amounts). Display "Total Invested" on Home Overview. Home value estimation and improvement ROI deferred to post-v1.
- **Data export**: PDF report export for v1. Formatted document summarizing rooms, items, receipts, and maintenance history. Raw data export (JSON/CSV + file zip) deferred to post-v1.
- **Search and navigation**: Both global search (searches across rooms, systems, items, activities, and documents) and filtered browsing (drill down by room/system, filter by item type, date, etc.).
- **Blueprint acquisition**: Prefer public records pull first. If unavailable, explore third-party drawing utilities. If both are too clunky, defer blueprints entirely — the app works as a text-based list of rooms and systems.
- **Blueprint rendering**: Interactive floor plan (reverses the earlier "static image only" decision). A grid-based sandbox where users draw, resize, and move freeform Shapes to lay out the home. Shapes support polygons (L-shapes), not just rectangles. The Blueprint is a drawing layer reconciled with Rooms after drawing — not a live view of the rooms list.
- **Blueprint ↔ Rooms link**: A Shape optionally links to one Room (1:1 when linked); a Room maps to at most one Shape. Linking can happen after a Shape is drawn (post-hoc mapping), and unlinked Shapes are allowed. From a Shape the user can link to an existing Room or create a new Room on the spot. A linked Shape supports opening that Room to manage it (spatial navigation).
- **Blueprint floors**: The Blueprint supports multiple named Floors (levels). Each Shape belongs to one Floor. Floor is purely spatial — it lives on the Shape, not the Room; an unplaced Room has no floor and the rooms list is unaffected.
- **Blueprint editing model**: The canvas has an explicit Edit/View toggle. View mode opens a Shape's linked Room (navigation, no accidental edits); Edit mode draws/moves/resizes and disables navigation. Drawing is rect-first (drag a grid-snapped rectangle) with optional vertex editing to form L-shapes/polygons. Built on react-konva (client-only). Edits persist via debounced autosave.
- **Blueprint scale**: Grid is abstract for v1 (alignment only — no feet/meters, no computed area). Coordinates are stored unit-agnostically with a reserved nullable scale field so real measurements can be added later without migration.
- **Blueprint deletion**: Deleting a Shape never deletes its Room (the Shape is only geometry). Deleting a Room leaves its Shape in place but unlinked — no cross-domain cascade, consistent with allowing unlinked Shapes.
- **Room photos**: Room photos are Documents with `type=image`. One image per room can be marked as the "primary photo" for visual representation (room cards, lists). Gallery view shows all images attached to the room.
- **Documents**: Typed files in a generic file store. Type is a label only — fixed list for v1: receipt, image, manual, warranty, contract, other. All documents share the same structure: file + type + optional notes. Exception: receipts have an additional `amount` field to support financial tracking (Total Invested). Can be attached to a Home, Room, System, or Item.
- **Activity Log**: Included in v1. A timestamped timeline of events in the home's history. Each activity has: timestamp, type (maintenance, purchase, improvement, repair, inspection, other), description, optional related entities (Room, System, Item), optional notes, and optional photos. Most user actions auto-generate activity entries. Uploading a receipt auto-creates a "purchase" activity with the receipt attached. Users can also manually create activity entries for events that happened outside the app or before signup.
- **Room onboarding**: Property data pull suggests rooms (bed/bath count → Bedroom 1/2/3, Bathroom 1/2), user confirms, renames, and adds additional rooms (kitchen, living room, den, etc.) before committing.
- **Room categories**: Rooms have a category (Bedroom, Bathroom, Kitchen, Living Space, etc.) that drives suggested default items and maintenance reminders. Users can still add anything to any room regardless of category.
- **Deletion policy**: Orphan protection across the board. Cannot delete a Room that contains items or documents, a System that contains sub-units or items, or an Item that has documents attached. User must move or delete contents first.
- **System sub-units**: Systems can have multiple sub-units (e.g., HVAC → "Upstairs Unit" + "Downstairs Unit"). Each sub-unit has its own items and maintenance schedules.
- **System onboarding**: Suggest default systems (HVAC, electrical, plumbing, water heater) during onboarding. User confirms, renames, adds, or removes. Same pattern as room onboarding.
