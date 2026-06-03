import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { getOrCreateHome, getHome } from "@/lib/home";

// Mock the db client module.
vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/db/client";

const mockGetDb = vi.mocked(getDb);

describe("getOrCreateHome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing home when one exists", async () => {
    const existingHome = {
      id: "home-123",
      userId: "user-456",
      name: null,
      address: null,
      yearBuilt: null,
      sqft: null,
      lotSize: null,
      bedCount: null,
      bathCount: null,
      purchasePrice: null,
      purchaseDate: null,
      soldAt: null,
      salePrice: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      query: {
        homes: {
          findFirst: vi.fn().mockResolvedValue(existingHome),
        },
      },
      insert: vi.fn(),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getOrCreateHome("user-456");

    expect(result).toEqual(existingHome);
    expect(mockDb.query.homes.findFirst).toHaveBeenCalledWith({
      where: expect.any(Object),
    });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("creates a new home when none exists", async () => {
    const newHome = {
      id: "home-789",
      userId: "user-456",
      name: null,
      address: null,
      yearBuilt: null,
      sqft: null,
      lotSize: null,
      bedCount: null,
      bathCount: null,
      purchasePrice: null,
      purchaseDate: null,
      soldAt: null,
      salePrice: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      query: {
        homes: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newHome]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getOrCreateHome("user-456");

    expect(result).toEqual(newHome);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("handles race condition by re-fetching on insert failure", async () => {
    const existingHome = {
      id: "home-123",
      userId: "user-456",
      name: null,
      address: null,
      yearBuilt: null,
      sqft: null,
      lotSize: null,
      bedCount: null,
      bathCount: null,
      purchasePrice: null,
      purchaseDate: null,
      soldAt: null,
      salePrice: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      query: {
        homes: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce(null) // First call: no home
            .mockResolvedValueOnce(existingHome), // Second call after race: home exists
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("unique constraint")),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getOrCreateHome("user-456");

    expect(result).toEqual(existingHome);
    expect(mockDb.query.homes.findFirst).toHaveBeenCalledTimes(2);
  });
});

describe("getHome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns home when one exists", async () => {
    const existingHome = {
      id: "home-123",
      userId: "user-456",
      name: null,
      address: null,
      yearBuilt: null,
      sqft: null,
      lotSize: null,
      bedCount: null,
      bathCount: null,
      purchasePrice: null,
      purchaseDate: null,
      soldAt: null,
      salePrice: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      query: {
        homes: {
          findFirst: vi.fn().mockResolvedValue(existingHome),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getHome("user-456");

    expect(result).toEqual(existingHome);
  });

  it("returns null when no home exists", async () => {
    const mockDb = {
      query: {
        homes: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getHome("user-456");

    expect(result).toBeNull();
  });
});
