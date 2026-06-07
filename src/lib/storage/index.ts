/**
 * Storage provider factory and singleton.
 *
 * Provides a single entry point for getting the storage provider instance.
 * In Cloudflare Workers, the R2 binding is passed via the environment.
 */

import type { R2Bucket } from "@cloudflare/workers-types";
import type { StorageProvider } from "./types";
import { R2StorageProvider } from "./r2";

let storageProvider: StorageProvider | null = null;

/**
 * Initialize the storage provider with an R2 bucket.
 *
 * This should be called once when the worker starts, typically in the
 * request handler or server entry point.
 */
export function initStorageProvider(bucket: R2Bucket): void {
  storageProvider = new R2StorageProvider(bucket);
}

/**
 * Set the storage provider directly. Used in local development to install a
 * non-R2 provider (e.g. the in-memory dev provider) when no bucket binding
 * is available.
 */
export function setStorageProvider(provider: StorageProvider): void {
  storageProvider = provider;
}

/**
 * Get the configured storage provider.
 *
 * @throws Error if the storage provider hasn't been initialized
 */
export function getStorageProvider(): StorageProvider {
  if (!storageProvider) {
    throw new Error("Storage provider not initialized. Call initStorageProvider() first.");
  }
  return storageProvider;
}

/**
 * Generate a unique storage key for a document.
 *
 * Format: {homeId}/{entityType}/{entityId}/{timestamp}-{filename}
 */
export function generateStorageKey(
  homeId: string,
  entityType: string,
  entityId: string,
  filename: string,
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${homeId}/${entityType}/${entityId}/${timestamp}-${sanitizedFilename}`;
}
