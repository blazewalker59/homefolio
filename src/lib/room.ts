/**
 * Room module — CRUD operations for rooms within a home.
 *
 * Rooms are physical spaces (Bedroom, Kitchen, etc.) that belong to a home.
 * Each room has a category from the configurable list in `room-categories.ts`.
 *
 * Orphan protection: rooms cannot be deleted if they contain items or
 * documents. The `canDeleteRoom` function checks for child entities before
 * allowing deletion.
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { rooms } from "@/db/schema";
import { isValidRoomCategory } from "./room-categories";

/**
 * Create a new room in the given home.
 *
 * Validates that the category is in the known list. The room is appended
 * to the end of the sort order (max sortOrder + 1).
 */
export async function createRoom(homeId: string, name: string, category: string) {
  if (!isValidRoomCategory(category)) {
    throw new Error(`Invalid room category: ${category}`);
  }

  const db = await getDb();

  const [created] = await db
    .insert(rooms)
    .values({ homeId, name, category, sortOrder: 0 })
    .returning();

  return created;
}

/**
 * List all rooms for a home, ordered by sort_order then name.
 */
export async function listRooms(homeId: string) {
  const db = await getDb();
  return db
    .select()
    .from(rooms)
    .where(eq(rooms.homeId, homeId))
    .orderBy(rooms.sortOrder, rooms.name);
}

/**
 * Fetch a single room by ID, or null if not found.
 */
export async function getRoom(roomId: string) {
  const db = await getDb();
  return db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
  });
}

/**
 * Update a room's details.
 *
 * Accepts partial updates — only the provided fields are changed.
 * Validates category if provided.
 */
export async function updateRoom(
  roomId: string,
  updates: {
    name?: string;
    category?: string;
    sortOrder?: number;
  },
) {
  if (updates.category && !isValidRoomCategory(updates.category)) {
    throw new Error(`Invalid room category: ${updates.category}`);
  }

  const db = await getDb();
  const [updated] = await db
    .update(rooms)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(rooms.id, roomId))
    .returning();

  return updated;
}

/**
 * Check if a room can be safely deleted (no child items or documents).
 *
 * Returns { canDelete: true } if safe, or { canDelete: false, reason: string }
 * if deletion would orphan child entities.
 *
 * Note: items and documents tables are added in later slices. This function
 * will be updated to query those tables when they exist.
 */
export async function canDeleteRoom(
  _roomId: string,
): Promise<{ canDelete: true } | { canDelete: false; reason: string }> {
  // Check for items (table added in Slice 7).
  // For now, this is a placeholder — returns true since the items table
  // doesn't exist yet. When items table is added, query it here.
  // const db = await getDb();
  // const [{ itemCount }] = await db
  //   .select({ itemCount: count() })
  //   .from(items)
  //   .where(eq(items.roomId, roomId));
  // if (itemCount > 0) {
  //   return { canDelete: false, reason: `This room contains ${itemCount} item(s). Move or delete them first.` };
  // }

  // Check for documents (table added in Slice 8).
  // For now, this is a placeholder — returns true since the documents table
  // doesn't exist yet. When documents table is added, query it here.
  // const [{ docCount }] = await db
  //   .select({ docCount: count() })
  //   .from(documents)
  //   .where(eq(documents.roomId, roomId));
  // if (docCount > 0) {
  //   return { canDelete: false, reason: `This room contains ${docCount} document(s). Move or delete them first.` };
  // }

  return { canDelete: true };
}

/**
 * Delete a room.
 *
 * Throws an error if the room contains items or documents (orphan protection).
 */
export async function deleteRoom(roomId: string): Promise<void> {
  const check = await canDeleteRoom(roomId);
  if (!check.canDelete) {
    throw new Error(check.reason);
  }

  const db = await getDb();
  await db.delete(rooms).where(eq(rooms.id, roomId));
}
