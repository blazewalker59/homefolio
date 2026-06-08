import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, Package, X } from "lucide-react";
import { listItemsByRoomFn } from "@/server/item";
import { getRoomInvestmentFn } from "@/server/document";
import { getRoomCategory } from "@/lib/room-categories";
import type { InferSelectModel } from "drizzle-orm";
import type { items as itemsTable, itemTemplates, TemplateField } from "@/db/schema";

type Template = InferSelectModel<typeof itemTemplates>;
type Item = InferSelectModel<typeof itemsTable> & { template?: Template };

/** Read-only display value for a template field. */
function formatValue(field: TemplateField, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.type === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/**
 * Inline slide-over that previews a room's inventory without leaving the
 * blueprint. Opened by clicking a linked shape in View mode.
 */
export function RoomPeek({
  roomId,
  roomName,
  category,
  onClose,
  onManage,
}: {
  roomId: string;
  roomName: string;
  category?: string;
  onClose: () => void;
  onManage: () => void;
}) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [invested, setInvested] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setExpandedId(null);
    setInvested(null);
    listItemsByRoomFn({ data: { roomId } })
      .then((rows) => {
        if (!cancelled) setItems(rows as Item[]);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    getRoomInvestmentFn({ data: { roomId } })
      .then((res) => {
        if (!cancelled) setInvested(res.total);
      })
      .catch(() => {
        if (!cancelled) setInvested(null);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const investedLabel =
    invested === null
      ? null
      : invested.toLocaleString(undefined, { style: "currency", currency: "USD" });

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const categoryLabel = category ? getRoomCategory(category)?.label : null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close room preview"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <aside className="absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col overflow-y-auto border-l border-[var(--line)] bg-[var(--bg-base)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0">
            <p className="island-kicker mb-1">Room</p>
            <h2 className="truncate font-serif text-xl font-bold text-[var(--sea-ink)]">
              {roomName}
            </h2>
            {categoryLabel && <p className="text-xs text-[var(--sea-ink-soft)]">{categoryLabel}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-sm p-1 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 px-5 py-4">
          {/* Running investment in this room (room + item receipts). */}
          <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3">
            <p className="island-kicker mb-0.5">Invested in this room</p>
            <p className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
              {investedLabel ?? "…"}
            </p>
          </div>

          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--sea-ink-soft)]">
            <Package className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            Inventory
          </p>

          {items === null ? (
            <p className="text-sm text-[var(--sea-ink-soft)]">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[var(--sea-ink-soft)]">No items in this room yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((item) => {
                const expanded = expandedId === item.id;
                const templateFields = item.template?.fields ?? [];
                const fields = (item.fields ?? {}) as Record<string, unknown>;
                return (
                  <li
                    key={item.id}
                    className="overflow-hidden rounded-lg bg-[var(--link-bg-hover)]"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                      aria-expanded={expanded}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-[var(--lagoon-deep)]/10"
                    >
                      <span className="truncate text-sm text-[var(--sea-ink)]">{item.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {item.template && (
                          <span className="text-xs text-[var(--sea-ink-soft)]">
                            {item.template.category}
                          </span>
                        )}
                        <ChevronDown
                          className={`h-4 w-4 text-[var(--sea-ink-soft)] transition-transform ${
                            expanded ? "rotate-180" : ""
                          }`}
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      </span>
                    </button>

                    {expanded && (
                      <dl className="space-y-1.5 border-t border-[var(--line)] px-3 py-2.5">
                        {item.template?.name && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-xs text-[var(--sea-ink-soft)]">Type</dt>
                            <dd className="text-right text-xs font-medium text-[var(--sea-ink)]">
                              {item.template.name}
                            </dd>
                          </div>
                        )}
                        {templateFields.map((field) => (
                          <div key={field.key} className="flex justify-between gap-3">
                            <dt className="text-xs text-[var(--sea-ink-soft)]">{field.label}</dt>
                            <dd className="text-right text-xs font-medium text-[var(--sea-ink)]">
                              {formatValue(field, fields[field.key])}
                            </dd>
                          </div>
                        ))}
                        {templateFields.length === 0 && !item.template?.name && (
                          <p className="text-xs text-[var(--sea-ink-soft)]">
                            No additional details.
                          </p>
                        )}
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--line)] px-5 py-4">
          <button
            type="button"
            onClick={onManage}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--lagoon-deep)] transition hover:underline"
          >
            Manage in Rooms
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </aside>
    </div>
  );
}
