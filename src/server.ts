/**
 * Custom TanStack Start server entry.
 *
 * TanStack Start auto-resolves an optional `src/server.{ts,tsx}` entry and
 * uses its default export as the Worker's `fetch` handler. We pull that
 * lever here to pre-dispatch anything under `/api/auth/*` to Better Auth's
 * request handler before falling through to the default TanStack Start
 * stream handler for SSR.
 *
 * Why this instead of a server-file route? This version of TanStack Start
 * does not expose a public "API route" primitive. Overriding the server
 * entry is the supported escape hatch — the plugin's entry resolver reads
 * `src/server.ts` before falling back to the package default.
 *
 * The shape (`export default { fetch }`) matches that default entry 1:1, so
 * everything Nitro / the `cloudflare-module` preset expects continues to
 * work.
 */

import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import type { R2Bucket } from "@cloudflare/workers-types";
import { getAuth } from "@/lib/auth/server";
import { initStorageProvider } from "@/lib/storage";
import { downloadByStorageKey } from "@/lib/document";

const startFetch = createStartHandler(defaultStreamHandler);

// Cheap prefix check — Better Auth's default `basePath` is `/api/auth`.
// Keeping it literal rather than importing from Better Auth avoids pulling
// the auth module into every static-asset cold start.
function isAuthRequest(request: Request): boolean {
  const { pathname } = new URL(request.url);
  return pathname === "/api/auth" || pathname.startsWith("/api/auth/");
}

const DOCUMENTS_PREFIX = "/api/documents/";

function isDocumentRequest(request: Request): boolean {
  return new URL(request.url).pathname.startsWith(DOCUMENTS_PREFIX);
}

/**
 * Serve a stored document. `getSignedUrl` returns `/api/documents/{key}`, so
 * this resolves that key back to bytes and streams them with the right
 * content type. Works for both R2 (production) and the in-memory dev provider.
 *
 * NOTE: this matches the existing placeholder URL scheme, which is not signed
 * — anyone with the exact storage key (only handed out to authenticated users
 * via getDocumentUrlFn) can fetch it. Replace with real presigned URLs before
 * treating documents as private.
 */
async function serveDocument(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  const key = decodeURIComponent(pathname.slice(DOCUMENTS_PREFIX.length));
  const doc = await downloadByStorageKey(key);
  if (!doc) return new Response("Document not found", { status: 404 });

  return new Response(doc.content, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.filename.replace(/["\\\r\n]/g, "")}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}

type CloudflareEnv = { DOCUMENTS_BUCKET?: R2Bucket } | undefined;

/**
 * Resolve the Cloudflare env bindings.
 *
 * IMPORTANT: Under Nitro's `cloudflare-module` preset, our custom server
 * entry is *not* the literal Worker `fetch` export. Nitro wraps us with
 * its own handler (see `nitro/dist/presets/cloudflare/runtime/_module-handler.mjs`),
 * which then invokes our handler via `nitroApp.fetch(request)` — passing
 * ONLY the request. The real Cloudflare `env` is stashed on
 * `globalThis.__env__` and on `request.runtime.cloudflare.env`.
 *
 * So our previous `fetch(request, env)` signature received `env = undefined`,
 * which is why `initStorageProvider` was never called and every server
 * function blew up with "Storage provider not initialized".
 */
export function getCloudflareEnv(request?: Request): CloudflareEnv {
  const fromGlobal = (globalThis as { __env__?: CloudflareEnv }).__env__;
  if (fromGlobal) return fromGlobal;
  const fromReq = (request as { runtime?: { cloudflare?: { env?: CloudflareEnv } } } | undefined)
    ?.runtime?.cloudflare?.env;
  return fromReq;
}

async function fetch(request: Request) {
  const env = getCloudflareEnv(request);

  // Initialize the R2-backed storage provider in production. In local dev
  // there's no binding; storage-using code paths call ensureStorageProvider(),
  // which installs the filesystem provider on demand.
  if (env?.DOCUMENTS_BUCKET) {
    initStorageProvider(env.DOCUMENTS_BUCKET);
  }

  if (isAuthRequest(request)) {
    const auth = await getAuth();
    return auth.handler(request);
  }
  if (isDocumentRequest(request)) {
    return serveDocument(request);
  }
  return startFetch(request);
}

export type ServerEntry = { fetch: typeof fetch };

export default { fetch } satisfies ServerEntry;
