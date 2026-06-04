/**
 * Search module — global search across all entities in a home.
 *
 * Provides a unified search interface that queries Rooms, Systems, Items,
 * Documents, and Activities using case-insensitive pattern matching.
 *
 * Search is scoped to a single home and returns results grouped by entity type.
 */

import { and, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { rooms, systems, items, documents, activities, itemTemplates } from "@/db/schema";

export interface SearchResult {
  id: string;
  type: "room" | "system" | "item" | "document" | "activity";
  name: string;
  description?: string;
  url: string;
}

export interface SearchResults {
  rooms: SearchResult[];
  systems: SearchResult[];
  items: SearchResult[];
  documents: SearchResult[];
  activities: SearchResult[];
  total: number;
}

/**
 * Search across all entities in a home.
 *
 * Uses case-insensitive pattern matching (ILIKE) to find matches in:
 * - Rooms: name
 * - Systems: name
 * - Items: name
 * - Documents: filename, notes
 * - Activities: description, notes
 *
 * Results are grouped by entity type and include URLs for navigation.
 */
export async function searchHome(homeId: string, query: string): Promise<SearchResults> {
  const db = await getDb();
  const pattern = `%${query}%`;

  // Search rooms
  const roomResults = await db
    .select({
      id: rooms.id,
      name: rooms.name,
      category: rooms.category,
    })
    .from(rooms)
    .where(and(eq(rooms.homeId, homeId), ilike(rooms.name, pattern)))
    .limit(20);

  // Search systems
  const systemResults = await db
    .select({
      id: systems.id,
      name: systems.name,
    })
    .from(systems)
    .where(and(eq(systems.homeId, homeId), ilike(systems.name, pattern)))
    .limit(20);

  // Search items (join with template to get category)
  const itemResults = await db
    .select({
      id: items.id,
      name: items.name,
      category: itemTemplates.category,
    })
    .from(items)
    .innerJoin(itemTemplates, eq(items.templateId, itemTemplates.id))
    .where(and(eq(items.homeId, homeId), ilike(items.name, pattern)))
    .limit(20);

  // Search documents
  const documentResults = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      notes: documents.notes,
    })
    .from(documents)
    .where(
      and(
        eq(documents.homeId, homeId),
        or(ilike(documents.filename, pattern), ilike(documents.notes, pattern)),
      ),
    )
    .limit(20);

  // Search activities
  const activityResults = await db
    .select({
      id: activities.id,
      description: activities.description,
      notes: activities.notes,
    })
    .from(activities)
    .where(
      and(
        eq(activities.homeId, homeId),
        or(ilike(activities.description, pattern), ilike(activities.notes, pattern)),
      ),
    )
    .limit(20);

  // Transform results to unified format
  const roomSearchResults: SearchResult[] = roomResults.map((r) => ({
    id: r.id,
    type: "room" as const,
    name: r.name,
    description: r.category,
    url: `/rooms`,
  }));

  const systemSearchResults: SearchResult[] = systemResults.map((s) => ({
    id: s.id,
    type: "system" as const,
    name: s.name,
    url: `/systems`,
  }));

  const itemSearchResults: SearchResult[] = itemResults.map((i) => ({
    id: i.id,
    type: "item" as const,
    name: i.name,
    description: i.category,
    url: `/items`,
  }));

  const documentSearchResults: SearchResult[] = documentResults.map((d) => ({
    id: d.id,
    type: "document" as const,
    name: d.filename,
    description: d.notes || undefined,
    url: `/documents`,
  }));

  const activitySearchResults: SearchResult[] = activityResults.map((a) => ({
    id: a.id,
    type: "activity" as const,
    name: a.description,
    description: a.notes || undefined,
    url: `/activities`,
  }));

  const total =
    roomSearchResults.length +
    systemSearchResults.length +
    itemSearchResults.length +
    documentSearchResults.length +
    activitySearchResults.length;

  return {
    rooms: roomSearchResults,
    systems: systemSearchResults,
    items: itemSearchResults,
    documents: documentSearchResults,
    activities: activitySearchResults,
    total,
  };
}
