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
import { calculateReceiptTotal } from "@/lib/document";

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

/**
 * Update a home's details.
 *
 * Accepts partial updates — only the provided fields are changed. The
 * `updatedAt` timestamp is automatically set to now.
 */
export async function updateHome(
  homeId: string,
  updates: {
    name?: string | null;
    address?: string | null;
    yearBuilt?: number | null;
    sqft?: number | null;
    lotSize?: string | null;
    bedCount?: number | null;
    bathCount?: number | null;
    purchasePrice?: string | null;
    purchaseDate?: Date | null;
  },
) {
  const db = await getDb();
  const [updated] = await db
    .update(homes)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(homes.id, homeId))
    .returning();
  return updated;
}

/**
 * Calculate the total amount invested in the home.
 *
 * Total Invested = purchase price + sum of all receipt amounts.
 */
export async function calculateTotalInvested(
  homeId: string,
  purchasePrice?: string | null,
): Promise<number> {
  const receiptTotal = await calculateReceiptTotal(homeId);
  const purchaseAmount = purchasePrice ? parseFloat(purchasePrice) : 0;
  return purchaseAmount + receiptTotal;
}
