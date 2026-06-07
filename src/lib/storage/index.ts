/**
 * Storage provider factory and singleton.
 *
 * Provides a single entry point for getting the storage provider instance.
 * In Cloudflare Workers, the R2 binding is passed via the environment.
 */

import type { R2Bucket } from "@cloudflare/workers-types";
import type { StorageProvider } from "./types";
import { R2StorageProvider } from "./r2";

// Keep the provider on globalThis rather than a module-local `let`. Under
// Vite's dev SSR, this module can be instantiated more than once (e.g. the
// custom server entry vs. server-function bundles); a module-local singleton
// set in one instance would read back as null in another, so storage-using
// server functions would throw "not initialized". globalThis is shared across
// those instances (and is the isolate global in production), so it gives one
// true singleton everywhere.
const STORAGE_KEY = "__homefolio_storage_provider__";

type StorageGlobal = typeof globalThis & { [STORAGE_KEY]?: StorageProvider };

function isDev(): boolean {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}

/**
 * Initialize the storage provider with an R2 bucket.
 *
 * This should be called once when the worker starts, typically in the
 * request handler or server entry point.
 */
export function initStorageProvider(bucket: R2Bucket): void {
  (globalThis as StorageGlobal)[STORAGE_KEY] = new R2StorageProvider(bucket);
}

/**
 * Set the storage provider directly. Used in local development to install a
 * non-R2 provider (e.g. the in-memory dev provider) when no bucket binding
 * is available.
 */
export function setStorageProvider(provider: StorageProvider): void {
  (globalThis as StorageGlobal)[STORAGE_KEY] = provider;
}

/**
 * Get the configured storage provider synchronously.
 *
 * @throws if storage hasn't been initialized. Prefer `ensureStorageProvider()`
 * in async code paths so local dev can install its filesystem provider.
 */
export function getStorageProvider(): StorageProvider {
  const g = globalThis as StorageGlobal;
  if (!g[STORAGE_KEY]) {
    throw new Error("Storage provider not initialized. Call initStorageProvider() first.");
  }
  return g[STORAGE_KEY]!;
}

/**
 * Resolve the storage provider, installing the local filesystem provider in
 * development if none is set (no R2 binding exists there). In production this
 * throws if storage was never initialized, surfacing a real misconfiguration.
 *
 * The filesystem provider is imported lazily behind the dev guard so it (and
 * `node:fs`) is dead-code-eliminated from the production/Cloudflare bundle.
 */
export async function ensureStorageProvider(): Promise<StorageProvider> {
  const g = globalThis as StorageGlobal;
  if (g[STORAGE_KEY]) return g[STORAGE_KEY]!;

  if (isDev()) {
    const { LocalFsStorageProvider } = await import("./local-fs");
    g[STORAGE_KEY] ??= new LocalFsStorageProvider();
    return g[STORAGE_KEY]!;
  }

  throw new Error("Storage provider not initialized. Call initStorageProvider() first.");
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
