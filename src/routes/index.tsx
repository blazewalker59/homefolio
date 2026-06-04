import { createFileRoute, Link, redirect } from "@tanstack/react-router";
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

type Section = {
  number: string;
  to: "/rooms" | "/systems" | "/items" | "/documents" | "/activities";
  title: string;
  blurb: string;
};

const SECTIONS: Section[] = [
  {
    number: "01",
    to: "/rooms",
    title: "Rooms",
    blurb: "Bedrooms, bathrooms, the kitchen — the spaces that hold the rest.",
  },
  {
    number: "02",
    to: "/systems",
    title: "Systems",
    blurb: "HVAC, electrical, plumbing — the quiet machinery behind the walls.",
  },
  {
    number: "03",
    to: "/items",
    title: "Items",
    blurb: "Furniture, fixtures, appliances. Everything you'd take with you.",
  },
  {
    number: "04",
    to: "/documents",
    title: "Documents",
    blurb: "Receipts, manuals, warranties. The paper trail, properly filed.",
  },
  {
    number: "05",
    to: "/activities",
    title: "Activities",
    blurb: "A running record of everything that happens in your home.",
  },
];

function Dashboard() {
  const { home } = Route.useLoaderData();
  const stats: Array<{ kicker: string; value: string }> = [];

  if (home.yearBuilt) {
    stats.push({ kicker: "Year Built", value: String(home.yearBuilt) });
  }
  if (home.sqft) {
    stats.push({ kicker: "Square Footage", value: `${home.sqft.toLocaleString()} sqft` });
  }
  if (home.bedCount || home.bathCount) {
    stats.push({
      kicker: "Layout",
      value: `${home.bedCount ?? 0} bed · ${home.bathCount ?? 0} bath`,
    });
  }

  return (
    <main className="page-wrap px-4 pb-12 pt-12 sm:pt-16">
      {/* Magazine cover ------------------------------------------------ */}
      <section className="rise-in border-b border-[var(--line)] pb-10 sm:pb-14">
        <div className="mb-6 flex items-center justify-between text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[var(--sea-ink-soft)]">
          <span>The Residence</span>
          <span className="font-mono text-[var(--lagoon-deep)]">No. 001</span>
        </div>

        <p className="island-kicker mb-4">A property record</p>

        <h1 className="display-title mb-6 max-w-4xl text-5xl text-[var(--sea-ink)] sm:text-7xl">
          {home.name || "My Home"}
          <span className="ml-1 text-[var(--lagoon-deep)]">.</span>
        </h1>

        <p className="max-w-2xl font-serif text-lg italic text-[var(--sea-ink-soft)] sm:text-xl">
          {home.address}
        </p>

        {stats.length > 0 && (
          <dl className="mt-10 grid gap-y-6 border-t border-[var(--line)] pt-6 sm:grid-cols-3 sm:gap-x-10">
            {stats.map((s) => (
              <div key={s.kicker} className="flex flex-col gap-1">
                <dt className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[var(--sea-ink-soft)]">
                  {s.kicker}
                </dt>
                <dd className="m-0 font-serif text-3xl font-bold text-[var(--sea-ink)]">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Table of contents -------------------------------------------- */}
      <section className="rise-in mt-12">
        <div className="mb-6 flex items-baseline justify-between">
          <p className="island-kicker">Contents</p>
          <span className="font-mono text-xs text-[var(--sea-ink-soft)]">05 sections</span>
        </div>

        <ol className="m-0 list-none divide-y divide-[var(--line)] border-y border-[var(--line)] p-0">
          {SECTIONS.map((s) => (
            <li key={s.to} className="m-0">
              <Link
                to={s.to}
                className="group flex items-center gap-5 py-5 no-underline transition hover:bg-[var(--link-bg-hover)] sm:gap-8 sm:py-6"
              >
                <span className="w-10 shrink-0 pl-3 font-mono text-sm text-[var(--lagoon-deep)] sm:pl-4 sm:text-base">
                  {s.number}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="m-0 font-serif text-2xl font-bold text-[var(--sea-ink)] transition group-hover:text-[var(--lagoon-deep)] sm:text-3xl">
                    {s.title}
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-[var(--sea-ink-soft)] sm:text-base">
                    {s.blurb}
                  </p>
                </div>
                <svg
                  className="mr-3 h-5 w-5 shrink-0 text-[var(--sea-ink-soft)] transition group-hover:translate-x-1 group-hover:text-[var(--lagoon-deep)] sm:mr-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Editor's note ------------------------------------------------ */}
      <aside className="rise-in mt-12 grid gap-6 sm:grid-cols-[1fr_2fr]">
        <p className="island-kicker">Editor's note</p>
        <div className="border-l border-[var(--line)] pl-5 sm:pl-7">
          <p className="m-0 font-serif text-lg italic leading-relaxed text-[var(--sea-ink)]">
            Begin with the rooms. Add a system or two. Catalogue the appliances you'd want a buyer —
            or your future self — to find. The rest builds on itself.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <Link
              to="/rooms"
              className="text-[var(--lagoon-deep)] underline-offset-4 hover:no-underline"
            >
              Add rooms
            </Link>
            <span className="text-[var(--sea-ink-soft)]">·</span>
            <Link
              to="/systems"
              className="text-[var(--lagoon-deep)] underline-offset-4 hover:no-underline"
            >
              Set up systems
            </Link>
            <span className="text-[var(--sea-ink-soft)]">·</span>
            <Link
              to="/items"
              className="text-[var(--lagoon-deep)] underline-offset-4 hover:no-underline"
            >
              Catalogue items
            </Link>
            <span className="text-[var(--sea-ink-soft)]">·</span>
            <Link
              to="/activities"
              className="text-[var(--lagoon-deep)] underline-offset-4 hover:no-underline"
            >
              View activities
            </Link>
          </div>
        </div>
      </aside>
    </main>
  );
}
