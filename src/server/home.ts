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
import { ensureStorageProvider, generateStorageKey } from "@/lib/storage";
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

/**
 * Home + total-invested in a single round trip, for the app shell sidebar.
 *
 * Folds what used to be two server-function calls (getHomeFn +
 * getTotalInvestedFn, each re-fetching the home) into one request.
 */
export const getHomeOverviewFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSessionUser();
  const home = await getHome(user.id);
  if (!home) return { home: null, totalInvested: 0 };
  const totalInvested = await calculateTotalInvested(home.id, home.purchasePrice);
  return { home, totalInvested };
});

const uploadHomePhotoSchema = z.object({
  fileContent: z.string(), // base64-encoded image bytes
  mimeType: z.string(),
  filename: z.string(),
});

/**
 * Upload (or replace) the home's hero photo. Stores the image via the storage
 * provider and records its key + content type on the home. Any previous photo
 * file is removed from storage.
 */
export const uploadHomePhotoFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => uploadHomePhotoSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    const bytes = Uint8Array.from(atob(data.fileContent), (c) => c.charCodeAt(0));
    const storage = await ensureStorageProvider();
    const key = generateStorageKey(home.id, "home-photo", home.id, data.filename);
    await storage.upload(key, bytes, data.mimeType);

    if (home.photoStorageKey && home.photoStorageKey !== key) {
      try {
        await storage.delete(home.photoStorageKey);
      } catch {
        // Best-effort cleanup; a leftover old file is non-fatal.
      }
    }

    await updateHome(home.id, { photoStorageKey: key, photoContentType: data.mimeType });
    return { success: true };
  });

/**
 * Remove the home's hero photo (clears the columns and deletes the file).
 */
export const removeHomePhotoFn = createServerFn({ method: "POST" }).handler(async () => {
  const user = await requireSessionUser();
  const home = await getHome(user.id);
  if (!home) throw new Error("No home found for this user");

  if (home.photoStorageKey) {
    const storage = await ensureStorageProvider();
    try {
      await storage.delete(home.photoStorageKey);
    } catch {
      // Best-effort cleanup.
    }
  }

  await updateHome(home.id, { photoStorageKey: null, photoContentType: null });
  return { success: true };
});
