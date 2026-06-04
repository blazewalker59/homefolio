import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  seedBuiltInTemplates,
  listTemplates,
  getTemplate,
  createItem,
  listItems,
  listItemsByRoom,
  listItemsBySystemUnit,
  getItem,
  updateItem,
  moveItem,
  deleteItem,
  canDeleteItem,
} from "@/lib/item";
import { BUILT_IN_TEMPLATES } from "@/lib/item-templates";

// Mock the db client module.
vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/db/client";

const mockGetDb = vi.mocked(getDb);

describe("seedBuiltInTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("seeds templates when none exist", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await seedBuiltInTemplates(BUILT_IN_TEMPLATES);

    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("skips seeding when templates already exist", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "template-1" }]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await seedBuiltInTemplates(BUILT_IN_TEMPLATES);

    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});

describe("listTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all templates", async () => {
    const mockTemplates = [
      { id: "template-1", name: "Paint", category: "paint", fields: [] },
      { id: "template-2", name: "Window", category: "window", fields: [] },
    ];

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockTemplates),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await listTemplates();

    expect(result).toEqual(mockTemplates);
  });
});

describe("getTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a template by id", async () => {
    const mockTemplate = {
      id: "template-123",
      name: "Paint",
      category: "paint",
      fields: [{ key: "brand", label: "Brand", type: "text" }],
    };

    const mockDb = {
      query: {
        itemTemplates: {
          findFirst: vi.fn().mockResolvedValue(mockTemplate),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getTemplate("template-123");

    expect(result).toEqual(mockTemplate);
  });

  it("returns null when template not found", async () => {
    const mockDb = {
      query: {
        itemTemplates: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getTemplate("nonexistent");

    expect(result).toBeNull();
  });
});

describe("createItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an item with template snapshot", async () => {
    const createdItem = {
      id: "item-123",
      homeId: "home-456",
      templateId: "template-789",
      name: "Living Room Paint",
      roomId: "room-1",
      systemUnitId: null,
      fields: { brand: "Sherwin-Williams", color: "Alabaster" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdItem]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await createItem({
      homeId: "home-456",
      templateId: "template-789",
      name: "Living Room Paint",
      roomId: "room-1",
      fields: { brand: "Sherwin-Williams", color: "Alabaster" },
    });

    expect(result).toEqual(createdItem);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("creates an item with dual membership (room + system unit)", async () => {
    const createdItem = {
      id: "item-123",
      homeId: "home-456",
      templateId: "template-789",
      name: "HVAC Filter",
      roomId: "room-1",
      systemUnitId: "unit-1",
      fields: { size: "16x25x1" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdItem]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await createItem({
      homeId: "home-456",
      templateId: "template-789",
      name: "HVAC Filter",
      roomId: "room-1",
      systemUnitId: "unit-1",
      fields: { size: "16x25x1" },
    });

    expect(result.roomId).toBe("room-1");
    expect(result.systemUnitId).toBe("unit-1");
  });
});

describe("listItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all items for a home", async () => {
    const mockItems = [
      { id: "item-1", name: "Paint", homeId: "home-456" },
      { id: "item-2", name: "Window", homeId: "home-456" },
    ];

    const mockDb = {
      query: {
        items: {
          findMany: vi.fn().mockResolvedValue(mockItems),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await listItems("home-456");

    expect(result).toEqual(mockItems);
  });
});

describe("listItemsByRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns items for a specific room", async () => {
    const mockItems = [{ id: "item-1", name: "Paint", roomId: "room-1" }];

    const mockDb = {
      query: {
        items: {
          findMany: vi.fn().mockResolvedValue(mockItems),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await listItemsByRoom("room-1");

    expect(result).toEqual(mockItems);
  });
});

describe("listItemsBySystemUnit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns items for a specific system unit", async () => {
    const mockItems = [{ id: "item-1", name: "Filter", systemUnitId: "unit-1" }];

    const mockDb = {
      query: {
        items: {
          findMany: vi.fn().mockResolvedValue(mockItems),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await listItemsBySystemUnit("unit-1");

    expect(result).toEqual(mockItems);
  });
});

describe("getItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an item by id", async () => {
    const mockItem = {
      id: "item-123",
      name: "Paint",
      fields: { brand: "Sherwin-Williams" },
    };

    const mockDb = {
      query: {
        items: {
          findFirst: vi.fn().mockResolvedValue(mockItem),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getItem("item-123");

    expect(result).toEqual(mockItem);
  });
});

describe("updateItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates item fields (snapshot, not template)", async () => {
    const updatedItem = {
      id: "item-123",
      name: "Updated Paint",
      fields: { brand: "Benjamin Moore", color: "White Dove" },
      updatedAt: new Date(),
    };

    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedItem]),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await updateItem("item-123", {
      name: "Updated Paint",
      fields: { brand: "Benjamin Moore", color: "White Dove" },
    });

    expect(result).toEqual(updatedItem);
  });
});

describe("moveItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("moves an item to a different room", async () => {
    const existingItem = {
      id: "item-123",
      homeId: "home-1",
      name: "Test Item",
      roomId: "room-1",
      room: { id: "room-1", name: "Living Room" },
    };

    const toRoom = { id: "room-2", name: "Bedroom" };

    const movedItem = {
      id: "item-123",
      homeId: "home-1",
      name: "Test Item",
      roomId: "room-2",
      updatedAt: new Date(),
    };

    const mockActivity = {
      id: "activity-1",
      homeId: "home-1",
      type: "other",
      timestamp: expect.any(Date),
      description: 'Moved "Test Item" from Living Room to Bedroom',
      entityType: "item",
      entityId: "item-123",
      createdBy: "user-1",
    };

    const mockDb = {
      query: {
        items: {
          findFirst: vi.fn().mockResolvedValue(existingItem),
        },
        rooms: {
          findFirst: vi.fn().mockResolvedValue(toRoom),
        },
      },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([movedItem]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockActivity]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await moveItem("item-123", "room-2", "user-1");

    expect(result.roomId).toBe("room-2");
    expect(mockDb.query.items.findFirst).toHaveBeenCalled();
    expect(mockDb.query.rooms.findFirst).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled();
  });
});

describe("canDeleteItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns canDelete: true when no documents attached", async () => {
    const result = await canDeleteItem("item-123");

    expect(result).toEqual({ canDelete: true });
  });
});

describe("deleteItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes an item", async () => {
    const mockDb = {
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await deleteItem("item-123");

    expect(mockDb.delete).toHaveBeenCalled();
  });
});
