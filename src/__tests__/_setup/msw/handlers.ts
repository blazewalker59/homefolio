import type { RequestHandler } from "msw";

/**
 * MSW request handlers.
 *
 * Empty for the scaffolding slice — Homefolio has no outbound HTTP
 * dependencies wired up yet. As features land that call external APIs,
 * add a handler here (and a fixture under `./fixtures/`) so tests run
 * fully offline. Individual tests can still override per-call via
 * `server.use(...)`.
 */
export const handlers: RequestHandler[] = [];
