/**
 * Cloudflare R2 storage provider implementation.
 *
 * Uses the R2 binding available in Cloudflare Workers environment.
 * Files are stored with a prefix structure: {homeId}/{entityType}/{entityId}/{filename}
 */

import type { R2Bucket } from "@cloudflare/workers-types";
import type { StorageProvider } from "./types";

export class R2StorageProvider implements StorageProvider {
  private bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  async upload(
    key: string,
    body: ArrayBuffer | Uint8Array,
    contentType: string,
  ): Promise<{ key: string; size: number }> {
    const object = await this.bucket.put(key, body, {
      httpMetadata: { contentType },
    });

    return {
      key: object.key,
      size: object.size,
    };
  }

  async download(key: string): Promise<ArrayBuffer | null> {
    const object = await this.bucket.get(key);
    if (!object) return null;
    return object.arrayBuffer();
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // R2 doesn't support signed URLs directly, so we'll use a presigned URL
    // via the S3-compatible API or return a direct URL for now.
    // For production, you'd use the S3-compatible endpoint with presigning.
    // For now, we'll return a placeholder that indicates the key.
    // In a real implementation, you'd use @aws-sdk/client-s3 with R2 endpoint.
    return `/api/documents/${encodeURIComponent(key)}?expires=${expiresIn}`;
  }
}
