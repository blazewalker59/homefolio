/**
 * Server functions for blueprint floor management.
 *
 * These run on the server only. They are the single write path into the
 * `floors` table and enforce that every floor belongs to the caller's home.
 *
 * Authentication: `requireSessionUser()` reads the Better Auth session from
 * request cookies and throws if the caller is anonymous.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getHome } from "@/lib/home";
import {
  createFloor,
  listFloors,
  getFloor,
  updateFloor,
  reorderFloors,
  deleteFloor,
} from "@/lib/floor";
import { requireSessionUser } from "@/lib/auth/session";

/**
 * List all floors for the current user's home.
 */
export const listFloorsFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSessionUser();
  const home = await getHome(user.id);
  if (!home) return [];
  return listFloors(home.id);
});

const createFloorSchema = z.object({
  name: z.string().min(1, "Floor name is required"),
});

/**
 * Create a new floor in the current user's home.
 */
export const createFloorFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => createFloorSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    return createFloor(home.id, data.name);
  });

const updateFloorSchema = z.object({
  floorId: z.string().uuid(),
  name: z.string().min(1, "Floor name is required"),
});

/**
 * Rename a floor.
 */
export const updateFloorFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => updateFloorSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    const floor = await getFloor(data.floorId);
    if (!floor || floor.homeId !== home.id) {
      throw new Error("Floor not found or access denied");
    }

    return updateFloor(data.floorId, { name: data.name });
  });

const reorderFloorsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

/**
 * Persist a new ordering of the home's floors.
 */
export const reorderFloorsFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => reorderFloorsSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    // Only reorder floors that actually belong to this home.
    const owned = new Set((await listFloors(home.id)).map((f) => f.id));
    const ids = data.orderedIds.filter((id) => owned.has(id));
    if (ids.length !== owned.size) {
      throw new Error("Floor ordering must reference exactly this home's floors");
    }

    await reorderFloors(ids);
    return { success: true };
  });

const deleteFloorSchema = z.object({
  floorId: z.string().uuid(),
});

/**
 * Delete a floor. Its blueprint shapes cascade-delete with it.
 */
export const deleteFloorFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => deleteFloorSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    const floor = await getFloor(data.floorId);
    if (!floor || floor.homeId !== home.id) {
      throw new Error("Floor not found or access denied");
    }

    await deleteFloor(data.floorId);
    return { success: true };
  });
