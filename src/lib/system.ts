/**
 * System module — CRUD operations for home systems and their sub-units.
 *
 * Systems represent major home infrastructure (HVAC, electrical, plumbing,
 * water heater, etc.). Each system can have sub-units (e.g., "Upstairs Unit",
 * "Downstairs Unit" for HVAC).
 *
 * Orphan protection: systems cannot be deleted if they contain sub-units or
 * items. The `canDeleteSystem` function checks for child entities before
 * allowing deletion.
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { systems, systemUnits } from "@/db/schema";

/**
 * Create a new system in the given home.
 */
export async function createSystem(homeId: string, name: string) {
  const db = await getDb();
  const [created] = await db.insert(systems).values({ homeId, name, sortOrder: 0 }).returning();
  return created;
}

/**
 * List all systems for a home, ordered by sort_order then name.
 */
export async function listSystems(homeId: string) {
  const db = await getDb();
  return db
    .select()
    .from(systems)
    .where(eq(systems.homeId, homeId))
    .orderBy(systems.sortOrder, systems.name);
}

/**
 * Fetch a single system by ID, or null if not found.
 */
export async function getSystem(systemId: string) {
  const db = await getDb();
  return db.query.systems.findFirst({
    where: eq(systems.id, systemId),
  });
}

/**
 * Update a system's details.
 */
export async function updateSystem(
  systemId: string,
  updates: {
    name?: string;
    sortOrder?: number;
  },
) {
  const db = await getDb();
  const [updated] = await db
    .update(systems)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(systems.id, systemId))
    .returning();
  return updated;
}

/**
 * Delete a system.
 *
 * Throws an error if the system contains sub-units or items (orphan protection).
 */
export async function deleteSystem(systemId: string): Promise<void> {
  const check = await canDeleteSystem(systemId);
  if (!check.canDelete) {
    throw new Error(check.reason);
  }

  const db = await getDb();
  await db.delete(systems).where(eq(systems.id, systemId));
}

/**
 * Check if a system can be safely deleted (no child units or items).
 */
export async function canDeleteSystem(
  systemId: string,
): Promise<{ canDelete: true } | { canDelete: false; reason: string }> {
  const db = await getDb();

  // Check for sub-units.
  const units = await db
    .select()
    .from(systemUnits)
    .where(eq(systemUnits.systemId, systemId))
    .limit(1);

  if (units.length > 0) {
    return {
      canDelete: false,
      reason: "This system contains sub-units. Remove them first.",
    };
  }

  // Check for items (table added in Slice 7).
  // For now, this is a placeholder — returns true since the items table
  // doesn't exist yet. When items table is added, query it here.

  return { canDelete: true };
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-units
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Create a new sub-unit within a system.
 */
export async function createSystemUnit(systemId: string, name: string) {
  const db = await getDb();
  const [created] = await db
    .insert(systemUnits)
    .values({ systemId, name, sortOrder: 0 })
    .returning();
  return created;
}

/**
 * List all sub-units for a system, ordered by sort_order then name.
 */
export async function listSystemUnits(systemId: string) {
  const db = await getDb();
  return db
    .select()
    .from(systemUnits)
    .where(eq(systemUnits.systemId, systemId))
    .orderBy(systemUnits.sortOrder, systemUnits.name);
}

/**
 * Fetch a single sub-unit by ID, or null if not found.
 */
export async function getSystemUnit(unitId: string) {
  const db = await getDb();
  return db.query.systemUnits.findFirst({
    where: eq(systemUnits.id, unitId),
  });
}

/**
 * Update a sub-unit's details.
 */
export async function updateSystemUnit(
  unitId: string,
  updates: {
    name?: string;
    sortOrder?: number;
  },
) {
  const db = await getDb();
  const [updated] = await db
    .update(systemUnits)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(systemUnits.id, unitId))
    .returning();
  return updated;
}

/**
 * Delete a sub-unit.
 */
export async function deleteSystemUnit(unitId: string): Promise<void> {
  const db = await getDb();
  await db.delete(systemUnits).where(eq(systemUnits.id, unitId));
}
