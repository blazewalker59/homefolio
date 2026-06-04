/**
 * Server functions for global search.
 *
 * These run on the server only (TanStack Start strips the `"use server"`
 * body from client bundles). They provide a unified search interface across
 * all entities in the user's home.
 *
 * Authentication: `requireSessionUser()` reads the Better Auth session
 * from request cookies and throws if the caller is anonymous.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getHome } from "@/lib/home";
import { searchHome } from "@/lib/search";
import { requireSessionUser } from "@/lib/auth/session";

const searchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
});

/**
 * Search across all entities in the current user's home.
 *
 * Returns results grouped by entity type (rooms, systems, items, documents, activities).
 */
export const searchFn = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => searchSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home)
      return { rooms: [], systems: [], items: [], documents: [], activities: [], total: 0 };

    return searchHome(home.id, data.query);
  });
