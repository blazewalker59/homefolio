import { createFileRoute, redirect } from "@tanstack/react-router";
import { getHomeFn } from "@/server/home";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      const home = await getHomeFn();
      if (!home?.address) {
        throw redirect({ to: "/setup" });
      }
      return { home };
    } catch (err) {
      // If not authenticated, redirect to sign-in.
      if (err instanceof Error && err.message === "Not authenticated") {
        throw redirect({ to: "/sign-in" });
      }
      throw err;
    }
  },
  component: Dashboard,
});

function Dashboard() {
  const { home } = Route.useLoaderData();

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">Dashboard</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          {home.name || "My Home"}
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          {home.address}
        </p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {home.yearBuilt && (
          <article className="island-shell feature-card rise-in rounded-2xl p-5">
            <h2 className="mb-2 text-sm font-semibold text-[var(--sea-ink-soft)]">Year Built</h2>
            <p className="m-0 text-2xl font-bold text-[var(--sea-ink)]">{home.yearBuilt}</p>
          </article>
        )}
        {home.sqft && (
          <article className="island-shell feature-card rise-in rounded-2xl p-5">
            <h2 className="mb-2 text-sm font-semibold text-[var(--sea-ink-soft)]">
              Square Footage
            </h2>
            <p className="m-0 text-2xl font-bold text-[var(--sea-ink)]">
              {home.sqft.toLocaleString()} sqft
            </p>
          </article>
        )}
        {(home.bedCount || home.bathCount) && (
          <article className="island-shell feature-card rise-in rounded-2xl p-5">
            <h2 className="mb-2 text-sm font-semibold text-[var(--sea-ink-soft)]">Layout</h2>
            <p className="m-0 text-2xl font-bold text-[var(--sea-ink)]">
              {home.bedCount ?? 0} bed / {home.bathCount ?? 0} bath
            </p>
          </article>
        )}
      </section>

      <section className="island-shell mt-8 rounded-2xl p-6">
        <p className="island-kicker mb-2">Next steps</p>
        <ul className="m-0 list-disc space-y-2 pl-5 text-sm text-[var(--sea-ink-soft)]">
          <li>Add rooms to your home</li>
          <li>Set up systems (HVAC, electrical, plumbing)</li>
          <li>Start cataloging items and maintenance</li>
        </ul>
      </section>
    </main>
  );
}
