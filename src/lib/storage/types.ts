/**
 * Storage provider interface for file uploads.
 *
 * This abstraction allows swapping storage backends (R2, S3, etc.) without
 * changing the application code. All storage operations go through this interface.
 */

export interface StorageProvider {
  /**
   * Upload a file to storage.
   *
   * @param key - Unique storage key (path/filename)
   * @param body - File content as ArrayBuffer or Uint8Array
   * @param contentType - MIME type of the file
   * @returns Storage metadata including the final key
   */
  upload(
    key: string,
    body: ArrayBuffer | Uint8Array,
    contentType: string,
  ): Promise<{ key: string; size: number }>;

  /**
   * Download a file from storage.
   *
   * @param key - Storage key to retrieve
   * @returns File content as ArrayBuffer, or null if not found
   */
  download(key: string): Promise<ArrayBuffer | null>;

  /**
   * Delete a file from storage.
   *
   * @param key - Storage key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Generate a signed URL for temporary access to a file.
   *
   * @param key - Storage key
   * @param expiresIn - URL expiration time in seconds (default: 3600)
   * @returns Signed URL string
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

/**
 * Document type enum matching the fixed list in the schema.
 */
export const DOCUMENT_TYPES = [
  "receipt",
  "image",
  "manual",
  "warranty",
  "contract",
  "other",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/**
 * Entity types that can have documents attached.
 */
export const DOCUMENT_ENTITY_TYPES = ["home", "room", "system", "item"] as const;

export type DocumentEntityType = (typeof DOCUMENT_ENTITY_TYPES)[number];

/**
 * Validate that a string is a valid document type.
 */
export function isValidDocumentType(type: string): type is DocumentType {
  return DOCUMENT_TYPES.includes(type as DocumentType);
}

/**
 * Validate that a string is a valid entity type.
 */
export function isValidEntityType(type: string): type is DocumentEntityType {
  return DOCUMENT_ENTITY_TYPES.includes(type as DocumentEntityType);
}
