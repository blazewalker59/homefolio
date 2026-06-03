/* eslint-disable react-refresh/only-export-components */
import "@testing-library/jest-dom/vitest";
import { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";

/**
 * Render helper with a place to hang shared providers.
 *
 * Homefolio's scaffolding slice has no global client providers yet (no
 * react-query, no router context in unit tests), so the wrapper is a
 * pass-through. Keep using this rather than RTL's `render` directly —
 * when providers land (e.g. a QueryClientProvider) they slot in here and
 * every test picks them up for free.
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <>{children}</>;
  }
  return render(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything from RTL so tests can `import { ... } from '@test/utils'`.
export * from "@testing-library/react";
