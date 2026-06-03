# 2. Cloudflare Workers runtime, Neon Postgres, and Better Auth

Date: 2026-06-02

## Status

Accepted

## Context

Homefolio is a TanStack Start PWA that needs a server runtime, a database, and
authentication (Google sign-in, per the PRD). A sibling project (`tome`) already
runs this exact stack in production, so we mirror its proven choices rather than
re-deriving them.

## Decision

- **Runtime / deploy:** Cloudflare Workers via Nitro's `cloudflare-module`
  preset. `build:cf` produces the Workers bundle; the `deploy` CI job ships it
  with `wrangler`. The default (Node preset) build is used for local `vp build`.
- **Database:** Neon serverless Postgres accessed over the WebSocket `Pool`
  driver (`@neondatabase/serverless`), which works on Workers and supports
  interactive transactions. Drizzle ORM is the query layer; `drizzle-kit`
  generates migrations; a Node `postgres-js` script (`scripts/migrate.ts`)
  applies them in CI/local (advisory locks need a stable session).
- **Auth:** Better Auth with the Google social provider and the Drizzle adapter
  (`usePlural: true`, uuid primary keys). Env/secrets are read lazily at request
  time via a cross-runtime `getEnv` helper, because Workers only populates
  bindings once a `fetch` handler is running.

## Consequences

- Server code must never read env at module top-level — only inside handlers
  (Workers binding lifecycle). The `getEnv`/`getDb`/`getAuth` factories enforce
  this.
- A fresh DB pool is created per request (`max: 1`); this matches Workers'
  short-lived isolate model and Neon's connection characteristics.
- Deploys require `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` CI secrets,
  and runtime secrets (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) set via `wrangler secret put`.
- Choosing Workers constrains us to the Workers runtime API surface (no
  arbitrary Node built-ins without `nodejs_compat`). This is why the Neon
  WebSocket driver is used rather than a Node-only Postgres client at runtime.
