import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  createActivity,
  listActivities,
  getActivity,
  updateActivity,
  deleteActivity,
  logItemCreated,
  logItemMoved,
} from "@/lib/activity";

vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/db/client";

const mockGetDb = vi.mocked(getDb);

describe("createActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an activity and returns it", async () => {
    const mockActivity = {
      id: "activity-1",
      homeId: "home-1",
      type: "maintenance",
      timestamp: new Date("2024-01-15"),
      description: "Replaced HVAC filter",
      entityType: null,
      entityId: null,
      notes: null,
      createdBy: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockActivity]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await createActivity({
      homeId: "home-1",
      type: "maintenance",
      timestamp: new Date("2024-01-15"),
      description: "Replaced HVAC filter",
      createdBy: "user-1",
    });

    expect(result).toEqual(mockActivity);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("creates an activity with entity link", async () => {
    const mockActivity = {
      id: "activity-2",
      homeId: "home-1",
      type: "purchase",
      timestamp: new Date("2024-01-15"),
      description: "Bought new sofa",
      entityType: "item",
      entityId: "item-1",
      notes: "From IKEA",
      createdBy: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockActivity]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await createActivity({
      homeId: "home-1",
      type: "purchase",
      timestamp: new Date("2024-01-15"),
      description: "Bought new sofa",
      entityType: "item",
      entityId: "item-1",
      notes: "From IKEA",
      createdBy: "user-1",
    });

    expect(result).toEqual(mockActivity);
    expect(result.entityType).toBe("item");
    expect(result.entityId).toBe("item-1");
  });
});

describe("listActivities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns activities ordered by timestamp descending", async () => {
    const mockActivities = [
      {
        id: "activity-3",
        homeId: "home-1",
        type: "inspection",
        timestamp: new Date("2024-03-01"),
        description: "Annual inspection",
        createdBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "activity-2",
        homeId: "home-1",
        type: "maintenance",
        timestamp: new Date("2024-02-01"),
        description: "HVAC service",
        createdBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "activity-1",
        homeId: "home-1",
        type: "purchase",
        timestamp: new Date("2024-01-01"),
        description: "Bought furniture",
        createdBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockActivities),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await listActivities("home-1");

    expect(result).toEqual(mockActivities);
    expect(result[0].timestamp.getTime()).toBeGreaterThan(result[1].timestamp.getTime());
    expect(result[1].timestamp.getTime()).toBeGreaterThan(result[2].timestamp.getTime());
  });
});

describe("getActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an activity by ID", async () => {
    const mockActivity = {
      id: "activity-1",
      homeId: "home-1",
      type: "maintenance",
      timestamp: new Date("2024-01-15"),
      description: "Replaced filter",
      createdBy: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      query: {
        activities: {
          findFirst: vi.fn().mockResolvedValue(mockActivity),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getActivity("activity-1");

    expect(result).toEqual(mockActivity);
  });
});

describe("updateActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an activity and returns it", async () => {
    const mockUpdated = {
      id: "activity-1",
      homeId: "home-1",
      type: "maintenance",
      timestamp: new Date("2024-01-15"),
      description: "Updated description",
      notes: "New notes",
      createdBy: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdated]),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await updateActivity("activity-1", {
      description: "Updated description",
      notes: "New notes",
    });

    expect(result).toEqual(mockUpdated);
    expect(result.description).toBe("Updated description");
  });
});

describe("deleteActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes an activity", async () => {
    const mockDb = {
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await expect(deleteActivity("activity-1")).resolves.not.toThrow();
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe("logItemCreated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an activity for item creation", async () => {
    const mockActivity = {
      id: "activity-1",
      homeId: "home-1",
      type: "other",
      timestamp: expect.any(Date),
      description: 'Added item "Living Room Lamp"',
      entityType: "item",
      entityId: "item-1",
      notes: null,
      createdBy: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockActivity]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await logItemCreated({
      homeId: "home-1",
      itemId: "item-1",
      itemName: "Living Room Lamp",
      createdBy: "user-1",
    });

    expect(result.type).toBe("other");
    expect(result.description).toBe('Added item "Living Room Lamp"');
    expect(result.entityType).toBe("item");
    expect(result.entityId).toBe("item-1");
  });
});

describe("logItemMoved", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an activity for item move between rooms", async () => {
    const mockActivity = {
      id: "activity-1",
      homeId: "home-1",
      type: "other",
      timestamp: expect.any(Date),
      description: 'Moved "Sofa" from Living Room to Bedroom',
      entityType: "item",
      entityId: "item-1",
      notes: null,
      createdBy: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockActivity]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await logItemMoved({
      homeId: "home-1",
      itemId: "item-1",
      itemName: "Sofa",
      fromRoomName: "Living Room",
      toRoomName: "Bedroom",
      createdBy: "user-1",
    });

    expect(result.type).toBe("other");
    expect(result.description).toBe('Moved "Sofa" from Living Room to Bedroom');
  });

  it("creates an activity for item moved to room (no from)", async () => {
    const mockActivity = {
      id: "activity-1",
      homeId: "home-1",
      type: "other",
      timestamp: expect.any(Date),
      description: 'Moved "Lamp" to Kitchen',
      entityType: "item",
      entityId: "item-1",
      notes: null,
      createdBy: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockActivity]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await logItemMoved({
      homeId: "home-1",
      itemId: "item-1",
      itemName: "Lamp",
      fromRoomName: null,
      toRoomName: "Kitchen",
      createdBy: "user-1",
    });

    expect(result.description).toBe('Moved "Lamp" to Kitchen');
  });

  it("creates an activity for item removed from room (no to)", async () => {
    const mockActivity = {
      id: "activity-1",
      homeId: "home-1",
      type: "other",
      timestamp: expect.any(Date),
      description: 'Removed "Chair" from Office',
      entityType: "item",
      entityId: "item-1",
      notes: null,
      createdBy: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockActivity]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await logItemMoved({
      homeId: "home-1",
      itemId: "item-1",
      itemName: "Chair",
      fromRoomName: "Office",
      toRoomName: null,
      createdBy: "user-1",
    });

    expect(result.description).toBe('Removed "Chair" from Office');
  });
});
