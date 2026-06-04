import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth/hooks";
import { updateHomeFn } from "@/server/home";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

function SetupPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      void navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setPending(false);
    }
  }

  return (
    <main className="page-wrap flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <section className="w-full max-w-2xl border-t-2 border-[var(--lagoon-deep)] bg-[var(--surface-strong)] px-7 py-9 shadow-[0_24px_60px_-40px_rgba(26,24,20,0.4)] backdrop-blur sm:px-10 sm:py-12">
        <p className="island-kicker mb-3">Issue No. 001</p>
        <h1 className="display-title mb-3 text-4xl text-[var(--sea-ink)] sm:text-5xl">
          Open the file<span className="text-[var(--lagoon-deep)]">.</span>
        </h1>
        <p className="mb-8 max-w-xl font-serif text-base italic text-[var(--sea-ink-soft)] sm:text-lg">
          A few details about the property. You can revise everything later.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="address"
              className="mb-2 block text-sm font-medium text-[var(--sea-ink)]"
            >
              Address <span className="text-[var(--danger-fg)]">*</span>
            </label>
            <input
              type="text"
              id="address"
              name="address"
              required
              placeholder="123 Main St, City, State"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
          </div>

          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
              Home name (optional)
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="My Home"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="yearBuilt"
                className="mb-2 block text-sm font-medium text-[var(--sea-ink)]"
              >
                Year built
              </label>
              <input
                type="number"
                id="yearBuilt"
                name="yearBuilt"
                placeholder="1990"
                min="1800"
                max="2100"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              />
            </div>

            <div>
              <label
                htmlFor="sqft"
                className="mb-2 block text-sm font-medium text-[var(--sea-ink)]"
              >
                Square footage
              </label>
              <input
                type="number"
                id="sqft"
                name="sqft"
                placeholder="2000"
                min="0"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="bedCount"
                className="mb-2 block text-sm font-medium text-[var(--sea-ink)]"
              >
                Bedrooms
              </label>
              <input
                type="number"
                id="bedCount"
                name="bedCount"
                placeholder="3"
                min="0"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              />
            </div>

            <div>
              <label
                htmlFor="bathCount"
                className="mb-2 block text-sm font-medium text-[var(--sea-ink)]"
              >
                Bathrooms
              </label>
              <input
                type="number"
                id="bathCount"
                name="bathCount"
                placeholder="2"
                min="0"
                step="0.5"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-[var(--on-accent)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {pending ? "Saving…" : "Save and continue"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
