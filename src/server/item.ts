/**
 * Server functions for item management.
 *
 * These run on the server only (TanStack Start strips the `"use server"`
 * body from client bundles). They are the single write path into the
 * `items` table, so business rules (template snapshot, orphan protection)
 * live here rather than scattered across the UI.
 *
 * Authentication: `requireSessionUser()` reads the Better Auth session
 * from request cookies and throws if the caller is anonymous.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getHome } from "@/lib/home";
import {
  seedBuiltInTemplates,
  listTemplates,
  listCustomTemplates,
  getTemplate,
  createCustomTemplate,
  updateCustomTemplate,
  deleteCustomTemplate,
  createItem,
  listItems,
  listItemsByRoom,
  listItemsBySystemUnit,
  getItem,
  updateItem,
  moveItem,
  deleteItem,
} from "@/lib/item";
import { listRooms } from "@/lib/room";
import { listSystems, listSystemUnits } from "@/lib/system";
import { requireSessionUser } from "@/lib/auth/session";
import { BUILT_IN_TEMPLATES } from "@/lib/item-templates";
import type { TemplateField } from "@/db/schema";

// Serializable field type for server functions.
type SerializableFields = Record<string, string | number | boolean | null>;

/**
 * Seed built-in templates if they don't exist.
 *
 * Called on first run to populate the item_templates table.
 */
export const seedTemplatesFn = createServerFn({ method: "POST" }).handler(async () => {
  await requireSessionUser();
  await seedBuiltInTemplates(BUILT_IN_TEMPLATES);
  return { success: true };
});

/**
 * List all item templates available for the current user's home.
 *
 * Returns built-in templates plus custom templates for the home.
 */
export const listTemplatesFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSessionUser();
  const home = await getHome(user.id);
  if (!home) return [];
  return listTemplates(home.id);
});

/**
 * List custom templates for the current user's home.
 */
export const listCustomTemplatesFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSessionUser();
  const home = await getHome(user.id);
  if (!home) return [];
  return listCustomTemplates(home.id);
});

const templateFieldSchema: z.ZodType<TemplateField> = z.lazy(() =>
  z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(["text", "number", "date", "select", "boolean"]),
    options: z.array(z.string()).optional(),
    required: z.boolean().optional(),
  }),
);

const createCustomTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  fields: z.array(templateFieldSchema).min(1, "At least one field is required"),
});

/**
 * Create a custom template for the current user's home.
 */
export const createCustomTemplateFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => createCustomTemplateSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    return createCustomTemplate({
      homeId: home.id,
      name: data.name,
      category: data.category,
      description: data.description,
      fields: data.fields,
    });
  });

const updateCustomTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  fields: z.array(templateFieldSchema).min(1).optional(),
});

/**
 * Update a custom template.
 */
export const updateCustomTemplateFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => updateCustomTemplateSchema.parse(raw))
  .handler(async ({ data }) => {
    await requireSessionUser();

    const template = await getTemplate(data.templateId);
    if (!template) throw new Error("Template not found");
    if (template.isBuiltIn) throw new Error("Cannot update built-in template");

    const updates: {
      name?: string;
      category?: string;
      description?: string | null;
      fields?: TemplateField[];
    } = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.category !== undefined) updates.category = data.category;
    if (data.description !== undefined) updates.description = data.description;
    if (data.fields !== undefined) updates.fields = data.fields;

    return updateCustomTemplate(data.templateId, updates);
  });

const deleteCustomTemplateSchema = z.object({
  templateId: z.string().uuid(),
});

/**
 * Delete a custom template.
 *
 * Throws if items are using this template (orphan protection).
 */
export const deleteCustomTemplateFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => deleteCustomTemplateSchema.parse(raw))
  .handler(async ({ data }) => {
    await requireSessionUser();

    const template = await getTemplate(data.templateId);
    if (!template) throw new Error("Template not found");
    if (template.isBuiltIn) throw new Error("Cannot delete built-in template");

    await deleteCustomTemplate(data.templateId);
    return { success: true };
  });

/**
 * All data the Items page needs, in a single round trip: templates, every
 * item (with relations), the room list, and the flat system-unit list.
 * Replaces the loader's parallel fetch + per-system unit waterfall.
 */
export const getItemsPageFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSessionUser();
  const home = await getHome(user.id);
  if (!home) return { templates: [], items: [], rooms: [], systemUnits: [] };

  await seedBuiltInTemplates(BUILT_IN_TEMPLATES);
  const [templates, allItems, roomsList, systemsList] = await Promise.all([
    listTemplates(home.id),
    listItems(home.id),
    listRooms(home.id),
    listSystems(home.id),
  ]);

  const unitsBySystem = await Promise.all(systemsList.map((s) => listSystemUnits(s.id)));
  const systemUnits = unitsBySystem.flat();

  return {
    templates,
    items: allItems as Array<(typeof allItems)[number] & { fields: SerializableFields }>,
    rooms: roomsList,
    systemUnits,
  };
});

/**
 * List all items for the current user's home.
 */
export const listItemsFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSessionUser();
  const home = await getHome(user.id);
  if (!home) return [];
  const items = await listItems(home.id);
  return items as Array<(typeof items)[number] & { fields: SerializableFields }>;
});

/**
 * List items by room.
 */
export const listItemsByRoomFn = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ roomId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await requireSessionUser();
    const items = await listItemsByRoom(data.roomId);
    return items as Array<(typeof items)[number] & { fields: SerializableFields }>;
  });

/**
 * List items by system unit.
 */
export const listItemsBySystemUnitFn = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ systemUnitId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await requireSessionUser();
    const items = await listItemsBySystemUnit(data.systemUnitId);
    return items as Array<(typeof items)[number] & { fields: SerializableFields }>;
  });

const createItemSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1, "Item name is required"),
  roomId: z.string().uuid().nullable().optional(),
  systemUnitId: z.string().uuid().nullable().optional(),
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

/**
 * Create an item from a template.
 *
 * Snapshots the template's fields at creation time.
 */
export const createItemFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => createItemSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    // Verify the template exists.
    const template = await getTemplate(data.templateId);
    if (!template) throw new Error("Template not found");

    const item = await createItem({
      homeId: home.id,
      templateId: data.templateId,
      name: data.name,
      roomId: data.roomId ?? undefined,
      systemUnitId: data.systemUnitId ?? undefined,
      fields: data.fields as Record<string, unknown>,
      createdBy: user.id,
    });
    return item as typeof item & { fields: SerializableFields };
  });

/**
 * Get an item by ID.
 */
export const getItemFn = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ itemId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await requireSessionUser();
    const item = await getItem(data.itemId);
    return item as (typeof item & { fields: SerializableFields }) | undefined;
  });

const updateItemSchema = z.object({
  itemId: z.string().uuid(),
  name: z.string().min(1).optional(),
  roomId: z.string().uuid().nullable().optional(),
  systemUnitId: z.string().uuid().nullable().optional(),
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

/**
 * Update an item's details.
 */
export const updateItemFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => updateItemSchema.parse(raw))
  .handler(async ({ data }) => {
    await requireSessionUser();

    // Verify the item exists.
    const item = await getItem(data.itemId);
    if (!item) throw new Error("Item not found");

    const updates: {
      name?: string;
      roomId?: string | null;
      systemUnitId?: string | null;
      fields?: Record<string, unknown>;
    } = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.roomId !== undefined) updates.roomId = data.roomId;
    if (data.systemUnitId !== undefined) updates.systemUnitId = data.systemUnitId;
    if (data.fields !== undefined) updates.fields = data.fields as Record<string, unknown>;

    const updated = await updateItem(data.itemId, updates);
    return updated as typeof updated & { fields: SerializableFields };
  });

const moveItemSchema = z.object({
  itemId: z.string().uuid(),
  roomId: z.string().uuid().nullable(),
});

/**
 * Move an item to a different room.
 */
export const moveItemFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => moveItemSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();

    // Verify the item exists.
    const item = await getItem(data.itemId);
    if (!item) throw new Error("Item not found");

    const moved = await moveItem(data.itemId, data.roomId, user.id);
    return moved as typeof moved & { fields: SerializableFields };
  });

const deleteItemSchema = z.object({
  itemId: z.string().uuid(),
});

/**
 * Delete an item. Throws if the item has attached documents (orphan protection).
 */
export const deleteItemFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => deleteItemSchema.parse(raw))
  .handler(async ({ data }) => {
    await requireSessionUser();

    // Verify the item exists.
    const item = await getItem(data.itemId);
    if (!item) throw new Error("Item not found");

    await deleteItem(data.itemId);
    return { success: true };
  });
