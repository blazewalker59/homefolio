import { useState, useEffect } from "react";
import { listDocumentsFn, deleteDocumentFn, updateDocumentFn } from "@/server/document";
import { DropdownMenu } from "./DropdownMenu";
import type { DocumentEntityType, DocumentType } from "@/lib/storage/types";
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

const DOCUMENT_TYPE_OPTIONS: DocumentType[] = [
  "receipt",
  "image",
  "manual",
  "warranty",
  "contract",
  "other",
];

export function DocumentList({ entityType, entityId }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editType, setEditType] = useState<DocumentType>("other");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

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

  function startEdit(doc: Document) {
    setEditing(doc.id);
    setEditType(doc.type as DocumentType);
    setEditNotes(doc.notes || "");
  }

  function cancelEdit() {
    setEditing(null);
    setEditType("other");
    setEditNotes("");
  }

  async function saveEdit(documentId: string) {
    setSaving(true);
    try {
      const updated = await updateDocumentFn({
        data: {
          documentId,
          type: editType,
          notes: editNotes || undefined,
        },
      });
      setDocuments((prev) => prev.map((d) => (d.id === documentId ? { ...d, ...updated } : d)));
      cancelEdit();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update document");
    } finally {
      setSaving(false);
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
          className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3"
        >
          {editing === doc.id ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]">
                  Type
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as DocumentType)}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--sea-ink)]"
                >
                  {DOCUMENT_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {DOCUMENT_TYPE_LABELS[t] || t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]">
                  Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--sea-ink)]"
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(doc.id)}
                  disabled={saving}
                  className="rounded-lg bg-[var(--lagoon-deep)] px-4 py-1.5 text-xs font-medium text-[var(--on-accent)] transition hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-1.5 text-xs font-medium text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[var(--sea-ink)]">{doc.filename}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[var(--chip-bg)] px-2 py-0.5 text-xs text-[var(--sea-ink-soft)]">
                    {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                  </span>
                  <span className="text-xs text-[var(--sea-ink-soft)]">
                    {formatFileSize(doc.size)} • Uploaded {formatDate(doc.createdAt)}
                  </span>
                </div>
                {doc.notes && (
                  <div className="mt-2 text-xs text-[var(--sea-ink-soft)] italic">{doc.notes}</div>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenu.Item onClick={() => startEdit(doc)}>Edit</DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => handleDelete(doc.id)}
                  variant="danger"
                  disabled={deleting === doc.id}
                >
                  {deleting === doc.id ? "Deleting..." : "Delete"}
                </DropdownMenu.Item>
              </DropdownMenu>
            </div>
          )}
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
