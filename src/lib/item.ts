/**
 * Item module — CRUD operations for items with template snapshot behavior.
 *
 * Items are created from templates and snapshot the template's fields at
 * creation time. An item can belong to a Room, a System (or sub-unit), or
 * both (dual membership). Moving an item between rooms generates an activity
 * entry (placeholder for Slice 9). Orphan protection: items cannot be deleted
 * if they have attached documents.
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { items, itemTemplates } from "@/db/schema";
import type { TemplateField } from "@/db/schema";

/**
 * Seed built-in templates into the database.
 *
 * Called on first run to populate the item_templates table. Idempotent —
 * checks if templates already exist before inserting.
 */
export async function seedBuiltInTemplates(
  templates: Array<{
    name: string;
    category: string;
    description: string;
    fields: TemplateField[];
  }>,
) {
  const db = await getDb();

  // Check if any built-in templates exist.
  const existing = await db
    .select()
    .from(itemTemplates)
    .where(eq(itemTemplates.isBuiltIn, true))
    .limit(1);

  if (existing.length > 0) {
    return; // Already seeded.
  }

  // Insert all built-in templates.
  await db.insert(itemTemplates).values(
    templates.map((t) => ({
      name: t.name,
      category: t.category,
      description: t.description,
      fields: t.fields,
      isBuiltIn: true,
    })),
  );
}

/**
 * List all item templates.
 */
export async function listTemplates() {
  const db = await getDb();
  return db.select().from(itemTemplates).orderBy(itemTemplates.name);
}

/**
 * Get a template by ID.
 */
export async function getTemplate(templateId: string) {
  const db = await getDb();
  return db.query.itemTemplates.findFirst({
    where: eq(itemTemplates.id, templateId),
  });
}

/**
 * Create an item from a template.
 *
 * Snapshots the template's fields at creation time. The item can be assigned
 * to a Room, a System (or sub-unit), or both (dual membership).
 */
export async function createItem(params: {
  homeId: string;
  templateId: string;
  name: string;
  roomId?: string;
  systemUnitId?: string;
  fields: Record<string, unknown>;
}) {
  const db = await getDb();
  const [created] = await db
    .insert(items)
    .values({
      homeId: params.homeId,
      templateId: params.templateId,
      name: params.name,
      roomId: params.roomId,
      systemUnitId: params.systemUnitId,
      fields: params.fields,
    })
    .returning();
  return created;
}

/**
 * List all items for a home.
 */
export async function listItems(homeId: string) {
  const db = await getDb();
  return db.query.items.findMany({
    where: eq(items.homeId, homeId),
    with: {
      template: true,
      room: true,
      systemUnit: true,
    },
    orderBy: items.name,
  });
}

/**
 * List items by room.
 */
export async function listItemsByRoom(roomId: string) {
  const db = await getDb();
  return db.query.items.findMany({
    where: eq(items.roomId, roomId),
    with: {
      template: true,
      room: true,
      systemUnit: true,
    },
    orderBy: items.name,
  });
}

/**
 * List items by system unit.
 */
export async function listItemsBySystemUnit(systemUnitId: string) {
  const db = await getDb();
  return db.query.items.findMany({
    where: eq(items.systemUnitId, systemUnitId),
    with: {
      template: true,
      room: true,
      systemUnit: true,
    },
    orderBy: items.name,
  });
}

/**
 * Get an item by ID.
 */
export async function getItem(itemId: string) {
  const db = await getDb();
  return db.query.items.findFirst({
    where: eq(items.id, itemId),
    with: {
      template: true,
      room: true,
      systemUnit: true,
    },
  });
}

/**
 * Update an item's details.
 *
 * Updates the item's snapshot fields, not the template.
 */
export async function updateItem(
  itemId: string,
  updates: {
    name?: string;
    roomId?: string | null;
    systemUnitId?: string | null;
    fields?: Record<string, unknown>;
  },
) {
  const db = await getDb();
  const [updated] = await db
    .update(items)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(items.id, itemId))
    .returning();
  return updated;
}

/**
 * Move an item to a different room.
 *
 * Records the move (placeholder for activity log in Slice 9).
 */
export async function moveItem(itemId: string, newRoomId: string | null) {
  // TODO: Record activity entry for the move (Slice 9).
  return updateItem(itemId, { roomId: newRoomId });
}

/**
 * Check if an item can be safely deleted (no attached documents).
 *
 * Returns { canDelete: true } if safe, or { canDelete: false, reason: string }
 * if deletion would orphan child entities.
 */
export async function canDeleteItem(
  _itemId: string,
): Promise<{ canDelete: true } | { canDelete: false; reason: string }> {
  // Check for documents (table added in Slice 8).
  // For now, this is a placeholder — returns true since the documents table
  // doesn't exist yet. When documents table is added, query it here.

  return { canDelete: true };
}

/**
 * Delete an item.
 *
 * Throws an error if the item has attached documents (orphan protection).
 */
export async function deleteItem(itemId: string): Promise<void> {
  const check = await canDeleteItem(itemId);
  if (!check.canDelete) {
    throw new Error(check.reason);
  }

  const db = await getDb();
  await db.delete(items).where(eq(items.id, itemId));
}
