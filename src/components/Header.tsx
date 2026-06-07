import { Link, useRouterState } from "@tanstack/react-router";
import { signOut, useAuth } from "@/lib/auth/hooks";
import { useSidebar } from "@/lib/sidebar-context";
import ThemeToggle from "./ThemeToggle";

// Routes that live inside the tabbed `_app` layout, where the config sidebar
// (and its mobile drawer) provide the user/home/search/theme controls.
const APP_PREFIXES = ["/rooms", "/systems", "/items", "/documents", "/activities"];

export default function Header() {
  const { status, user } = useAuth();
  const { setOpen } = useSidebar();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAppRoute = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const avatar = user?.avatarUrl || user?.image || null;
  const initial = (user?.displayName || user?.name || "?").trim().charAt(0).toUpperCase() || "?";

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
          {status === "authenticated" &&
            isAppRoute && (
              // Opens the config popout drawer at every breakpoint.
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Account & settings"
                className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-[var(--surface-strong)] text-sm font-bold text-[var(--lagoon-deep)] transition hover:border-[var(--lagoon-deep)]"
              >
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </button>
            )}
          {status === "authenticated" && !isAppRoute && (
            <>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-sm px-3 py-1.5 text-sm font-medium text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
              >
                Sign out
              </button>
              <ThemeToggle />
            </>
          )}
          {status === "anonymous" && (
            <>
              <Link
                to="/sign-in"
                className="rounded-sm px-3 py-1.5 text-sm font-medium text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
              >
                Sign in
              </Link>
              <ThemeToggle />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
