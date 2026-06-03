import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { createRoom, listRooms, getRoom, updateRoom, deleteRoom, canDeleteRoom } from "@/lib/room";

// Mock the db client module.
vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/db/client";

const mockGetDb = vi.mocked(getDb);

describe("createRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a room with valid category", async () => {
    const createdRoom = {
      id: "room-123",
      homeId: "home-456",
      name: "Master Bedroom",
      category: "bedroom",
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdRoom]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await createRoom("home-456", "Master Bedroom", "bedroom");

    expect(result).toEqual(createdRoom);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("throws on invalid category", async () => {
    await expect(createRoom("home-456", "Weird Room", "invalid_category")).rejects.toThrow(
      "Invalid room category: invalid_category",
    );
  });
});

describe("listRooms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns rooms ordered by sortOrder then name", async () => {
    const mockRooms = [
      { id: "room-1", homeId: "home-456", name: "Kitchen", category: "kitchen", sortOrder: 0 },
      { id: "room-2", homeId: "home-456", name: "Bedroom", category: "bedroom", sortOrder: 1 },
    ];

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockRooms),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await listRooms("home-456");

    expect(result).toEqual(mockRooms);
  });
});

describe("getRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a room by id", async () => {
    const mockRoom = {
      id: "room-123",
      homeId: "home-456",
      name: "Kitchen",
      category: "kitchen",
      sortOrder: 0,
    };

    const mockDb = {
      query: {
        rooms: {
          findFirst: vi.fn().mockResolvedValue(mockRoom),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getRoom("room-123");

    expect(result).toEqual(mockRoom);
  });

  it("returns null when room not found", async () => {
    const mockDb = {
      query: {
        rooms: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getRoom("nonexistent");

    expect(result).toBeNull();
  });
});

describe("updateRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates room name", async () => {
    const updatedRoom = {
      id: "room-123",
      homeId: "home-456",
      name: "New Name",
      category: "bedroom",
      sortOrder: 0,
      updatedAt: new Date(),
    };

    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedRoom]),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await updateRoom("room-123", { name: "New Name" });

    expect(result).toEqual(updatedRoom);
  });

  it("throws on invalid category", async () => {
    await expect(updateRoom("room-123", { category: "invalid" })).rejects.toThrow(
      "Invalid room category: invalid",
    );
  });
});

describe("canDeleteRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns canDelete: true when room has no children", async () => {
    const result = await canDeleteRoom("room-123");

    expect(result).toEqual({ canDelete: true });
  });
});

describe("deleteRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes an empty room", async () => {
    const mockDb = {
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await deleteRoom("room-123");

    expect(mockDb.delete).toHaveBeenCalled();
  });
});
