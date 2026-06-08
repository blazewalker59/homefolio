import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  createShape,
  listShapesByFloor,
  getShape,
  updateShape,
  deleteShape,
  linkShapeRoom,
  findShapeByRoom,
} from "@/lib/shape";

vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/db/client";

const mockGetDb = vi.mocked(getDb);

const rect = [
  { x: 0, y: 0 },
  { x: 48, y: 0 },
  { x: 48, y: 48 },
  { x: 0, y: 48 },
];

describe("createShape", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts a shape with its points", async () => {
    const created = { id: "s1", floorId: "f1", homeId: "h1", points: rect, z: 0 };
    const valuesSpy = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([created]),
    });
    const mockDb = { insert: vi.fn().mockReturnValue({ values: valuesSpy }) };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await createShape({ homeId: "h1", floorId: "f1", points: rect });

    expect(result).toEqual(created);
    expect(valuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ homeId: "h1", floorId: "f1", points: rect }),
    );
  });

  it("rejects a shape with fewer than 3 points", async () => {
    await expect(
      createShape({ homeId: "h1", floorId: "f1", points: [{ x: 0, y: 0 }] }),
    ).rejects.toThrow("at least 3 points");
  });
});

describe("listShapesByFloor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns shapes for a floor", async () => {
    const rows = [{ id: "s1", floorId: "f1", points: rect }];
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(rows),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    expect(await listShapesByFloor("f1")).toEqual(rows);
  });
});

describe("getShape", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a shape by id", async () => {
    const shape = { id: "s1", floorId: "f1", points: rect };
    const mockDb = { query: { shapes: { findFirst: vi.fn().mockResolvedValue(shape) } } };
    mockGetDb.mockResolvedValue(mockDb as any);

    expect(await getShape("s1")).toEqual(shape);
  });
});

describe("updateShape", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates points", async () => {
    const updated = { id: "s1", points: rect };
    const setSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([updated]) }),
    });
    const mockDb = { update: vi.fn().mockReturnValue({ set: setSpy }) };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await updateShape("s1", { points: rect });
    expect(result).toEqual(updated);
    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ points: rect }));
  });

  it("persists an L-shaped (6-vertex) polygon", async () => {
    const lShape = [
      { x: 0, y: 0 },
      { x: 96, y: 0 },
      { x: 96, y: 48 },
      { x: 48, y: 48 },
      { x: 48, y: 96 },
      { x: 0, y: 96 },
    ];
    const updated = { id: "s1", points: lShape };
    const setSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([updated]) }),
    });
    const mockDb = { update: vi.fn().mockReturnValue({ set: setSpy }) };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await updateShape("s1", { points: lShape });
    expect(result).toEqual(updated);
    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ points: lShape }));
  });

  it("rejects invalid points on update", async () => {
    await expect(updateShape("s1", { points: [{ x: 0, y: 0 }] })).rejects.toThrow(
      "at least 3 points",
    );
  });
});

describe("deleteShape", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a shape", async () => {
    const mockDb = {
      delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await deleteShape("s1");
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe("linkShapeRoom", () => {
  beforeEach(() => vi.clearAllMocks());

  it("links a shape to a room when the room is free", async () => {
    const updated = { id: "s1", roomId: "r1" };
    const setSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([updated]) }),
    });
    const mockDb = {
      query: { shapes: { findFirst: vi.fn().mockResolvedValue(undefined) } },
      update: vi.fn().mockReturnValue({ set: setSpy }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await linkShapeRoom("s1", "r1");
    expect(result).toEqual(updated);
    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ roomId: "r1" }));
  });

  it("rejects linking a room already placed on another shape", async () => {
    const mockDb = {
      query: { shapes: { findFirst: vi.fn().mockResolvedValue({ id: "other", roomId: "r1" }) } },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await expect(linkShapeRoom("s1", "r1")).rejects.toThrow("already placed");
  });

  it("unlinks without a uniqueness check when roomId is null", async () => {
    const updated = { id: "s1", roomId: null };
    const setSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([updated]) }),
    });
    const findFirst = vi.fn();
    const mockDb = {
      query: { shapes: { findFirst } },
      update: vi.fn().mockReturnValue({ set: setSpy }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await linkShapeRoom("s1", null);
    expect(result).toEqual(updated);
    expect(findFirst).not.toHaveBeenCalled(); // no conflict check when unlinking
    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ roomId: null }));
  });
});

describe("findShapeByRoom", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the shape linked to a room", async () => {
    const shape = { id: "s1", roomId: "r1" };
    const mockDb = { query: { shapes: { findFirst: vi.fn().mockResolvedValue(shape) } } };
    mockGetDb.mockResolvedValue(mockDb as any);

    expect(await findShapeByRoom("r1")).toEqual(shape);
  });
});
