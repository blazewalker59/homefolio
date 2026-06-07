import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getHomeFn, updateHomeFn, getTotalInvestedFn } from "@/server/home";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      const home = await getHomeFn();
      if (!home?.address) {
        throw redirect({ to: "/setup" });
      }
      const totalInvested = await getTotalInvestedFn();
      return { home, totalInvested };
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
  const { home, totalInvested } = Route.useLoaderData();
  const [isEditing, setIsEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  if (totalInvested > 0) {
    stats.push({
      kicker: "Total Invested",
      value: `$${totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const address = formData.get("address") as string;
    const name = formData.get("name") as string;
    const yearBuilt = formData.get("yearBuilt") as string;
    const sqft = formData.get("sqft") as string;
    const bedCount = formData.get("bedCount") as string;
    const bathCount = formData.get("bathCount") as string;

    if (!address.trim()) {
      setError("Address is required");
      setPending(false);
      return;
    }

    try {
      await updateHomeFn({
        data: {
          address: address.trim(),
          name: name.trim() || null,
          yearBuilt: yearBuilt ? parseInt(yearBuilt, 10) : null,
          sqft: sqft ? parseInt(sqft, 10) : null,
          bedCount: bedCount ? parseInt(bedCount, 10) : null,
          bathCount: bathCount ? parseInt(bathCount, 10) : null,
        },
      });
      setIsEditing(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setPending(false);
    }
  }

  return (
    <main className="page-wrap px-4 pb-12 pt-12 sm:pt-16">
      {/* Home info section - condensed and editable */}
      <section className="rise-in mb-8 border-b border-[var(--line)] pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[var(--sea-ink-soft)]">
              <span>The Residence</span>
              <span className="font-mono text-[var(--lagoon-deep)]">No. 001</span>
            </div>

            {!isEditing ? (
              <>
                <h1 className="mb-2 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
                  {home.name || "My Home"}
                </h1>
                <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">{home.address}</p>

                {stats.length > 0 && (
                  <div className="flex flex-wrap gap-4 text-sm">
                    {stats.map((s) => (
                      <div key={s.kicker} className="flex items-baseline gap-2">
                        <span className="font-semibold text-[var(--sea-ink)]">{s.value}</span>
                        <span className="text-xs text-[var(--sea-ink-soft)]">{s.kicker}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div>
                  <label
                    htmlFor="address"
                    className="mb-1 block text-xs font-medium text-[var(--sea-ink)]"
                  >
                    Address <span className="text-[var(--danger-fg)]">*</span>
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    defaultValue={home.address || ""}
                    required
                    className="w-full rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="name"
                    className="mb-1 block text-xs font-medium text-[var(--sea-ink)]"
                  >
                    Home name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={home.name || ""}
                    className="w-full rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label
                      htmlFor="yearBuilt"
                      className="mb-1 block text-xs font-medium text-[var(--sea-ink)]"
                    >
                      Year built
                    </label>
                    <input
                      type="number"
                      id="yearBuilt"
                      name="yearBuilt"
                      defaultValue={home.yearBuilt || ""}
                      min="1800"
                      max="2100"
                      className="w-full rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="sqft"
                      className="mb-1 block text-xs font-medium text-[var(--sea-ink)]"
                    >
                      Sq ft
                    </label>
                    <input
                      type="number"
                      id="sqft"
                      name="sqft"
                      defaultValue={home.sqft || ""}
                      min="0"
                      className="w-full rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bedCount"
                      className="mb-1 block text-xs font-medium text-[var(--sea-ink)]"
                    >
                      Beds
                    </label>
                    <input
                      type="number"
                      id="bedCount"
                      name="bedCount"
                      defaultValue={home.bedCount || ""}
                      min="0"
                      className="w-full rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bathCount"
                      className="mb-1 block text-xs font-medium text-[var(--sea-ink)]"
                    >
                      Baths
                    </label>
                    <input
                      type="number"
                      id="bathCount"
                      name="bathCount"
                      defaultValue={home.bathCount || ""}
                      min="0"
                      step="0.5"
                      className="w-full rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-sm border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-fg)]">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-sm bg-[var(--lagoon-deep)] px-4 py-1.5 text-xs font-semibold text-[var(--on-accent)] transition hover:opacity-90 disabled:opacity-50"
                  >
                    {pending ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setError(null);
                    }}
                    disabled={pending}
                    className="rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-1.5 text-xs font-semibold text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="shrink-0 rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)] transition hover:border-[var(--lagoon-deep)] hover:text-[var(--lagoon-deep)]"
            >
              Edit
            </button>
          )}
        </div>
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
