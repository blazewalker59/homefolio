import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getHomeFn } from "@/server/home";
import { listActivitiesFn, createActivityFn, deleteActivityFn } from "@/server/activity";
import { DropdownMenu } from "@/components/DropdownMenu";
import type { activities } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import { ACTIVITY_TYPES } from "@/lib/activity";
import type { ActivityType } from "@/lib/activity";

type Activity = InferSelectModel<typeof activities>;

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  maintenance: "Maintenance",
  purchase: "Purchase",
  improvement: "Improvement",
  repair: "Repair",
  inspection: "Inspection",
  other: "Other",
};

const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  maintenance: "🔧",
  purchase: "🧾",
  improvement: "🏠",
  repair: "🔨",
  inspection: "🔍",
  other: "📝",
};

export const Route = createFileRoute("/_app/activities")({
  loader: async () => {
    try {
      const home = await getHomeFn();
      if (!home?.address) {
        throw redirect({ to: "/setup" });
      }

      const activitiesList = await listActivitiesFn();

      return {
        home,
        activities: activitiesList as Activity[],
      };
    } catch (err) {
      if (err instanceof Error && err.message === "Not authenticated") {
        throw redirect({ to: "/sign-in" });
      }
      throw err;
    }
  },
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const { activities: initialActivities } = Route.useLoaderData();
  const [activities, setActivities] = useState(initialActivities);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<ActivityType>("other");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formDescription, setFormDescription] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    // Type filter
    if (typeFilter && activity.type !== typeFilter) return false;

    // Date range filter
    if (dateFrom) {
      const activityDate = new Date(activity.timestamp);
      const fromDate = new Date(dateFrom);
      if (activityDate < fromDate) return false;
    }
    if (dateTo) {
      const activityDate = new Date(activity.timestamp);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      if (activityDate > toDate) return false;
    }

    return true;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const activity = await createActivityFn({
        data: {
          type: formType,
          timestamp: new Date(formDate).toISOString(),
          description: formDescription,
          notes: formNotes || undefined,
        },
      });
      setActivities((prev) =>
        [activity, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      );
      setShowForm(false);
      setFormType("other");
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormDescription("");
      setFormNotes("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create activity");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(activityId: string) {
    if (!confirm("Are you sure you want to delete this activity?")) return;

    setDeleting(activityId);
    try {
      await deleteActivityFn({ data: { activityId } });
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete activity");
    } finally {
      setDeleting(null);
    }
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-6">
      <header className="rise-in mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <p className="island-kicker mb-1">The chronicle</p>
          <h1 className="font-serif text-2xl font-bold text-[var(--sea-ink)] sm:text-3xl">
            Activities
          </h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-sm bg-[var(--lagoon-deep)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--on-accent)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Log Activity
        </button>
      </header>

      {showForm && (
        <section className="island-shell mt-8 rounded-2xl p-6">
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">Log New Activity</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="activity-type"
                className="mb-1.5 block text-sm font-medium text-[var(--sea-ink)]"
              >
                Type
              </label>
              <select
                id="activity-type"
                value={formType}
                onChange={(e) => setFormType(e.target.value as ActivityType)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              >
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ACTIVITY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="activity-date"
                className="mb-1.5 block text-sm font-medium text-[var(--sea-ink)]"
              >
                Date
              </label>
              <input
                id="activity-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              />
            </div>

            <div>
              <label
                htmlFor="activity-description"
                className="mb-1.5 block text-sm font-medium text-[var(--sea-ink)]"
              >
                Description <span className="text-red-500">*</span>
              </label>
              <input
                id="activity-description"
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What happened?"
                required
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              />
            </div>

            <div>
              <label
                htmlFor="activity-notes"
                className="mb-1.5 block text-sm font-medium text-[var(--sea-ink)]"
              >
                Notes{" "}
                <span className="text-sm font-normal text-[var(--sea-ink-soft)]">(optional)</span>
              </label>
              <textarea
                id="activity-notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Additional details..."
                rows={3}
                className="w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-sm bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-[var(--on-accent)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {submitting ? "Saving..." : "Log Activity"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormType("other");
                  setFormDate(new Date().toISOString().split("T")[0]);
                  setFormDescription("");
                  setFormNotes("");
                }}
                className="flex-1 rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-6 py-3 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)]"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">Timeline</h2>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-4">
          <div className="flex items-center gap-2">
            <label htmlFor="type-filter" className="text-sm font-medium text-[var(--sea-ink-soft)]">
              Type:
            </label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            >
              <option value="">All types</option>
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ACTIVITY_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="date-from" className="text-sm font-medium text-[var(--sea-ink-soft)]">
              From:
            </label>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="date-to" className="text-sm font-medium text-[var(--sea-ink-soft)]">
              To:
            </label>
            <input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
          </div>

          {(typeFilter || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setTypeFilter("");
                setDateFrom("");
                setDateTo("");
              }}
              className="rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm font-medium text-[var(--sea-ink)] transition hover:border-[var(--lagoon-deep)] hover:text-[var(--lagoon-deep)]"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-[var(--sea-ink-soft)]">
            {filteredActivities.length} of {activities.length} activities
          </span>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="island-shell rounded-2xl p-8 text-center">
            <p className="text-sm text-[var(--sea-ink-soft)]">
              {activities.length === 0
                ? "No activities yet. Log your first activity or add items to auto-generate entries."
                : "No activities match your filters."}
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-[var(--line)] pl-6">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="relative mb-6 last:mb-0">
                <div className="absolute -left-[31px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--line)] bg-[var(--surface-strong)] text-xs">
                  {ACTIVITY_TYPE_ICONS[activity.type] || "📝"}
                </div>

                <div className="feature-card rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="inline-flex rounded bg-[var(--chip-bg)] px-2 py-0.5 text-xs font-medium text-[var(--sea-ink)]">
                          {ACTIVITY_TYPE_LABELS[activity.type]}
                        </span>
                        <span className="text-xs text-[var(--sea-ink-soft)]">
                          {formatRelativeTime(new Date(activity.timestamp))}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[var(--sea-ink)]">
                        {activity.description}
                      </p>
                      {activity.notes && (
                        <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">{activity.notes}</p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenu.Item
                        onClick={() => handleDelete(activity.id)}
                        variant="danger"
                        disabled={deleting === activity.id}
                      >
                        Delete
                      </DropdownMenu.Item>
                    </DropdownMenu>
                  </div>

                  <div className="text-xs text-[var(--sea-ink-soft)]">
                    {formatDate(new Date(activity.timestamp))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
