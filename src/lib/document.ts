/**
 * Document module — CRUD operations for documents with storage integration.
 *
 * Documents are files uploaded by users and attached to entities (Home, Room,
 * System, Item). Files are stored in R2 (or other providers) and referenced
 * by storageKey in the database.
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "@/db/client";
import { documents, homes } from "@/db/schema";
import type { DocumentType, DocumentEntityType } from "@/lib/storage/types";
import { getStorageProvider, generateStorageKey } from "@/lib/storage";
import { logReceiptUploaded } from "@/lib/activity";

export interface CreateDocumentParams {
  homeId: string;
  entityType: DocumentEntityType;
  entityId: string;
  type: DocumentType;
  filename: string;
  mimeType: string;
  fileContent: ArrayBuffer | Uint8Array;
  notes?: string;
  amount?: string; // Only used for receipts
  uploadedBy: string;
}

/**
 * Upload and create a document record.
 *
 * 1. Generate a unique storage key
 * 2. Upload file to storage provider
 * 3. Create document record in database
 */
export async function createDocument(params: CreateDocumentParams) {
  const db = await getDb();
  const storage = getStorageProvider();

  const storageKey = generateStorageKey(
    params.homeId,
    params.entityType,
    params.entityId,
    params.filename,
  );

  const { size } = await storage.upload(storageKey, params.fileContent, params.mimeType);

  const [doc] = await db
    .insert(documents)
    .values({
      homeId: params.homeId,
      entityType: params.entityType,
      entityId: params.entityId,
      type: params.type,
      filename: params.filename,
      mimeType: params.mimeType,
      size,
      storageKey,
      notes: params.notes,
      amount: params.amount,
      uploadedBy: params.uploadedBy,
    })
    .returning();

  // Auto-create a purchase activity when a receipt is uploaded
  if (params.type === "receipt") {
    await logReceiptUploaded({
      homeId: params.homeId,
      documentId: doc.id,
      filename: params.filename,
      amount: params.amount,
      entityType: params.entityType,
      entityId: params.entityId,
      createdBy: params.uploadedBy,
    });
  }

  return doc;
}

/**
 * List documents for a specific entity.
 */
export async function listDocuments(entityType: DocumentEntityType, entityId: string) {
  const db = await getDb();
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, entityType), eq(documents.entityId, entityId)))
    .orderBy(documents.createdAt);
}

/**
 * List all documents for a home.
 */
export async function listDocumentsByHome(homeId: string) {
  const db = await getDb();
  return db
    .select()
    .from(documents)
    .where(eq(documents.homeId, homeId))
    .orderBy(documents.createdAt);
}

/**
 * Get a document by ID.
 */
export async function getDocument(documentId: string) {
  const db = await getDb();
  return db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });
}

/**
 * Get a signed URL for downloading a document.
 */
export async function getDocumentUrl(documentId: string): Promise<string> {
  const doc = await getDocument(documentId);
  if (!doc) {
    throw new Error("Document not found");
  }

  const storage = getStorageProvider();
  return storage.getSignedUrl(doc.storageKey);
}

/**
 * Download document content.
 */
export async function downloadDocument(documentId: string): Promise<{
  content: ArrayBuffer;
  filename: string;
  mimeType: string;
} | null> {
  const doc = await getDocument(documentId);
  if (!doc) return null;

  const storage = getStorageProvider();
  const content = await storage.download(doc.storageKey);
  if (!content) return null;

  return {
    content,
    filename: doc.filename,
    mimeType: doc.mimeType,
  };
}

/**
 * Download a document's content by its storage key.
 *
 * Used by the `/api/documents/:key` serving route — `getSignedUrl` points at
 * that route, so this resolves the key back to bytes + content metadata.
 */
export async function downloadByStorageKey(storageKey: string): Promise<{
  content: ArrayBuffer;
  filename: string;
  mimeType: string;
} | null> {
  const db = await getDb();
  const doc = await db.query.documents.findFirst({
    where: eq(documents.storageKey, storageKey),
  });

  // Home hero photos aren't documents — they live on the homes table.
  if (!doc) {
    const home = await db.query.homes.findFirst({
      where: eq(homes.photoStorageKey, storageKey),
    });
    if (!home) return null;
    const storage = getStorageProvider();
    const content = await storage.download(storageKey);
    if (!content) return null;
    return {
      content,
      filename: "home-photo",
      mimeType: home.photoContentType ?? "application/octet-stream",
    };
  }

  const storage = getStorageProvider();
  const content = await storage.download(storageKey);
  if (!content) return null;

  return { content, filename: doc.filename, mimeType: doc.mimeType };
}

/**
 * Update a document's metadata (type, entity, notes, amount).
 */
export async function updateDocument(
  documentId: string,
  updates: {
    type?: DocumentType;
    entityType?: DocumentEntityType;
    entityId?: string;
    notes?: string;
    amount?: string | null;
  },
) {
  const db = await getDb();
  const [doc] = await db
    .update(documents)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(documents.id, documentId))
    .returning();
  return doc;
}

/**
 * Delete a document and its file from storage.
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const db = await getDb();
  const doc = await getDocument(documentId);

  if (!doc) {
    throw new Error("Document not found");
  }

  const storage = getStorageProvider();
  await storage.delete(doc.storageKey);

  await db.delete(documents).where(eq(documents.id, documentId));
}

/**
 * List all receipt documents for a home.
 */
export async function listReceiptsByHome(homeId: string) {
  const db = await getDb();
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.homeId, homeId), eq(documents.type, "receipt")))
    .orderBy(documents.createdAt);
}

/**
 * Calculate the total amount from all receipts for a home.
 */
export async function calculateReceiptTotal(homeId: string): Promise<number> {
  const receipts = await listReceiptsByHome(homeId);
  return receipts.reduce((total, receipt) => {
    const amount = receipt.amount ? parseFloat(receipt.amount) : 0;
    return total + amount;
  }, 0);
}
