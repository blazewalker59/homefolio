import { useState } from "react";
import { X } from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
import type { itemTemplates, items } from "@/db/schema";

type Template = InferSelectModel<typeof itemTemplates>;
type ItemWithTemplate = InferSelectModel<typeof items> & {
  template?: Template;
};

/**
 * View + edit a single item in place. Used from the Rooms and Systems cards,
 * where an item belongs to a fixed room / system unit — so this edits the
 * item's own attributes (name + template fields) rather than its location.
 * Moving an item between rooms/units stays on the Items page.
 */
export function ItemDetailModal({
  item,
  locationLabel,
  onSave,
  onDelete,
  onCancel,
  pending,
}: {
  item: ItemWithTemplate;
  locationLabel?: string;
  onSave: (data: { name: string; fields: Record<string, unknown> }) => void;
  onDelete: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(item.name);
  const [fields, setFields] = useState<Record<string, unknown>>(item.fields ?? {});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const templateFields = item.template?.fields ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), fields });
  }

  function handleFieldChange(key: string, value: unknown) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-lg">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-[var(--sea-ink)]">{item.name}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--sea-ink-soft)]">
              {item.template?.name && <span>{item.template.name}</span>}
              {item.template?.category && (
                <span className="inline-flex rounded-full bg-[var(--lagoon-deep)]/10 px-2 py-0.5 font-medium text-[var(--lagoon-deep)]">
                  {item.template.category}
                </span>
              )}
            </div>
            {locationLabel && (
              <p className="mt-1.5 text-xs text-[var(--sea-ink-soft)]">
                Location: <span className="font-medium text-[var(--sea-ink)]">{locationLabel}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            aria-label="Close"
            className="-mr-1 -mt-1 shrink-0 rounded-sm p-1 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)] disabled:opacity-50"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
              Item Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm"
            />
          </div>

          {templateFields.map((field) => (
            <div key={field.key}>
              <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
                {field.label}
              </label>
              {field.type === "select" ? (
                <select
                  value={(fields[field.key] as string) ?? ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm"
                >
                  <option value="">Select...</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === "boolean" ? (
                <input
                  type="checkbox"
                  checked={(fields[field.key] as boolean) ?? false}
                  onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                  className="rounded"
                />
              ) : (
                <input
                  type={
                    field.type === "number" ? "number" : field.type === "date" ? "date" : "text"
                  }
                  value={(fields[field.key] as string) ?? ""}
                  onChange={(e) =>
                    handleFieldChange(
                      field.key,
                      field.type === "number" ? Number(e.target.value) : e.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm"
                />
              )}
            </div>
          ))}

          {templateFields.length === 0 && (
            <p className="text-sm text-[var(--sea-ink-soft)]">
              No additional details for this item.
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            {confirmDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--danger-fg)] transition hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Confirm delete"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={pending}
                className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[var(--sea-ink-soft)] transition hover:border-[var(--danger-border)] hover:text-[var(--danger-fg)] disabled:opacity-50"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="ml-auto rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-[var(--on-accent)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
