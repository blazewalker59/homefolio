/**
 * Server functions for the home.
 *
 * These run on the server only (TanStack Start strips the `"use server"`
 * body from client bundles). They are the single write path into the
 * `homes` table, so business rules live here rather than scattered across
 * the UI.
 *
 * Authentication: `requireSessionUser()` reads the Better Auth session
 * from request cookies and throws if the caller is anonymous.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getHome, updateHome, calculateTotalInvested } from "@/lib/home";
import { requireSessionUser } from "@/lib/auth/session";

/**
 * Fetch the current user's home. Used by the dashboard loader to decide
 * whether to redirect to /setup or render the overview.
 */
export const getHomeFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSessionUser();
  return getHome(user.id);
});

const updateHomeSchema = z.object({
  name: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  yearBuilt: z.number().nullable().optional(),
  sqft: z.number().nullable().optional(),
  lotSize: z.string().nullable().optional(),
  bedCount: z.number().nullable().optional(),
  bathCount: z.number().nullable().optional(),
  purchasePrice: z.string().nullable().optional(),
  purchaseDate: z.string().nullable().optional(),
});

/**
 * Update the current user's home with the provided fields.
 *
 * Requires authentication. Returns the updated home or null if the user
 * has no home (shouldn't happen since homes are auto-created on sign-in).
 */
export const updateHomeFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => updateHomeSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) return null;

    const updates = {
      ...data,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
    };

    return updateHome(home.id, updates);
  });

/**
 * Get the total amount invested in the home.
 *
 * Total Invested = purchase price + sum of all receipt amounts.
 */
export const getTotalInvestedFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSessionUser();
  const home = await getHome(user.id);
  if (!home) return 0;
  return calculateTotalInvested(home.id, home.purchasePrice);
});
