/**
 * Shape module — CRUD operations for blueprint shapes.
 *
 * A Shape is a polygon drawn on one Floor of the Blueprint, stored as an array
 * of vertices in abstract grid units. Shapes optionally link 1:1 to a Room
 * (enforced by a partial unique index on `room_id`). This slice covers
 * geometry only — room linking arrives in a later slice.
 */

import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { shapes } from "@/db/schema";
import type { ShapePoint } from "@/db/schema";

function assertValidPoints(points: ShapePoint[]) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new Error("A shape needs at least 3 points");
  }
}

/**
 * Create a shape on a floor. Caller is responsible for verifying the floor
 * belongs to the home (server layer does this).
 */
export async function createShape(input: {
  homeId: string;
  floorId: string;
  points: ShapePoint[];
  label?: string | null;
  color?: string | null;
  z?: number;
}) {
  assertValidPoints(input.points);
  const db = await getDb();
  const [created] = await db
    .insert(shapes)
    .values({
      homeId: input.homeId,
      floorId: input.floorId,
      points: input.points,
      label: input.label ?? null,
      color: input.color ?? null,
      z: input.z ?? 0,
    })
    .returning();
  return created;
}

/**
 * List all shapes on a floor, ordered by z then creation.
 */
export async function listShapesByFloor(floorId: string) {
  const db = await getDb();
  return db
    .select()
    .from(shapes)
    .where(eq(shapes.floorId, floorId))
    .orderBy(shapes.z, shapes.createdAt);
}

/**
 * Fetch a single shape by ID.
 */
export async function getShape(shapeId: string) {
  const db = await getDb();
  return db.query.shapes.findFirst({ where: eq(shapes.id, shapeId) });
}

/**
 * Update a shape's geometry/presentation. Only provided fields change.
 */
export async function updateShape(
  shapeId: string,
  updates: { points?: ShapePoint[]; label?: string | null; color?: string | null; z?: number },
) {
  if (updates.points !== undefined) assertValidPoints(updates.points);

  const db = await getDb();
  const [updated] = await db
    .update(shapes)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(shapes.id, shapeId))
    .returning();
  return updated;
}

/**
 * Find the shape currently linked to a room, if any. Used to enforce the
 * 1 Room ↔ 1 Shape rule with a friendly error before hitting the DB's partial
 * unique index.
 */
export async function findShapeByRoom(roomId: string) {
  const db = await getDb();
  return db.query.shapes.findFirst({ where: eq(shapes.roomId, roomId) });
}

/**
 * Link a shape to a room (or unlink with `null`). Enforces that a room is
 * placed on at most one shape.
 */
export async function linkShapeRoom(shapeId: string, roomId: string | null) {
  const db = await getDb();

  if (roomId) {
    const existing = await db.query.shapes.findFirst({
      where: and(eq(shapes.roomId, roomId), ne(shapes.id, shapeId)),
    });
    if (existing) {
      throw new Error("That room is already placed on the blueprint");
    }
  }

  const [updated] = await db
    .update(shapes)
    .set({ roomId, updatedAt: new Date() })
    .where(eq(shapes.id, shapeId))
    .returning();
  return updated;
}

/**
 * Delete a shape.
 */
export async function deleteShape(shapeId: string): Promise<void> {
  const db = await getDb();
  await db.delete(shapes).where(eq(shapes.id, shapeId));
}
