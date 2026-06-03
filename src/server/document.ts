/**
 * Server functions for document management.
 *
 * These run on the server only (TanStack Start strips the `"use server"`
 * body from client bundles). They handle file uploads, listing, and deletion.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getHome } from "@/lib/home";
import {
  createDocument,
  listDocuments,
  listDocumentsByHome,
  getDocumentUrl,
  deleteDocument,
} from "@/lib/document";
import { requireSessionUser } from "@/lib/auth/session";
import {
  DOCUMENT_TYPES,
  DOCUMENT_ENTITY_TYPES,
  isValidDocumentType,
  isValidEntityType,
} from "@/lib/storage/types";
import type { DocumentType, DocumentEntityType } from "@/lib/storage/types";

const uploadDocumentSchema = z.object({
  entityType: z.string().refine(isValidEntityType, {
    message: "Invalid entity type",
  }),
  entityId: z.string().uuid(),
  type: z.string().refine(isValidDocumentType, {
    message: "Invalid document type",
  }),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  fileContent: z.string(), // Base64 encoded
  notes: z.string().optional(),
});

/**
 * Upload a document and attach it to an entity.
 *
 * The file content is sent as base64-encoded string. For large files,
 * consider implementing multipart upload or direct-to-R2 upload.
 */
export const uploadDocumentFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => uploadDocumentSchema.parse(raw))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const home = await getHome(user.id);
    if (!home) throw new Error("No home found for this user");

    const fileContent = Uint8Array.from(atob(data.fileContent), (c) => c.charCodeAt(0));

    const doc = await createDocument({
      homeId: home.id,
      entityType: data.entityType as DocumentEntityType,
      entityId: data.entityId,
      type: data.type as DocumentType,
      filename: data.filename,
      mimeType: data.mimeType,
      fileContent,
      notes: data.notes,
      uploadedBy: user.id,
    });

    return doc;
  });

const listDocumentsSchema = z.object({
  entityType: z.string().refine(isValidEntityType, {
    message: "Invalid entity type",
  }),
  entityId: z.string().uuid(),
});

/**
 * List documents for a specific entity.
 */
export const listDocumentsFn = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => listDocumentsSchema.parse(raw))
  .handler(async ({ data }) => {
    await requireSessionUser();
    return listDocuments(data.entityType as DocumentEntityType, data.entityId);
  });

/**
 * List all documents for the current user's home.
 */
export const listHomeDocumentsFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSessionUser();
  const home = await getHome(user.id);
  if (!home) return [];
  return listDocumentsByHome(home.id);
});

const getDocumentUrlSchema = z.object({
  documentId: z.string().uuid(),
});

/**
 * Get a signed URL for downloading a document.
 */
export const getDocumentUrlFn = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => getDocumentUrlSchema.parse(raw))
  .handler(async ({ data }) => {
    await requireSessionUser();
    return getDocumentUrl(data.documentId);
  });

const deleteDocumentSchema = z.object({
  documentId: z.string().uuid(),
});

/**
 * Delete a document and its file from storage.
 */
export const deleteDocumentFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => deleteDocumentSchema.parse(raw))
  .handler(async ({ data }) => {
    await requireSessionUser();
    await deleteDocument(data.documentId);
    return { success: true };
  });

/**
 * Get document types for UI dropdowns.
 */
export const getDocumentTypesFn = createServerFn({ method: "GET" }).handler(async () => {
  return DOCUMENT_TYPES;
});

/**
 * Get entity types for UI dropdowns.
 */
export const getEntityTypesFn = createServerFn({ method: "GET" }).handler(async () => {
  return DOCUMENT_ENTITY_TYPES;
});
