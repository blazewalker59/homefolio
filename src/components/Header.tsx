import { Link } from "@tanstack/react-router";
import { signOut, useAuth } from "@/lib/auth/hooks";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const { status } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
          >
            <span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
            Homefolio
          </Link>
        </h2>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {status === "authenticated" && (
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
            >
              Sign out
            </button>
          )}
          {status === "anonymous" && (
            <Link
              to="/sign-in"
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
            >
              Sign in
            </Link>
          )}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
