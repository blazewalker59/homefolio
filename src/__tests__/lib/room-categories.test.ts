import { describe, it, expect } from "vite-plus/test";
import { ROOM_CATEGORIES, getRoomCategory, isValidRoomCategory } from "@/lib/room-categories";

describe("ROOM_CATEGORIES", () => {
  it("has bedroom category", () => {
    const bedroom = ROOM_CATEGORIES.find((c) => c.key === "bedroom");
    expect(bedroom).toBeDefined();
    expect(bedroom?.label).toBe("Bedroom");
  });

  it("has other category", () => {
    const other = ROOM_CATEGORIES.find((c) => c.key === "other");
    expect(other).toBeDefined();
  });

  it("all categories have unique keys", () => {
    const keys = ROOM_CATEGORIES.map((c) => c.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});

describe("getRoomCategory", () => {
  it("returns category for valid key", () => {
    const result = getRoomCategory("kitchen");
    expect(result).toBeDefined();
    expect(result?.label).toBe("Kitchen");
  });

  it("returns undefined for invalid key", () => {
    const result = getRoomCategory("nonexistent");
    expect(result).toBeUndefined();
  });
});

describe("isValidRoomCategory", () => {
  it("returns true for valid category", () => {
    expect(isValidRoomCategory("bathroom")).toBe(true);
  });

  it("returns false for invalid category", () => {
    expect(isValidRoomCategory("invalid_category")).toBe(false);
  });
});
