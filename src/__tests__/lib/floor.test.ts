import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  createFloor,
  listFloors,
  getFloor,
  updateFloor,
  reorderFloors,
  deleteFloor,
} from "@/lib/floor";

// Mock the db client module.
vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/db/client";

const mockGetDb = vi.mocked(getDb);

describe("createFloor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("appends a floor at max(sortOrder)+1", async () => {
    const created = {
      id: "floor-1",
      homeId: "home-1",
      name: "Ground",
      sortOrder: 2,
      scale: null,
    };

    const valuesSpy = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([created]),
    });
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ nextOrder: 2 }]),
        }),
      }),
      insert: vi.fn().mockReturnValue({ values: valuesSpy }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await createFloor("home-1", "Ground");

    expect(result).toEqual(created);
    expect(valuesSpy).toHaveBeenCalledWith({ homeId: "home-1", name: "Ground", sortOrder: 2 });
  });

  it("trims the name and rejects blank names", async () => {
    await expect(createFloor("home-1", "   ")).rejects.toThrow("Floor name is required");
  });
});

describe("listFloors", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns floors ordered by sortOrder then name", async () => {
    const floorsList = [
      { id: "f1", homeId: "home-1", name: "Basement", sortOrder: 0 },
      { id: "f2", homeId: "home-1", name: "Ground", sortOrder: 1 },
    ];
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(floorsList),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await listFloors("home-1");
    expect(result).toEqual(floorsList);
  });
});

describe("getFloor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a floor by id", async () => {
    const floor = { id: "f1", homeId: "home-1", name: "Ground", sortOrder: 0 };
    const mockDb = {
      query: { floors: { findFirst: vi.fn().mockResolvedValue(floor) } },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    expect(await getFloor("f1")).toEqual(floor);
  });
});

describe("updateFloor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renames a floor", async () => {
    const updated = { id: "f1", homeId: "home-1", name: "Upstairs", sortOrder: 0 };
    const setSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updated]),
      }),
    });
    const mockDb = { update: vi.fn().mockReturnValue({ set: setSpy }) };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await updateFloor("f1", { name: "Upstairs" });
    expect(result).toEqual(updated);
    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ name: "Upstairs" }));
  });

  it("rejects a blank rename", async () => {
    await expect(updateFloor("f1", { name: "  " })).rejects.toThrow("Floor name is required");
  });
});

describe("reorderFloors", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets each floor's sortOrder to its index", async () => {
    const whereSpy = vi.fn().mockResolvedValue(undefined);
    const setSpy = vi.fn().mockReturnValue({ where: whereSpy });
    const mockDb = { update: vi.fn().mockReturnValue({ set: setSpy }) };
    mockGetDb.mockResolvedValue(mockDb as any);

    await reorderFloors(["a", "b", "c"]);

    expect(mockDb.update).toHaveBeenCalledTimes(3);
    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 0 }));
    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 1 }));
    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 2 }));
  });
});

describe("deleteFloor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a floor", async () => {
    const mockDb = {
      delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await deleteFloor("f1");
    expect(mockDb.delete).toHaveBeenCalled();
  });
});
