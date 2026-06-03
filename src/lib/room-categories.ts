/**
 * Room categories — a configurable list of room types.
 *
 * Each category has a stable key (used in the DB `category` column),
 * a display label, and an optional description shown in the UI.
 *
 * This module is the single source of truth for valid room categories.
 * Future slices may load categories from an admin table or allow custom
 * categories, but for v1 this static list is sufficient.
 */

export interface RoomCategory {
  key: string;
  label: string;
  description: string;
}

export const ROOM_CATEGORIES: ReadonlyArray<RoomCategory> = [
  { key: "bedroom", label: "Bedroom", description: "Sleeping quarters" },
  { key: "bathroom", label: "Bathroom", description: "Full or half bath" },
  { key: "kitchen", label: "Kitchen", description: "Cooking and food prep area" },
  { key: "living_room", label: "Living Room", description: "Main gathering space" },
  { key: "dining_room", label: "Dining Room", description: "Formal eating area" },
  { key: "family_room", label: "Family Room", description: "Casual gathering space" },
  { key: "office", label: "Office", description: "Work or study space" },
  { key: "laundry_room", label: "Laundry Room", description: "Washer/dryer area" },
  { key: "garage", label: "Garage", description: "Vehicle or storage space" },
  { key: "basement", label: "Basement", description: "Below-grade space" },
  { key: "attic", label: "Attic", description: "Above-ceiling storage or living space" },
  { key: "closet", label: "Closet", description: "Storage space" },
  { key: "pantry", label: "Pantry", description: "Food storage area" },
  { key: "mudroom", label: "Mudroom", description: "Entry area for coats and shoes" },
  { key: "hallway", label: "Hallway", description: "Connecting corridor" },
  { key: "porch", label: "Porch", description: "Covered outdoor entry" },
  { key: "patio", label: "Patio", description: "Outdoor living space" },
  { key: "workshop", label: "Workshop", description: "DIY or craft space" },
  { key: "guest_room", label: "Guest Room", description: "Visitor sleeping space" },
  { key: "nursery", label: "Nursery", description: "Infant or toddler room" },
  { key: "playroom", label: "Playroom", description: "Children's activity space" },
  { key: "media_room", label: "Media Room", description: "TV or entertainment space" },
  { key: "gym", label: "Gym", description: "Exercise or fitness space" },
  { key: "storage", label: "Storage", description: "General storage area" },
  { key: "utility_room", label: "Utility Room", description: "Mechanical or HVAC space" },
  { key: "other", label: "Other", description: "Uncategorized space" },
] as const;

/**
 * Look up a category by its key. Returns undefined for unknown keys.
 */
export function getRoomCategory(key: string): RoomCategory | undefined {
  return ROOM_CATEGORIES.find((c) => c.key === key);
}

/**
 * Validate that a category key is in the known list.
 */
export function isValidRoomCategory(key: string): boolean {
  return ROOM_CATEGORIES.some((c) => c.key === key);
}
