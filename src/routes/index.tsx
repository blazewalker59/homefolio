import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/hooks";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const { status, user } = useAuth();
  const navigate = useNavigate();

  // Redirect to sign-in if not authenticated.
  if (status === "anonymous") {
    void navigate({ to: "/sign-in" });
    return null;
  }

  // Show loading state while auth is resolving.
  if (status === "loading") {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-sm text-[var(--sea-ink-soft)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">Dashboard</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Welcome{user?.displayName ? `, ${user.displayName}` : ""}
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Your home dashboard is ready. Next up: set up your home details.
        </p>
      </section>
    </main>
  );
}
