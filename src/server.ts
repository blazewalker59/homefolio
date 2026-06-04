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

const startFetch = createStartHandler(defaultStreamHandler);

// Cheap prefix check — Better Auth's default `basePath` is `/api/auth`.
// Keeping it literal rather than importing from Better Auth avoids pulling
// the auth module into every static-asset cold start.
function isAuthRequest(request: Request): boolean {
  const { pathname } = new URL(request.url);
  return pathname === "/api/auth" || pathname.startsWith("/api/auth/");
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

  // Initialize storage provider if R2 bucket is available.
  // Safe to call on every request — `initStorageProvider` just swaps the
  // singleton, and the R2 binding is stable for the lifetime of the isolate.
  if (env?.DOCUMENTS_BUCKET) {
    initStorageProvider(env.DOCUMENTS_BUCKET);
  }

  if (isAuthRequest(request)) {
    const auth = await getAuth();
    return auth.handler(request);
  }
  return startFetch(request);
}

export type ServerEntry = { fetch: typeof fetch };

export default { fetch } satisfies ServerEntry;
