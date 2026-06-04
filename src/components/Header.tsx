import { Link } from "@tanstack/react-router";
import { signOut, useAuth } from "@/lib/auth/hooks";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const { status } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-lg">
      <div className="page-wrap flex flex-wrap items-center gap-x-4 gap-y-2 py-3 sm:py-4">
        <Link
          to="/"
          className="group flex items-center gap-3 no-underline"
          aria-label="Homefolio — home"
        >
          {/* Monogram H plate — flat brass square, magazine masthead style. */}
          <span className="grid h-9 w-9 place-items-center rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] font-serif text-base font-bold tracking-tight text-[var(--lagoon-deep)] transition group-hover:border-[var(--lagoon-deep)] group-hover:bg-[var(--lagoon-deep)] group-hover:text-[var(--on-accent)]">
            H
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-[var(--sea-ink-soft)]">
              Vol.&nbsp;I
            </span>
            <span className="font-serif text-lg font-bold tracking-tight text-[var(--sea-ink)]">
              Homefolio
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {status === "authenticated" && (
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-sm px-3 py-1.5 text-sm font-medium text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
            >
              Sign out
            </button>
          )}
          {status === "anonymous" && (
            <Link
              to="/sign-in"
              className="rounded-sm px-3 py-1.5 text-sm font-medium text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
            >
              Sign in
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
