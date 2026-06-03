/**
 * Home module — the single property a user has claimed.
 *
 * One user, one home. The home is auto-created on first sign-in via a
 * database hook in `src/lib/auth/server.ts`. Subsequent sign-ins reuse the
 * existing home. All property facts are optional and filled in later.
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { homes } from "@/db/schema";

/**
 * Fetch the home for a user, or create one if it doesn't exist.
 *
 * Idempotent — safe to call on every sign-in. The `userId` column has a
 * unique constraint, so concurrent creates will fail on the second attempt;
 * we catch that and re-fetch.
 */
export async function getOrCreateHome(userId: string) {
  const db = await getDb();
  const existing = await db.query.homes.findFirst({
    where: eq(homes.userId, userId),
  });
  if (existing) return existing;

  try {
    const [created] = await db.insert(homes).values({ userId }).returning();
    return created;
  } catch (err) {
    // Race condition: another request created the home between our
    // findFirst and insert. Re-fetch and return.
    const retry = await db.query.homes.findFirst({
      where: eq(homes.userId, userId),
    });
    if (retry) return retry;
    throw err;
  }
}

/**
 * Fetch the home for a user, or null if none exists.
 */
export async function getHome(userId: string) {
  const db = await getDb();
  return db.query.homes.findFirst({
    where: eq(homes.userId, userId),
  });
}
