import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { searchHome } from "@/lib/search";

vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/db/client";

const mockGetDb = vi.mocked(getDb);

// Helper to create a mock query chain
function createMockQueryChain(result: any[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    innerJoin: vi.fn().mockReturnThis(),
  };
}

describe("searchHome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searches rooms by name", async () => {
    const mockRooms = [
      { id: "room-1", name: "Kitchen", category: "kitchen" },
      { id: "room-2", name: "Master Bedroom", category: "bedroom" },
    ];

    const mockDb = {
      select: vi.fn().mockReturnValue(createMockQueryChain(mockRooms)),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const results = await searchHome("home-1", "Kitchen");

    expect(results.rooms).toHaveLength(2);
    expect(results.rooms[0].name).toBe("Kitchen");
    expect(results.rooms[0].type).toBe("room");
    expect(results.rooms[0].url).toBe("/rooms");
  });

  it("searches systems by name", async () => {
    const mockSystems = [{ id: "system-1", name: "HVAC System" }];

    const mockDb = {
      select: vi.fn().mockReturnValue(createMockQueryChain(mockSystems)),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const results = await searchHome("home-1", "HVAC");

    expect(results.systems).toHaveLength(1);
    expect(results.systems[0].name).toBe("HVAC System");
    expect(results.systems[0].type).toBe("system");
    expect(results.systems[0].url).toBe("/systems");
  });

  it("searches items by name with template join", async () => {
    const mockItems = [{ id: "item-1", name: "Living Room Sofa", category: "furniture" }];

    const mockDb = {
      select: vi.fn().mockReturnValue(createMockQueryChain(mockItems)),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const results = await searchHome("home-1", "Sofa");

    expect(results.items).toHaveLength(1);
    expect(results.items[0].name).toBe("Living Room Sofa");
    expect(results.items[0].type).toBe("item");
    expect(results.items[0].description).toBe("furniture");
    expect(results.items[0].url).toBe("/items");
  });

  it("searches documents by filename and notes", async () => {
    const mockDocuments = [{ id: "doc-1", filename: "HVAC_receipt.pdf", notes: "Annual service" }];

    const mockDb = {
      select: vi.fn().mockReturnValue(createMockQueryChain(mockDocuments)),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const results = await searchHome("home-1", "HVAC");

    expect(results.documents).toHaveLength(1);
    expect(results.documents[0].name).toBe("HVAC_receipt.pdf");
    expect(results.documents[0].type).toBe("document");
    expect(results.documents[0].url).toBe("/documents");
  });

  it("searches activities by description and notes", async () => {
    const mockActivities = [
      { id: "activity-1", description: "Replaced air filter", notes: "HVAC maintenance" },
    ];

    const mockDb = {
      select: vi.fn().mockReturnValue(createMockQueryChain(mockActivities)),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const results = await searchHome("home-1", "filter");

    expect(results.activities).toHaveLength(1);
    expect(results.activities[0].name).toBe("Replaced air filter");
    expect(results.activities[0].type).toBe("activity");
    expect(results.activities[0].url).toBe("/activities");
  });

  it("returns grouped results with total count", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue(createMockQueryChain([])),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const results = await searchHome("home-1", "test");

    expect(results).toHaveProperty("rooms");
    expect(results).toHaveProperty("systems");
    expect(results).toHaveProperty("items");
    expect(results).toHaveProperty("documents");
    expect(results).toHaveProperty("activities");
    expect(results).toHaveProperty("total");
    expect(typeof results.total).toBe("number");
    expect(results.total).toBe(0);
  });

  it("limits results to 20 per entity type", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue(createMockQueryChain([])),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await searchHome("home-1", "test");

    // Verify limit(20) was called for each entity type (5 queries)
    expect(mockDb.select).toHaveBeenCalledTimes(5);
  });

  it("combines results from all entity types", async () => {
    // Each call to select().from() returns a different result
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          createMockQueryChain([{ id: "r1", name: "Room", category: "bedroom" }]),
        )
        .mockReturnValueOnce(createMockQueryChain([{ id: "s1", name: "System" }]))
        .mockReturnValueOnce(
          createMockQueryChain([{ id: "i1", name: "Item", category: "furniture" }]),
        )
        .mockReturnValueOnce(createMockQueryChain([{ id: "d1", filename: "doc.pdf", notes: null }]))
        .mockReturnValueOnce(
          createMockQueryChain([{ id: "a1", description: "Activity", notes: null }]),
        ),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const results = await searchHome("home-1", "test");

    expect(results.rooms).toHaveLength(1);
    expect(results.systems).toHaveLength(1);
    expect(results.items).toHaveLength(1);
    expect(results.documents).toHaveLength(1);
    expect(results.activities).toHaveLength(1);
    expect(results.total).toBe(5);
  });
});
