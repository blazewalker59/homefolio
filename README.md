# Homefolio

A PWA for homeowners to catalog and manage everything about their home — rooms,
systems, items, documents, maintenance, and a running activity log. See
[`CONTEXT.md`](./CONTEXT.md) for the domain glossary and
[`docs/adr/`](./docs/adr) for architecture decisions.

## Stack

- **App:** TanStack Start (React 19) PWA
- **Toolchain:** [Vite+](https://viteplus.dev) (`vp`) — Vite, Vitest, Oxlint, Oxfmt
- **Database:** Neon serverless Postgres + Drizzle ORM
- **Auth:** Better Auth (Google OAuth)
- **Deploy:** Cloudflare Workers (Nitro `cloudflare-module` preset)

Install the Vite+ CLI once: `curl -fsSL https://vite.plus | bash`.

## Develop

```bash
vp install        # install dependencies
vp dev            # dev server on :3000
```

## Verify

The check loop is split into fast, focused commands (see
[ADR 0001](./docs/adr/0001-vite-plus-toolchain-with-fast-check-loop.md) for why
we don't use the bundled `vp check`):

```bash
vp run check      # format check + lint  (~2s)
vp run typecheck  # tsc --noEmit         (~3.5s)
vp test run       # tests                (~2s)
vp run check:fix  # auto-fix format + lint
vp run check:full # check + typecheck
```

## Build

```bash
vp build          # Node preset (local/preview)
vp run build:cf   # Cloudflare Workers bundle
```

## Database

Migrations live in `src/db/migrations` and are generated from
`src/db/schema.ts`. Set `DATABASE_URL` in `.env.local` (see `.env.example`).

```bash
vp run db:generate  # generate a migration from schema changes
vp run db:migrate   # apply migrations
vp run db:push      # push schema directly (dev only)
vp run db:studio    # open Drizzle Studio
```

## Environment

Copy `.env.example` to `.env.local` for local dev (and `.dev.vars.example` to
`.dev.vars` for `wrangler dev`). Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

In production these are Cloudflare Worker secrets:

```bash
vp run cf:secret   # wrangler secret put --name homefolio
```

## Deploy

CI (`.github/workflows/deploy.yml`) verifies every push/PR and deploys to
Cloudflare Workers on push to `main`. Requires `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` repo secrets.
