import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  createSystem,
  listSystems,
  getSystem,
  updateSystem,
  deleteSystem,
  canDeleteSystem,
  createSystemUnit,
  listSystemUnits,
  getSystemUnit,
  updateSystemUnit,
  deleteSystemUnit,
} from "@/lib/system";

// Mock the db client module.
vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/db/client";

const mockGetDb = vi.mocked(getDb);

describe("createSystem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a system", async () => {
    const createdSystem = {
      id: "system-123",
      homeId: "home-456",
      name: "HVAC",
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdSystem]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await createSystem("home-456", "HVAC");

    expect(result).toEqual(createdSystem);
    expect(mockDb.insert).toHaveBeenCalled();
  });
});

describe("listSystems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns systems ordered by sortOrder then name", async () => {
    const mockSystems = [
      { id: "system-1", homeId: "home-456", name: "Electrical", sortOrder: 0 },
      { id: "system-2", homeId: "home-456", name: "HVAC", sortOrder: 1 },
    ];

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockSystems),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await listSystems("home-456");

    expect(result).toEqual(mockSystems);
  });
});

describe("getSystem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a system by id", async () => {
    const mockSystem = {
      id: "system-123",
      homeId: "home-456",
      name: "HVAC",
      sortOrder: 0,
    };

    const mockDb = {
      query: {
        systems: {
          findFirst: vi.fn().mockResolvedValue(mockSystem),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getSystem("system-123");

    expect(result).toEqual(mockSystem);
  });

  it("returns null when system not found", async () => {
    const mockDb = {
      query: {
        systems: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getSystem("nonexistent");

    expect(result).toBeNull();
  });
});

describe("updateSystem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates system name", async () => {
    const updatedSystem = {
      id: "system-123",
      homeId: "home-456",
      name: "New Name",
      sortOrder: 0,
      updatedAt: new Date(),
    };

    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedSystem]),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await updateSystem("system-123", { name: "New Name" });

    expect(result).toEqual(updatedSystem);
  });
});

describe("canDeleteSystem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns canDelete: true when system has no units", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await canDeleteSystem("system-123");

    expect(result).toEqual({ canDelete: true });
  });

  it("returns canDelete: false when system has units", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "unit-1" }]),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await canDeleteSystem("system-123");

    expect(result).toEqual({
      canDelete: false,
      reason: "This system contains sub-units. Remove them first.",
    });
  });
});

describe("deleteSystem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes an empty system", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await deleteSystem("system-123");

    expect(mockDb.delete).toHaveBeenCalled();
  });

  it("throws when system has units", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "unit-1" }]),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await expect(deleteSystem("system-123")).rejects.toThrow(
      "This system contains sub-units. Remove them first.",
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Sub-units
// ──────────────────────────────────────────────────────────────────────────────

describe("createSystemUnit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a unit", async () => {
    const createdUnit = {
      id: "unit-123",
      systemId: "system-456",
      name: "Upstairs Unit",
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdUnit]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await createSystemUnit("system-456", "Upstairs Unit");

    expect(result).toEqual(createdUnit);
  });
});

describe("listSystemUnits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns units ordered by sortOrder then name", async () => {
    const mockUnits = [
      { id: "unit-1", systemId: "system-456", name: "Downstairs", sortOrder: 0 },
      { id: "unit-2", systemId: "system-456", name: "Upstairs", sortOrder: 1 },
    ];

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockUnits),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await listSystemUnits("system-456");

    expect(result).toEqual(mockUnits);
  });
});

describe("getSystemUnit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a unit by id", async () => {
    const mockUnit = {
      id: "unit-123",
      systemId: "system-456",
      name: "Upstairs Unit",
      sortOrder: 0,
    };

    const mockDb = {
      query: {
        systemUnits: {
          findFirst: vi.fn().mockResolvedValue(mockUnit),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getSystemUnit("unit-123");

    expect(result).toEqual(mockUnit);
  });

  it("returns null when unit not found", async () => {
    const mockDb = {
      query: {
        systemUnits: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getSystemUnit("nonexistent");

    expect(result).toBeNull();
  });
});

describe("updateSystemUnit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates unit name", async () => {
    const updatedUnit = {
      id: "unit-123",
      systemId: "system-456",
      name: "New Name",
      sortOrder: 0,
      updatedAt: new Date(),
    };

    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedUnit]),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await updateSystemUnit("unit-123", { name: "New Name" });

    expect(result).toEqual(updatedUnit);
  });
});

describe("deleteSystemUnit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a unit", async () => {
    const mockDb = {
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await deleteSystemUnit("unit-123");

    expect(mockDb.delete).toHaveBeenCalled();
  });
});
