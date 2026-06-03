import { useState, useEffect } from "react";
import { listDocumentsFn, deleteDocumentFn } from "@/server/document";
import type { DocumentEntityType } from "@/lib/storage/types";
import type { documents } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Document = InferSelectModel<typeof documents>;

interface DocumentListProps {
  entityType: DocumentEntityType;
  entityId: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  receipt: "Receipt",
  image: "Image",
  manual: "Manual",
  warranty: "Warranty",
  contract: "Contract",
  other: "Other",
};

export function DocumentList({ entityType, entityId }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadDocuments() {
    setLoading(true);
    try {
      const docs = await listDocumentsFn({
        data: { entityType, entityId },
      });
      setDocuments(docs as Document[]);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, [entityType, entityId]);

  async function handleDelete(documentId: string) {
    if (!confirm("Are you sure you want to delete this document?")) return;

    setDeleting(documentId);
    try {
      await deleteDocumentFn({ data: { documentId } });
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return <div className="text-sm text-[var(--sea-ink-soft)]">Loading documents...</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--sea-ink-soft)]">
        No documents yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-white p-3"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--sea-ink)]">{doc.filename}</span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-[var(--sea-ink-soft)]">
                {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
              </span>
            </div>
            <div className="mt-1 text-xs text-[var(--sea-ink-soft)]">
              {formatFileSize(doc.size)} • Uploaded {formatDate(doc.createdAt)}
            </div>
            {doc.notes && (
              <div className="mt-1 text-xs text-[var(--sea-ink-soft)] italic">{doc.notes}</div>
            )}
          </div>
          <button
            onClick={() => handleDelete(doc.id)}
            disabled={deleting === doc.id}
            className="ml-4 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            {deleting === doc.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      ))}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString();
}
