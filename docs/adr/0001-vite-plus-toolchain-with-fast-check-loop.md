# 1. Vite+ toolchain with a fast check loop

Date: 2026-06-02

## Status

Accepted

## Context

Homefolio uses the Vite+ (`vp`) unified toolchain, which wraps Vite, Vitest,
Oxlint, Oxfmt, Rolldown, and tsdown behind a single `vite.config.ts` and a
single CLI.

Vite+'s `vp check` runs format + lint + type-check together, and its `lint`
block can enable type-aware lint rules (`typeAware`/`typeCheck`). With those
enabled, `vp check` and `vp lint` ran the TypeScript type-checker across the
whole project on every invocation and took **5+ minutes** — unusable as an
inner dev loop. Separately, the wrapped `vp lint` command hung indefinitely in
this environment, while the underlying `oxlint` binary linted in ~0.4s and a
direct `tsc --noEmit` type-checked in ~3.5s.

## Decision

Keep the Vite+ toolchain, but compose the check loop from the fast underlying
binaries instead of the bundled `vp check`/`vp lint` paths:

- `pnpm run check` → `vp fmt . --check && vp exec oxlint src` (~2s)
- `pnpm run check:fix` → `vp fmt . --write && vp exec oxlint src --fix`
- `pnpm run typecheck` → `vp exec tsc --noEmit` (~3.5s)
- `pnpm run check:full` → check + typecheck

The `lint` block in `vite.config.ts` does **not** enable `typeAware`/`typeCheck`
(type safety is covered by the separate `tsc` typecheck). `oxlint` is a direct
dev dependency so `vp exec oxlint` resolves the local binary. Generated files
(`src/routeTree.gen.ts`) are excluded from fmt/lint via `ignorePatterns`.

CI runs `check`, `typecheck`, and `test` as separate steps.

## Consequences

- The inner dev loop is fast (seconds, not minutes), which keeps TDD viable.
- Type errors are caught by `tsc`/CI, not by lint — slightly later than a fully
  type-aware lint would, but the speed trade is worth it.
- We bypass `vp check`/`vp lint` for the common path. If a future `vp` release
  fixes the lint hang and type-aware performance, we can reconsider collapsing
  back to `vp check`.
- Anyone adding type-aware lint rules must remember they won't run in the
  default loop — use `vp lint --type-aware` ad-hoc if needed.
