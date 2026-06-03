/**
 * Server functions for system management.
 *
 * These run on the server only (TanStack Start strips the `"use server"`
 * body from client bundles). They are the single write path into the
 * `systems` and `system_units` tables, so business rules (orphan protection)
 * live here rather than scattered across the UI.
 *
 * Authentication: `requireSessionUser()` reads the Better Auth session
 * from request cookies and throws if the caller is anonymous.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getHome } from "@/lib/home";
import {
  createSystem,
  listSystems,
  getSystem,
  updateSystem,
  deleteSystem,
  createSystemUnit,
  listSystemUnits,
  getSystemUnit,
  updateSystemUnit,
  deleteSystemUnit,
} from "@/lib/system";
import { requireSessionUser } from "@/lib/auth/session";

/**
 * List all systems for the current user's home.
 */
export const listSystemsFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSessionUser();
  const home = await getHome(user.id);
  if (!home) return [];
  return listSystems(home.id);
});

const createSystemSchema = z.object({
  name: z.string().min(1, "System name is required"),
});

/**
 * Create a new system in the current user's home.
 */
export const createSystemFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => createSystemSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    return createSystem(home.id, data.name);
  });

const updateSystemSchema = z.object({
  systemId: z.string().uuid(),
  name: z.string().min(1, "System name is required").optional(),
});

/**
 * Update a system's details.
 */
export const updateSystemFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => updateSystemSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    // Verify the system belongs to this user's home.
    const system = await getSystem(data.systemId);
    if (!system || system.homeId !== home.id) {
      throw new Error("System not found or access denied");
    }

    const updates: { name?: string } = {};
    if (data.name !== undefined) updates.name = data.name;

    return updateSystem(data.systemId, updates);
  });

const deleteSystemSchema = z.object({
  systemId: z.string().uuid(),
});

/**
 * Delete a system. Throws if the system contains sub-units or items
 * (orphan protection).
 */
export const deleteSystemFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => deleteSystemSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    // Verify the system belongs to this user's home.
    const system = await getSystem(data.systemId);
    if (!system || system.homeId !== home.id) {
      throw new Error("System not found or access denied");
    }

    await deleteSystem(data.systemId);
    return { success: true };
  });

// ──────────────────────────────────────────────────────────────────────────────
// Sub-units
// ──────────────────────────────────────────────────────────────────────────────

const listSystemUnitsSchema = z.object({
  systemId: z.string().uuid(),
});

/**
 * List all sub-units for a system.
 */
export const listSystemUnitsFn = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => listSystemUnitsSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) return [];

    // Verify the system belongs to this user's home.
    const system = await getSystem(data.systemId);
    if (!system || system.homeId !== home.id) {
      throw new Error("System not found or access denied");
    }

    return listSystemUnits(data.systemId);
  });

const createSystemUnitSchema = z.object({
  systemId: z.string().uuid(),
  name: z.string().min(1, "Unit name is required"),
});

/**
 * Create a new sub-unit within a system.
 */
export const createSystemUnitFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => createSystemUnitSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    // Verify the system belongs to this user's home.
    const system = await getSystem(data.systemId);
    if (!system || system.homeId !== home.id) {
      throw new Error("System not found or access denied");
    }

    return createSystemUnit(data.systemId, data.name);
  });

const updateSystemUnitSchema = z.object({
  unitId: z.string().uuid(),
  name: z.string().min(1, "Unit name is required").optional(),
});

/**
 * Update a sub-unit's details.
 */
export const updateSystemUnitFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => updateSystemUnitSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    // Verify the unit belongs to a system in this user's home.
    const unit = await getSystemUnit(data.unitId);
    if (!unit) throw new Error("Unit not found");

    const system = await getSystem(unit.systemId);
    if (!system || system.homeId !== home.id) {
      throw new Error("Unit not found or access denied");
    }

    const updates: { name?: string } = {};
    if (data.name !== undefined) updates.name = data.name;

    return updateSystemUnit(data.unitId, updates);
  });

const deleteSystemUnitSchema = z.object({
  unitId: z.string().uuid(),
});

/**
 * Delete a sub-unit.
 */
export const deleteSystemUnitFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => deleteSystemUnitSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    // Verify the unit belongs to a system in this user's home.
    const unit = await getSystemUnit(data.unitId);
    if (!unit) throw new Error("Unit not found");

    const system = await getSystem(unit.systemId);
    if (!system || system.homeId !== home.id) {
      throw new Error("Unit not found or access denied");
    }

    await deleteSystemUnit(data.unitId);
    return { success: true };
  });
