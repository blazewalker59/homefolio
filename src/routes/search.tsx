import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getHomeFn } from "@/server/home";
import { searchFn } from "@/server/search";
import type { SearchResult, SearchResults } from "@/lib/search";

export const Route = createFileRoute("/search")({
  validateSearch: (search) => ({
    q: (search.q as string) || "",
  }),
  loaderDeps: ({ search: { q } }) => ({ q }),
  loader: async ({ deps: { q } }) => {
    try {
      const home = await getHomeFn();
      if (!home?.address) {
        throw redirect({ to: "/setup" });
      }

      let results: SearchResults = {
        rooms: [],
        systems: [],
        items: [],
        documents: [],
        activities: [],
        total: 0,
      };

      if (q.trim()) {
        results = await searchFn({ data: { query: q } });
      }

      return { home, results, query: q };
    } catch (err) {
      if (err instanceof Error && err.message === "Not authenticated") {
        throw redirect({ to: "/sign-in" });
      }
      throw err;
    }
  },
  component: SearchPage,
});

function SearchPage() {
  const { home, results, query } = Route.useLoaderData();
  const [searchInput, setSearchInput] = useState(query);
  const navigate = Route.useNavigate();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate({ search: { q: searchInput.trim() } });
    }
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="rise-in border-b border-[var(--line)] pb-10 sm:pb-12">
        <div className="mb-6 flex items-center justify-between text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[var(--sea-ink-soft)]">
          <span>{home.name || "My Home"}</span>
          <span className="font-mono text-[var(--lagoon-deep)]">Discovery</span>
        </div>
        <p className="island-kicker mb-4">Find anything</p>
        <h1 className="display-title mb-5 max-w-3xl text-5xl text-[var(--sea-ink)] sm:text-7xl">
          Search<span className="text-[var(--lagoon-deep)]">.</span>
        </h1>
        <p className="mb-8 max-w-2xl font-serif text-lg italic text-[var(--sea-ink-soft)] sm:text-xl">
          Search across rooms, systems, items, documents, and activities.
        </p>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search..."
              className="flex-1 rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-sm bg-[var(--lagoon-deep)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--on-accent)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Search
            </button>
          </div>
        </form>
      </section>

      {query && (
        <section className="mt-8">
          {results.total === 0 ? (
            <div className="island-shell rounded-2xl p-8 text-center">
              <p className="text-sm text-[var(--sea-ink-soft)]">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-8">
              {results.rooms.length > 0 && (
                <ResultSection
                  title="Rooms"
                  count={results.rooms.length}
                  results={results.rooms}
                  icon="🏠"
                />
              )}

              {results.systems.length > 0 && (
                <ResultSection
                  title="Systems"
                  count={results.systems.length}
                  results={results.systems}
                  icon="⚙️"
                />
              )}

              {results.items.length > 0 && (
                <ResultSection
                  title="Items"
                  count={results.items.length}
                  results={results.items}
                  icon="📦"
                />
              )}

              {results.documents.length > 0 && (
                <ResultSection
                  title="Documents"
                  count={results.documents.length}
                  results={results.documents}
                  icon="📄"
                />
              )}

              {results.activities.length > 0 && (
                <ResultSection
                  title="Activities"
                  count={results.activities.length}
                  results={results.activities}
                  icon="📝"
                />
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function ResultSection({
  title,
  count,
  results,
  icon,
}: {
  title: string;
  count: number;
  results: SearchResult[];
  icon: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h2 className="text-xl font-bold text-[var(--sea-ink)]">{title}</h2>
        <span className="rounded bg-[var(--chip-bg)] px-2 py-0.5 text-xs text-[var(--sea-ink-soft)]">
          {count}
        </span>
      </div>
      <div className="space-y-2">
        {results.map((result) => (
          <Link
            key={result.id}
            to={result.url}
            className="feature-card block rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-4 transition hover:border-[var(--lagoon-deep)]"
          >
            <div className="font-medium text-[var(--sea-ink)]">{result.name}</div>
            {result.description && (
              <div className="mt-1 text-sm text-[var(--sea-ink-soft)]">{result.description}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
