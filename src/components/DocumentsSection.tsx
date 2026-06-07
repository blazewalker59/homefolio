import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { getDocumentUrlFn } from "@/server/document";
import type { InferSelectModel } from "drizzle-orm";
import type { documents } from "@/db/schema";

type Document = InferSelectModel<typeof documents>;

const TYPE_LABELS: Record<string, string> = {
  receipt: "Receipt",
  image: "Image",
  manual: "Manual",
  warranty: "Warranty",
  contract: "Contract",
  other: "Other",
};

/**
 * Collapsed list of documents linked to a room or system. Hidden entirely
 * when nothing is linked. Clicking a document fetches its signed URL and
 * opens it in a new tab.
 */
export function DocumentsSection({ documents }: { documents: Document[] }) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  if (documents.length === 0) return null;

  async function openDocument(documentId: string) {
    setOpening(documentId);
    try {
      const url = await getDocumentUrlFn({ data: { documentId } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to open document");
    } finally {
      setOpening(null);
    }
  }

  return (
    <div className="mt-3 border-t border-[var(--line)] pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-xs font-medium text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
      >
        <span className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          {documents.length} {documents.length === 1 ? "document" : "documents"}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {documents.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => openDocument(doc.id)}
              disabled={opening === doc.id}
              className="flex w-full items-center justify-between gap-2 rounded-lg bg-[var(--link-bg-hover)] px-3 py-1.5 text-left transition hover:bg-[var(--lagoon-deep)]/10 disabled:opacity-50"
            >
              <span className="truncate text-sm text-[var(--sea-ink)]">{doc.filename}</span>
              <span className="shrink-0 text-xs text-[var(--sea-ink-soft)]">
                {opening === doc.id ? "Opening…" : (TYPE_LABELS[doc.type] ?? doc.type)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
