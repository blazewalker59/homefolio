/**
 * Server functions for blueprint shapes.
 *
 * The single write path into the `shapes` table. Every call verifies that the
 * target floor/shape belongs to the caller's home before touching it.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getHome } from "@/lib/home";
import { getFloor } from "@/lib/floor";
import {
  createShape,
  listShapesByFloor,
  getShape,
  updateShape,
  deleteShape,
  linkShapeRoom,
} from "@/lib/shape";
import { createRoom, getRoom } from "@/lib/room";
import { requireSessionUser } from "@/lib/auth/session";
import { ROOM_CATEGORIES } from "@/lib/room-categories";

const pointSchema = z.object({ x: z.number(), y: z.number() });
const pointsSchema = z.array(pointSchema).min(3, "A shape needs at least 3 points");

async function requireHome() {
  const user = await requireSessionUser();
  const home = await getHome(user.id);
  if (!home) throw new Error("No home found for this user");
  return home;
}

async function requireOwnedFloor(homeId: string, floorId: string) {
  const floor = await getFloor(floorId);
  if (!floor || floor.homeId !== homeId) {
    throw new Error("Floor not found or access denied");
  }
  return floor;
}

const listShapesSchema = z.object({ floorId: z.string().uuid() });

/**
 * List the shapes on a floor of the current user's home.
 */
export const listShapesFn = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => listShapesSchema.parse(raw))
  .handler(async ({ data }) => {
    const home = await requireHome();
    await requireOwnedFloor(home.id, data.floorId);
    return listShapesByFloor(data.floorId);
  });

const createShapeSchema = z.object({
  floorId: z.string().uuid(),
  points: pointsSchema,
  label: z.string().optional(),
  color: z.string().optional(),
});

/**
 * Create a shape on a floor.
 */
export const createShapeFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => createShapeSchema.parse(raw))
  .handler(async ({ data }) => {
    const home = await requireHome();
    await requireOwnedFloor(home.id, data.floorId);
    return createShape({
      homeId: home.id,
      floorId: data.floorId,
      points: data.points,
      label: data.label ?? null,
      color: data.color ?? null,
    });
  });

const updateShapeSchema = z.object({
  shapeId: z.string().uuid(),
  points: pointsSchema.optional(),
  label: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  z: z.number().int().optional(),
});

/**
 * Update a shape's geometry/presentation. This is the autosave target.
 */
export const updateShapeFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => updateShapeSchema.parse(raw))
  .handler(async ({ data }) => {
    const home = await requireHome();
    const shape = await getShape(data.shapeId);
    if (!shape || shape.homeId !== home.id) {
      throw new Error("Shape not found or access denied");
    }
    const { shapeId, ...updates } = data;
    return updateShape(shapeId, updates);
  });

const setShapeRoomSchema = z.object({
  shapeId: z.string().uuid(),
  roomId: z.string().uuid().nullable(),
});

/**
 * Link a shape to an existing room, or unlink it (roomId = null). Enforces
 * that the target room belongs to this home and isn't already placed.
 */
export const setShapeRoomFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => setShapeRoomSchema.parse(raw))
  .handler(async ({ data }) => {
    const home = await requireHome();
    const shape = await getShape(data.shapeId);
    if (!shape || shape.homeId !== home.id) {
      throw new Error("Shape not found or access denied");
    }
    if (data.roomId) {
      const room = await getRoom(data.roomId);
      if (!room || room.homeId !== home.id) {
        throw new Error("Room not found or access denied");
      }
    }
    return linkShapeRoom(data.shapeId, data.roomId);
  });

const createRoomForShapeSchema = z.object({
  shapeId: z.string().uuid(),
  name: z.string().min(1, "Room name is required"),
  category: z.enum(ROOM_CATEGORIES.map((c) => c.key) as [string, ...string[]]),
});

/**
 * Create a new room and link it to a shape in one step. Returns both the new
 * room and the updated shape.
 */
export const createRoomForShapeFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => createRoomForShapeSchema.parse(raw))
  .handler(async ({ data }) => {
    const home = await requireHome();
    const shape = await getShape(data.shapeId);
    if (!shape || shape.homeId !== home.id) {
      throw new Error("Shape not found or access denied");
    }
    const room = await createRoom(home.id, data.name, data.category);
    const updatedShape = await linkShapeRoom(data.shapeId, room.id);
    return { room, shape: updatedShape };
  });

const deleteShapeSchema = z.object({ shapeId: z.string().uuid() });

/**
 * Delete a shape.
 */
export const deleteShapeFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => deleteShapeSchema.parse(raw))
  .handler(async ({ data }) => {
    const home = await requireHome();
    const shape = await getShape(data.shapeId);
    if (!shape || shape.homeId !== home.id) {
      throw new Error("Shape not found or access denied");
    }
    await deleteShape(data.shapeId);
    return { success: true };
  });
