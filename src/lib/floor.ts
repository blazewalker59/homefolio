/**
 * Floor module — CRUD operations for blueprint floors within a home.
 *
 * A Floor is a named level of the home (Basement, Ground, Upstairs) and is
 * purely a Blueprint concept — it never touches the Room model. Floors are
 * ordered by sort_order; new floors append to the end. Deleting a floor
 * cascade-deletes its blueprint shapes (shapes table added in a later slice).
 */

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { floors } from "@/db/schema";

/**
 * Create a new floor in the given home, appended to the end of the order
 * (max sortOrder + 1).
 */
export async function createFloor(homeId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Floor name is required");
  }

  const db = await getDb();

  const [{ nextOrder }] = await db
    .select({
      nextOrder: sql<number>`coalesce(max(${floors.sortOrder}), -1) + 1`,
    })
    .from(floors)
    .where(eq(floors.homeId, homeId));

  const [created] = await db
    .insert(floors)
    .values({ homeId, name: trimmed, sortOrder: nextOrder })
    .returning();

  return created;
}

/**
 * List all floors for a home, ordered by sort_order then name.
 */
export async function listFloors(homeId: string) {
  const db = await getDb();
  return db
    .select()
    .from(floors)
    .where(eq(floors.homeId, homeId))
    .orderBy(floors.sortOrder, floors.name);
}

/**
 * Fetch a single floor by ID, or null/undefined if not found.
 */
export async function getFloor(floorId: string) {
  const db = await getDb();
  return db.query.floors.findFirst({
    where: eq(floors.id, floorId),
  });
}

/**
 * Rename a floor.
 */
export async function updateFloor(floorId: string, updates: { name?: string }) {
  const set: { name?: string; updatedAt: Date } = { updatedAt: new Date() };
  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (!trimmed) throw new Error("Floor name is required");
    set.name = trimmed;
  }

  const db = await getDb();
  const [updated] = await db.update(floors).set(set).where(eq(floors.id, floorId)).returning();

  return updated;
}

/**
 * Persist a new ordering of floors. `orderedIds` is the full list of a home's
 * floor IDs in the desired order; each floor's sort_order is set to its index.
 */
export async function reorderFloors(orderedIds: string[]) {
  const db = await getDb();
  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(floors).set({ sortOrder: index, updatedAt: new Date() }).where(eq(floors.id, id)),
    ),
  );
}

/**
 * Delete a floor. Its blueprint shapes cascade-delete with it (DB-level).
 */
export async function deleteFloor(floorId: string): Promise<void> {
  const db = await getDb();
  await db.delete(floors).where(eq(floors.id, floorId));
}
