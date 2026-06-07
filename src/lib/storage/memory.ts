/**
 * In-memory storage provider for local development.
 *
 * `vp dev` runs on plain Node with no Cloudflare R2 binding, so there's no
 * real bucket to talk to. This keeps document upload/view working locally by
 * holding file bytes in a module-level Map. Contents live only for the
 * lifetime of the dev server process — they are not persisted and are not
 * used in production (R2 is used there).
 */

import type { StorageProvider } from "./types";

export class MemoryStorageProvider implements StorageProvider {
  private store = new Map<string, { body: Uint8Array; contentType: string }>();

  async upload(key: string, body: ArrayBuffer | Uint8Array, contentType: string) {
    const bytes = body instanceof Uint8Array ? body : new Uint8Array(body);
    this.store.set(key, { body: bytes, contentType });
    return { key, size: bytes.byteLength };
  }

  async download(key: string): Promise<ArrayBuffer | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    const { body } = entry;
    return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getSignedUrl(key: string): Promise<string> {
    return `/api/documents/${encodeURIComponent(key)}`;
  }
}
