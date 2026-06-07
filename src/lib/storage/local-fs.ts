/**
 * Filesystem storage provider for local development.
 *
 * `vp dev` has no R2 binding, and an in-memory provider doesn't work because
 * the upload server function and the `/api/documents` serve route can run in
 * separate dev module runtimes (so they wouldn't share an in-memory Map).
 * Writing to disk under `.data/documents` is shared across those runtimes and
 * also survives dev-server restarts. Never used in production (R2 is).
 *
 * Node-only: imported lazily behind an `import.meta.env.DEV` guard so it (and
 * `node:fs`) is dead-code-eliminated from the Cloudflare bundle.
 */

import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import type { StorageProvider } from "./types";

const BASE_DIR = join(process.cwd(), ".data", "documents");

function keyToPath(key: string): string {
  // Storage keys are app-generated, but strip any leading traversal defensively.
  const safe = normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  return join(BASE_DIR, safe);
}

export class LocalFsStorageProvider implements StorageProvider {
  async upload(
    key: string,
    body: ArrayBuffer | Uint8Array,
    _contentType: string,
  ): Promise<{ key: string; size: number }> {
    const path = keyToPath(key);
    await mkdir(dirname(path), { recursive: true });
    const bytes = body instanceof Uint8Array ? body : new Uint8Array(body);
    await writeFile(path, bytes);
    return { key, size: bytes.byteLength };
  }

  async download(key: string): Promise<ArrayBuffer | null> {
    try {
      const buf = await readFile(keyToPath(key));
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(keyToPath(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    return `/api/documents/${encodeURIComponent(key)}`;
  }
}
