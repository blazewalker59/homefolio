import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { homes } from "@/db/schema";
import { signOut, useAuth } from "@/lib/auth/hooks";
import { updateHomeFn } from "@/server/home";
import ThemeToggle from "./ThemeToggle";

type Home = InferSelectModel<typeof homes>;

export default function ConfigSidebar({
  home,
  totalInvested,
  idPrefix = "cfg",
}: {
  home: Home;
  totalInvested: number;
  /** Disambiguates input ids when the sidebar is mounted twice (desktop column + mobile drawer). */
  idPrefix?: string;
}) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats: Array<{ kicker: string; value: string }> = [];
  if (home.yearBuilt) stats.push({ kicker: "Year Built", value: String(home.yearBuilt) });
  if (home.sqft) stats.push({ kicker: "Sq Ft", value: home.sqft.toLocaleString() });
  if (home.bedCount || home.bathCount) {
    stats.push({ kicker: "Layout", value: `${home.bedCount ?? 0} bd · ${home.bathCount ?? 0} ba` });
  }

  const displayName = user?.displayName || user?.name || "Signed in";
  const avatar = user?.avatarUrl || user?.image || null;
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const address = (formData.get("address") as string) ?? "";
    const name = (formData.get("name") as string) ?? "";
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
    <div className="flex flex-col gap-7">
      {/* Account ---------------------------------------------------- */}
      <section>
        <p className="island-kicker mb-3">Account</p>
        <div className="flex items-center gap-3">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full border border-[var(--line)] object-cover"
            />
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)] font-serif text-base font-bold text-[var(--lagoon-deep)]">
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--sea-ink)]">{displayName}</p>
            {user?.email && (
              <p className="truncate text-xs text-[var(--sea-ink-soft)]">{user.email}</p>
            )}
          </div>
        </div>
      </section>

      {/* Active home ------------------------------------------------ */}
      <section className="border-t border-[var(--line)] pt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="island-kicker">Active Home</p>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-2.5 py-1 text-xs font-medium text-[var(--sea-ink)] transition hover:border-[var(--lagoon-deep)] hover:text-[var(--lagoon-deep)]"
            >
              Edit
            </button>
          )}
        </div>

        {!isEditing ? (
          <>
            <h2 className="font-serif text-lg font-bold text-[var(--sea-ink)]">
              {home.name || "My Home"}
            </h2>
            {home.address && (
              <p className="mt-0.5 text-xs text-[var(--sea-ink-soft)]">{home.address}</p>
            )}

            {stats.length > 0 && (
              <dl className="mt-4 grid grid-cols-2 gap-3">
                {stats.map((s) => (
                  <div key={s.kicker}>
                    <dt className="text-[0.58rem] uppercase tracking-[0.16em] text-[var(--sea-ink-soft)]">
                      {s.kicker}
                    </dt>
                    <dd className="text-sm font-semibold text-[var(--sea-ink)]">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-4 rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2.5">
              <p className="text-[0.58rem] uppercase tracking-[0.16em] text-[var(--sea-ink-soft)]">
                Total Invested
              </p>
              <p className="font-serif text-xl font-bold text-[var(--lagoon-deep)]">
                $
                {totalInvested.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label
                htmlFor={`${idPrefix}-address`}
                className="mb-1 block text-xs font-medium text-[var(--sea-ink)]"
              >
                Address <span className="text-[var(--danger-fg)]">*</span>
              </label>
              <input
                type="text"
                id={`${idPrefix}-address`}
                name="address"
                defaultValue={home.address || ""}
                required
                className="w-full rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              />
            </div>
            <div>
              <label
                htmlFor={`${idPrefix}-name`}
                className="mb-1 block text-xs font-medium text-[var(--sea-ink)]"
              >
                Home name
              </label>
              <input
                type="text"
                id={`${idPrefix}-name`}
                name="name"
                defaultValue={home.name || ""}
                className="w-full rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor={`${idPrefix}-yearBuilt`}
                  className="mb-1 block text-xs font-medium text-[var(--sea-ink)]"
                >
                  Year built
                </label>
                <input
                  type="number"
                  id={`${idPrefix}-yearBuilt`}
                  name="yearBuilt"
                  defaultValue={home.yearBuilt || ""}
                  min="1800"
                  max="2100"
                  className="w-full rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>
              <div>
                <label
                  htmlFor={`${idPrefix}-sqft`}
                  className="mb-1 block text-xs font-medium text-[var(--sea-ink)]"
                >
                  Sq ft
                </label>
                <input
                  type="number"
                  id={`${idPrefix}-sqft`}
                  name="sqft"
                  defaultValue={home.sqft || ""}
                  min="0"
                  className="w-full rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>
              <div>
                <label
                  htmlFor={`${idPrefix}-bedCount`}
                  className="mb-1 block text-xs font-medium text-[var(--sea-ink)]"
                >
                  Beds
                </label>
                <input
                  type="number"
                  id={`${idPrefix}-bedCount`}
                  name="bedCount"
                  defaultValue={home.bedCount || ""}
                  min="0"
                  className="w-full rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>
              <div>
                <label
                  htmlFor={`${idPrefix}-bathCount`}
                  className="mb-1 block text-xs font-medium text-[var(--sea-ink)]"
                >
                  Baths
                </label>
                <input
                  type="number"
                  id={`${idPrefix}-bathCount`}
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

            <div className="flex gap-2 pt-1">
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
      </section>

      {/* Tools ------------------------------------------------------ */}
      <section className="border-t border-[var(--line)] pt-6">
        <p className="island-kicker mb-3">Tools</p>
        <Link
          to="/search"
          search={{ q: "" }}
          className="flex items-center justify-between rounded-sm px-2 py-2 text-sm font-medium text-[var(--sea-ink)] no-underline transition hover:bg-[var(--link-bg-hover)]"
        >
          <span>Search</span>
          <span aria-hidden="true">🔍</span>
        </Link>
        <div className="mt-3 flex items-center justify-between px-2">
          <span className="text-sm font-medium text-[var(--sea-ink-soft)]">Theme</span>
          <ThemeToggle />
        </div>
      </section>

      {/* Sign out --------------------------------------------------- */}
      <section className="border-t border-[var(--line)] pt-6">
        <button
          type="button"
          onClick={() => signOut()}
          className="w-full rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-medium text-[var(--sea-ink)] transition hover:border-[var(--danger-border)] hover:text-[var(--danger-fg)]"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
