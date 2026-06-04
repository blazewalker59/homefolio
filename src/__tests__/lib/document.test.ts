import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  createDocument,
  listDocuments,
  listDocumentsByHome,
  getDocument,
  deleteDocument,
  listReceiptsByHome,
  calculateReceiptTotal,
} from "@/lib/document";
import * as storage from "@/lib/storage";

vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  getStorageProvider: vi.fn(),
  generateStorageKey: vi.fn(),
}));

vi.mock("@/lib/activity", () => ({
  logReceiptUploaded: vi.fn().mockResolvedValue({ id: "activity-1" }),
}));

import { getDb } from "@/db/client";
import { logReceiptUploaded } from "@/lib/activity";

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

describe("createDocument with receipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures amount for receipt documents", async () => {
    const mockStorage = {
      upload: vi.fn().mockResolvedValue({ key: "test-key", size: 1024 }),
    };
    mockGetStorageProvider.mockReturnValue(mockStorage as any);
    mockGenerateStorageKey.mockReturnValue("home-1/room/room-1/123-receipt.jpg");

    const mockDoc = {
      id: "doc-1",
      homeId: "home-1",
      entityType: "room",
      entityId: "room-1",
      type: "receipt",
      filename: "receipt.jpg",
      mimeType: "image/jpeg",
      size: 1024,
      storageKey: "home-1/room/room-1/123-receipt.jpg",
      notes: null,
      amount: "49.99",
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
      type: "receipt",
      filename: "receipt.jpg",
      mimeType: "image/jpeg",
      fileContent: new Uint8Array([1, 2, 3]),
      amount: "49.99",
      uploadedBy: "user-1",
    });

    expect(result.amount).toBe("49.99");
    expect(result.type).toBe("receipt");
  });

  it("auto-creates purchase activity when receipt is uploaded", async () => {
    const mockStorage = {
      upload: vi.fn().mockResolvedValue({ key: "test-key", size: 1024 }),
    };
    mockGetStorageProvider.mockReturnValue(mockStorage as any);
    mockGenerateStorageKey.mockReturnValue("home-1/room/room-1/123-receipt.jpg");

    const mockDoc = {
      id: "doc-1",
      homeId: "home-1",
      entityType: "room",
      entityId: "room-1",
      type: "receipt",
      filename: "receipt.jpg",
      mimeType: "image/jpeg",
      size: 1024,
      storageKey: "home-1/room/room-1/123-receipt.jpg",
      amount: "99.99",
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

    await createDocument({
      homeId: "home-1",
      entityType: "room",
      entityId: "room-1",
      type: "receipt",
      filename: "receipt.jpg",
      mimeType: "image/jpeg",
      fileContent: new Uint8Array([1, 2, 3]),
      amount: "99.99",
      uploadedBy: "user-1",
    });

    expect(logReceiptUploaded).toHaveBeenCalledWith({
      homeId: "home-1",
      documentId: "doc-1",
      filename: "receipt.jpg",
      amount: "99.99",
      entityType: "room",
      entityId: "room-1",
      createdBy: "user-1",
    });
  });

  it("does not create activity for non-receipt documents", async () => {
    const mockStorage = {
      upload: vi.fn().mockResolvedValue({ key: "test-key", size: 1024 }),
    };
    mockGetStorageProvider.mockReturnValue(mockStorage as any);
    mockGenerateStorageKey.mockReturnValue("home-1/room/room-1/123-manual.pdf");

    const mockDoc = {
      id: "doc-1",
      homeId: "home-1",
      entityType: "room",
      entityId: "room-1",
      type: "manual",
      filename: "manual.pdf",
      mimeType: "application/pdf",
      size: 1024,
      storageKey: "home-1/room/room-1/123-manual.pdf",
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

    await createDocument({
      homeId: "home-1",
      entityType: "room",
      entityId: "room-1",
      type: "manual",
      filename: "manual.pdf",
      mimeType: "application/pdf",
      fileContent: new Uint8Array([1, 2, 3]),
      uploadedBy: "user-1",
    });

    expect(logReceiptUploaded).not.toHaveBeenCalled();
  });
});

describe("listReceiptsByHome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only receipt documents for a home", async () => {
    const mockReceipts = [
      { id: "doc-1", homeId: "home-1", type: "receipt", amount: "49.99" },
      { id: "doc-2", homeId: "home-1", type: "receipt", amount: "29.99" },
    ];

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockReceipts),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await listReceiptsByHome("home-1");

    expect(result).toEqual(mockReceipts);
    expect(result.every((r) => r.type === "receipt")).toBe(true);
  });
});

describe("calculateReceiptTotal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sums all receipt amounts for a home", async () => {
    const mockReceipts = [
      { id: "doc-1", homeId: "home-1", type: "receipt", amount: "49.99" },
      { id: "doc-2", homeId: "home-1", type: "receipt", amount: "29.99" },
      { id: "doc-3", homeId: "home-1", type: "receipt", amount: "100.00" },
    ];

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockReceipts),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const total = await calculateReceiptTotal("home-1");

    expect(total).toBeCloseTo(179.98, 2);
  });

  it("returns 0 when no receipts exist", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const total = await calculateReceiptTotal("home-1");

    expect(total).toBe(0);
  });

  it("handles receipts without amounts", async () => {
    const mockReceipts = [
      { id: "doc-1", homeId: "home-1", type: "receipt", amount: "49.99" },
      { id: "doc-2", homeId: "home-1", type: "receipt", amount: null },
    ];

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockReceipts),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const total = await calculateReceiptTotal("home-1");

    expect(total).toBe(49.99);
  });
});
