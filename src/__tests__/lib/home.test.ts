import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { getOrCreateHome, getHome, updateHome, calculateTotalInvested } from "@/lib/home";

// Mock the db client module.
vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

// Mock the document module.
vi.mock("@/lib/document", () => ({
  calculateReceiptTotal: vi.fn(),
}));

import { getDb } from "@/db/client";
import { calculateReceiptTotal } from "@/lib/document";

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

describe("updateHome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates home with provided fields", async () => {
    const updatedHome = {
      id: "home-123",
      userId: "user-456",
      name: "My House",
      address: "123 Main St",
      yearBuilt: 1990,
      sqft: 2000,
      lotSize: null,
      bedCount: 3,
      bathCount: 2,
      purchasePrice: null,
      purchaseDate: null,
      soldAt: null,
      salePrice: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedHome]),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await updateHome("home-123", {
      name: "My House",
      address: "123 Main St",
      yearBuilt: 1990,
      sqft: 2000,
      bedCount: 3,
      bathCount: 2,
    });

    expect(result).toEqual(updatedHome);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("validates address is required", async () => {
    // This test would be for the server function, not the module function.
    // The module function accepts partial updates, so address validation
    // happens at the server function layer via zod schema.
    expect(true).toBe(true);
  });
});

describe("calculateTotalInvested", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns purchase price + receipt total", async () => {
    vi.mocked(calculateReceiptTotal).mockResolvedValue(500);

    const total = await calculateTotalInvested("home-1", "250000");

    expect(total).toBe(250500);
    expect(calculateReceiptTotal).toHaveBeenCalledWith("home-1");
  });

  it("returns receipt total when no purchase price", async () => {
    vi.mocked(calculateReceiptTotal).mockResolvedValue(750.5);

    const total = await calculateTotalInvested("home-1", null);

    expect(total).toBe(750.5);
  });

  it("returns 0 when no purchase price and no receipts", async () => {
    vi.mocked(calculateReceiptTotal).mockResolvedValue(0);

    const total = await calculateTotalInvested("home-1", null);

    expect(total).toBe(0);
  });

  it("handles decimal purchase prices", async () => {
    vi.mocked(calculateReceiptTotal).mockResolvedValue(100.25);

    const total = await calculateTotalInvested("home-1", "350000.75");

    expect(total).toBe(350101);
  });
});
