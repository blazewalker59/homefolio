import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  createDocument,
  listDocuments,
  listDocumentsByHome,
  getDocument,
  deleteDocument,
} from "@/lib/document";
import * as storage from "@/lib/storage";

vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  getStorageProvider: vi.fn(),
  generateStorageKey: vi.fn(),
}));

import { getDb } from "@/db/client";

const mockGetDb = vi.mocked(getDb);
const mockGetStorageProvider = vi.mocked(storage.getStorageProvider);
const mockGenerateStorageKey = vi.mocked(storage.generateStorageKey);

describe("createDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads file and creates document record", async () => {
    const mockStorage = {
      upload: vi.fn().mockResolvedValue({ key: "test-key", size: 1024 }),
    };
    mockGetStorageProvider.mockReturnValue(mockStorage as any);
    mockGenerateStorageKey.mockReturnValue("home-1/room/room-1/123-file.pdf");

    const mockDoc = {
      id: "doc-1",
      homeId: "home-1",
      entityType: "room",
      entityId: "room-1",
      type: "manual",
      filename: "manual.pdf",
      mimeType: "application/pdf",
      size: 1024,
      storageKey: "home-1/room/room-1/123-file.pdf",
      notes: "Test notes",
      uploadedBy: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockDoc]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await createDocument({
      homeId: "home-1",
      entityType: "room",
      entityId: "room-1",
      type: "manual",
      filename: "manual.pdf",
      mimeType: "application/pdf",
      fileContent: new Uint8Array([1, 2, 3]),
      notes: "Test notes",
      uploadedBy: "user-1",
    });

    expect(mockStorage.upload).toHaveBeenCalled();
    expect(mockGenerateStorageKey).toHaveBeenCalledWith("home-1", "room", "room-1", "manual.pdf");
    expect(result).toEqual(mockDoc);
  });
});

describe("listDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns documents for an entity", async () => {
    const mockDocs = [
      {
        id: "doc-1",
        entityType: "room",
        entityId: "room-1",
        filename: "manual.pdf",
        type: "manual",
      },
    ];

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockDocs),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await listDocuments("room", "room-1");

    expect(result).toEqual(mockDocs);
  });
});

describe("listDocumentsByHome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all documents for a home", async () => {
    const mockDocs = [
      { id: "doc-1", homeId: "home-1", filename: "manual.pdf" },
      { id: "doc-2", homeId: "home-1", filename: "receipt.jpg" },
    ];

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockDocs),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await listDocumentsByHome("home-1");

    expect(result).toEqual(mockDocs);
  });
});

describe("getDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a document by ID", async () => {
    const mockDoc = { id: "doc-1", filename: "manual.pdf" };

    const mockDb = {
      query: {
        documents: {
          findFirst: vi.fn().mockResolvedValue(mockDoc),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await getDocument("doc-1");

    expect(result).toEqual(mockDoc);
  });
});

describe("deleteDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes file from storage and document record", async () => {
    const mockStorage = {
      delete: vi.fn().mockResolvedValue(undefined),
    };
    mockGetStorageProvider.mockReturnValue(mockStorage as any);

    const mockDoc = { id: "doc-1", storageKey: "test-key" };

    const mockDb = {
      query: {
        documents: {
          findFirst: vi.fn().mockResolvedValue(mockDoc),
        },
      },
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await deleteDocument("doc-1");

    expect(mockStorage.delete).toHaveBeenCalledWith("test-key");
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it("throws if document not found", async () => {
    const mockDb = {
      query: {
        documents: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await expect(deleteDocument("doc-1")).rejects.toThrow("Document not found");
  });
});
