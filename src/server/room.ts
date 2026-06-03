/**
 * Server functions for room management.
 *
 * These run on the server only (TanStack Start strips the `"use server"`
 * body from client bundles). They are the single write path into the
 * `rooms` table, so business rules (category validation, orphan protection)
 * live here rather than scattered across the UI.
 *
 * Authentication: `requireSessionUser()` reads the Better Auth session
 * from request cookies and throws if the caller is anonymous.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getHome } from "@/lib/home";
import { createRoom, listRooms, updateRoom, deleteRoom, getRoom } from "@/lib/room";
import { requireSessionUser } from "@/lib/auth/session";
import { ROOM_CATEGORIES } from "@/lib/room-categories";

/**
 * List all rooms for the current user's home.
 */
export const listRoomsFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSessionUser();
  const home = await getHome(user.id);
  if (!home) return [];
  return listRooms(home.id);
});

const createRoomSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  category: z.enum(ROOM_CATEGORIES.map((c) => c.key) as [string, ...string[]]),
});

/**
 * Create a new room in the current user's home.
 */
export const createRoomFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => createRoomSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    return createRoom(home.id, data.name, data.category);
  });

const updateRoomSchema = z.object({
  roomId: z.string().uuid(),
  name: z.string().min(1, "Room name is required").optional(),
  category: z.enum(ROOM_CATEGORIES.map((c) => c.key) as [string, ...string[]]).optional(),
});

/**
 * Update a room's details.
 */
export const updateRoomFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => updateRoomSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    // Verify the room belongs to this user's home.
    const room = await getRoom(data.roomId);
    if (!room || room.homeId !== home.id) {
      throw new Error("Room not found or access denied");
    }

    const updates: { name?: string; category?: string } = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.category !== undefined) updates.category = data.category;

    return updateRoom(data.roomId, updates);
  });

const deleteRoomSchema = z.object({
  roomId: z.string().uuid(),
});

/**
 * Delete a room. Throws if the room contains items or documents
 * (orphan protection).
 */
export const deleteRoomFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => deleteRoomSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    // Verify the room belongs to this user's home.
    const room = await getRoom(data.roomId);
    if (!room || room.homeId !== home.id) {
      throw new Error("Room not found or access denied");
    }

    await deleteRoom(data.roomId);
    return { success: true };
  });
