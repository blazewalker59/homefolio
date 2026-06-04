/**
 * Server functions for activity management.
 *
 * These run on the server only (TanStack Start strips the `"use server"`
 * body from client bundles). They are the single write path into the
 * `activities` table, so business rules live here rather than scattered
 * across the UI.
 *
 * Authentication: `requireSessionUser()` reads the Better Auth session
 * from request cookies and throws if the caller is anonymous.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getHome } from "@/lib/home";
import {
  listActivities,
  createActivity,
  getActivity,
  updateActivity,
  deleteActivity,
  ACTIVITY_TYPES,
} from "@/lib/activity";
import type { ActivityType } from "@/lib/activity";
import { requireSessionUser } from "@/lib/auth/session";

/**
 * List all activities for the current user's home.
 *
 * Returns activities ordered by timestamp descending (newest first).
 */
export const listActivitiesFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSessionUser();
  const home = await getHome(user.id);
  if (!home) return [];
  return listActivities(home.id);
});

const createActivitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  timestamp: z.string().datetime(),
  description: z.string().min(1, "Description is required"),
  entityType: z.enum(["room", "system", "item"]).optional(),
  entityId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

/**
 * Create a manual activity entry.
 *
 * Used for things that happened outside the app or before signup.
 */
export const createActivityFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => createActivitySchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    return createActivity({
      homeId: home.id,
      type: data.type as ActivityType,
      timestamp: new Date(data.timestamp),
      description: data.description,
      entityType: data.entityType,
      entityId: data.entityId,
      notes: data.notes,
      createdBy: user.id,
    });
  });

const updateActivitySchema = z.object({
  activityId: z.string().uuid(),
  type: z.enum(ACTIVITY_TYPES).optional(),
  timestamp: z.string().datetime().optional(),
  description: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
});

/**
 * Update an activity's details.
 */
export const updateActivityFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => updateActivitySchema.parse(raw))
  .handler(async ({ data }) => {
    await requireSessionUser();

    const activity = await getActivity(data.activityId);
    if (!activity) throw new Error("Activity not found");

    const updates: {
      type?: ActivityType;
      timestamp?: Date;
      description?: string;
      notes?: string | null;
    } = {};
    if (data.type !== undefined) updates.type = data.type as ActivityType;
    if (data.timestamp !== undefined) updates.timestamp = new Date(data.timestamp);
    if (data.description !== undefined) updates.description = data.description;
    if (data.notes !== undefined) updates.notes = data.notes;

    return updateActivity(data.activityId, updates);
  });

const deleteActivitySchema = z.object({
  activityId: z.string().uuid(),
});

/**
 * Delete an activity.
 */
export const deleteActivityFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => deleteActivitySchema.parse(raw))
  .handler(async ({ data }) => {
    await requireSessionUser();

    const activity = await getActivity(data.activityId);
    if (!activity) throw new Error("Activity not found");

    await deleteActivity(data.activityId);
    return { success: true };
  });
