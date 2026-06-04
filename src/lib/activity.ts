/**
 * Activity module — CRUD operations for the activity log.
 *
 * Activities are chronological events in the home. Each activity has a type
 * from a fixed list, a timestamp, and a description. Activities can optionally
 * link to a Room, System, or Item via entityType/entityId (polymorphic).
 *
 * Auto-generation helpers (logItemCreated, logItemMoved) fire on user actions
 * to build the timeline automatically. Users can also manually create entries
 * for things that happened outside the app or before signup.
 */

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { activities } from "@/db/schema";

export type ActivityType =
  | "maintenance"
  | "purchase"
  | "improvement"
  | "repair"
  | "inspection"
  | "other";

export const ACTIVITY_TYPES: ActivityType[] = [
  "maintenance",
  "purchase",
  "improvement",
  "repair",
  "inspection",
  "other",
];

export type EntityType = "room" | "system" | "item";

/**
 * Create an activity entry.
 *
 * Used for both manual entries and auto-generated events.
 */
export async function createActivity(params: {
  homeId: string;
  type: ActivityType;
  timestamp: Date;
  description: string;
  entityType?: EntityType;
  entityId?: string;
  notes?: string;
  createdBy: string;
}) {
  const db = await getDb();
  const [created] = await db
    .insert(activities)
    .values({
      homeId: params.homeId,
      type: params.type,
      timestamp: params.timestamp,
      description: params.description,
      entityType: params.entityType,
      entityId: params.entityId,
      notes: params.notes,
      createdBy: params.createdBy,
    })
    .returning();
  return created;
}

/**
 * List all activities for a home, ordered by timestamp descending (newest first).
 *
 * Optional filters for type and entity.
 */
export async function listActivities(
  homeId: string,
  filters?: {
    type?: ActivityType;
    entityType?: EntityType;
    entityId?: string;
  },
) {
  const db = await getDb();

  const conditions: ReturnType<typeof eq>[] = [eq(activities.homeId, homeId)];

  if (filters?.type) {
    conditions.push(eq(activities.type, filters.type));
  }
  if (filters?.entityType && filters?.entityId) {
    conditions.push(eq(activities.entityType, filters.entityType));
    conditions.push(eq(activities.entityId, filters.entityId));
  }

  return db
    .select()
    .from(activities)
    .where(and(...conditions))
    .orderBy(desc(activities.timestamp));
}

/**
 * Get an activity by ID.
 */
export async function getActivity(activityId: string) {
  const db = await getDb();
  return db.query.activities.findFirst({
    where: eq(activities.id, activityId),
  });
}

/**
 * Update an activity's details.
 */
export async function updateActivity(
  activityId: string,
  updates: {
    type?: ActivityType;
    timestamp?: Date;
    description?: string;
    notes?: string | null;
  },
) {
  const db = await getDb();
  const [updated] = await db
    .update(activities)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(activities.id, activityId))
    .returning();
  return updated;
}

/**
 * Delete an activity.
 */
export async function deleteActivity(activityId: string): Promise<void> {
  const db = await getDb();
  await db.delete(activities).where(eq(activities.id, activityId));
}

// ──────────────────────────────────────────────────────────────────────────────
// Auto-generation helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Log an item creation event.
 *
 * Called automatically when a new item is created.
 */
export async function logItemCreated(params: {
  homeId: string;
  itemId: string;
  itemName: string;
  createdBy: string;
}) {
  return createActivity({
    homeId: params.homeId,
    type: "other",
    timestamp: new Date(),
    description: `Added item "${params.itemName}"`,
    entityType: "item",
    entityId: params.itemId,
    createdBy: params.createdBy,
  });
}

/**
 * Log an item movement event.
 *
 * Called automatically when an item is moved to a different room.
 */
export async function logItemMoved(params: {
  homeId: string;
  itemId: string;
  itemName: string;
  fromRoomName?: string | null;
  toRoomName?: string | null;
  createdBy: string;
}) {
  let description: string;
  if (params.fromRoomName && params.toRoomName) {
    description = `Moved "${params.itemName}" from ${params.fromRoomName} to ${params.toRoomName}`;
  } else if (params.toRoomName) {
    description = `Moved "${params.itemName}" to ${params.toRoomName}`;
  } else if (params.fromRoomName) {
    description = `Removed "${params.itemName}" from ${params.fromRoomName}`;
  } else {
    description = `Moved "${params.itemName}"`;
  }

  return createActivity({
    homeId: params.homeId,
    type: "other",
    timestamp: new Date(),
    description,
    entityType: "item",
    entityId: params.itemId,
    createdBy: params.createdBy,
  });
}
