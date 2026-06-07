import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getHomeFn } from "@/server/home";
import { listHomeDocumentsFn, deleteDocumentFn, updateDocumentFn } from "@/server/document";
import { listRoomsFn } from "@/server/room";
import { listSystemsFn } from "@/server/system";
import { listItemsFn } from "@/server/item";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DropdownMenu } from "@/components/DropdownMenu";
import type { documents } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import type { DocumentType, DocumentEntityType } from "@/lib/storage/types";

type Document = InferSelectModel<typeof documents>;

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

export const Route = createFileRoute("/_app/documents")({
  loader: async () => {
    try {
      const home = await getHomeFn();
      if (!home?.address) {
        throw redirect({ to: "/setup" });
      }

      const [docs, roomsList, systemsList, itemsList] = await Promise.all([
        listHomeDocumentsFn(),
        listRoomsFn(),
        listSystemsFn(),
        listItemsFn(),
      ]);

      return {
        home,
        documents: docs as Document[],
        rooms: roomsList,
        systems: systemsList,
        items: itemsList,
      };
    } catch (err) {
      if (err instanceof Error && err.message === "Not authenticated") {
        throw redirect({ to: "/sign-in" });
      }
      throw err;
    }
  },
  component: DocumentsPage,
});

function DocumentsPage() {
  const { home, documents: initialDocs, rooms, systems, items } = Route.useLoaderData();
  const [documents, setDocuments] = useState(initialDocs);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{
    type: "home" | "room" | "system" | "item";
    id: string;
  } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editType, setEditType] = useState<DocumentType>("other");
  const [editEntityType, setEditEntityType] = useState<DocumentEntityType>("home");
  const [editEntityId, setEditEntityId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [saving, setSaving] = useState(false);

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
    setEditEntityType(doc.entityType as DocumentEntityType);
    setEditEntityId(doc.entityId);
    setEditNotes(doc.notes || "");
    setEditAmount(doc.amount || "");
  }

  function cancelEdit() {
    setEditing(null);
    setEditType("other");
    setEditEntityType("home");
    setEditEntityId("");
    setEditNotes("");
    setEditAmount("");
  }

  async function saveEdit(documentId: string) {
    setSaving(true);
    try {
      const updated = await updateDocumentFn({
        data: {
          documentId,
          type: editType,
          entityType: editEntityType,
          entityId: editEntityId,
          notes: editNotes || undefined,
          amount: editType === "receipt" ? editAmount || null : null,
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

  function handleUploadComplete() {
    setShowUpload(false);
    setSelectedEntity(null);
    listHomeDocumentsFn().then((docs) => setDocuments(docs as Document[]));
  }

  function getEntityName(entityType: string, entityId: string): string {
    if (entityType === "home") return home.name || "Home";
    if (entityType === "room") {
      const room = rooms.find((r) => r.id === entityId);
      return room?.name || "Room";
    }
    if (entityType === "system") {
      const system = systems.find((s) => s.id === entityId);
      return system?.name || "System";
    }
    if (entityType === "item") {
      const item = items.find((i) => i.id === entityId);
      return item?.name || "Item";
    }
    return entityId;
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-6">
      <header className="rise-in mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <p className="island-kicker mb-1">The paper trail</p>
          <h1 className="font-serif text-2xl font-bold text-[var(--sea-ink)] sm:text-3xl">
            Documents
          </h1>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="rounded-sm bg-[var(--lagoon-deep)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--on-accent)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Upload Document
        </button>
      </header>

      {showUpload && (
        <section className="island-shell mt-8 rounded-2xl p-6">
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">Upload Document</h2>

          {!selectedEntity ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--sea-ink-soft)]">
                What would you like to attach this document to?
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => setSelectedEntity({ type: "home", id: home.id })}
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-left transition hover:border-[var(--lagoon-deep)]"
                >
                  <div className="font-medium text-[var(--sea-ink)]">Home</div>
                  <div className="text-xs text-[var(--sea-ink-soft)]">General home documents</div>
                </button>

                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedEntity({ type: "room", id: room.id })}
                    className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-left transition hover:border-[var(--lagoon-deep)]"
                  >
                    <div className="font-medium text-[var(--sea-ink)]">{room.name}</div>
                    <div className="text-xs text-[var(--sea-ink-soft)]">Room</div>
                  </button>
                ))}

                {systems.map((system) => (
                  <button
                    key={system.id}
                    onClick={() => setSelectedEntity({ type: "system", id: system.id })}
                    className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-left transition hover:border-[var(--lagoon-deep)]"
                  >
                    <div className="font-medium text-[var(--sea-ink)]">{system.name}</div>
                    <div className="text-xs text-[var(--sea-ink-soft)]">System</div>
                  </button>
                ))}

                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedEntity({ type: "item", id: item.id })}
                    className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-left transition hover:border-[var(--lagoon-deep)]"
                  >
                    <div className="font-medium text-[var(--sea-ink)]">{item.name}</div>
                    <div className="text-xs text-[var(--sea-ink-soft)]">Item</div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowUpload(false)}
                className="mt-4 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-6 py-3 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-[var(--sea-ink-soft)]">
                  Uploading to: <strong>{selectedEntity.type}</strong>
                </p>
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="text-sm text-[var(--lagoon-deep)] underline"
                >
                  Change
                </button>
              </div>

              <DocumentUpload
                entityType={selectedEntity.type}
                entityId={selectedEntity.id}
                onUploadComplete={handleUploadComplete}
              />

              <button
                onClick={() => setShowUpload(false)}
                className="mt-4 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-6 py-3 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)]"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">All Documents</h2>

        {documents.length === 0 ? (
          <div className="island-shell rounded-2xl p-8 text-center">
            <p className="text-sm text-[var(--sea-ink-soft)]">
              No documents yet. Upload your first document to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="island-shell rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-4"
              >
                {editing === doc.id ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
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
                          Attached to
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={editEntityType}
                            onChange={(e) => {
                              const newType = e.target.value as DocumentEntityType;
                              setEditEntityType(newType);
                              if (newType === "home") setEditEntityId(home.id);
                            }}
                            className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--sea-ink)]"
                          >
                            <option value="home">Home</option>
                            <option value="room">Room</option>
                            <option value="system">System</option>
                            <option value="item">Item</option>
                          </select>
                          {editEntityType !== "home" && (
                            <select
                              value={editEntityId}
                              onChange={(e) => setEditEntityId(e.target.value)}
                              className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--sea-ink)]"
                            >
                              <option value="">Select...</option>
                              {editEntityType === "room" &&
                                rooms.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name}
                                  </option>
                                ))}
                              {editEntityType === "system" &&
                                systems.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              {editEntityType === "item" &&
                                items.map((i) => (
                                  <option key={i.id} value={i.id}>
                                    {i.name}
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                    {editType === "receipt" && (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]">
                          Amount ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--sea-ink)]"
                        />
                      </div>
                    )}
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
                        {doc.type === "receipt" && doc.amount && (
                          <span className="rounded bg-[var(--chip-bg)] px-2 py-0.5 text-xs font-medium text-[var(--sea-ink)]">
                            ${parseFloat(doc.amount).toFixed(2)}
                          </span>
                        )}
                        <span className="rounded bg-[var(--chip-bg)] px-2 py-0.5 text-xs text-[var(--sea-ink-soft)]">
                          {getEntityName(doc.entityType, doc.entityId)}
                        </span>
                        <span className="text-xs text-[var(--sea-ink-soft)]">
                          {formatFileSize(doc.size)} • Uploaded {formatDate(doc.createdAt)}
                        </span>
                      </div>
                      {doc.notes && (
                        <div className="mt-2 text-xs text-[var(--sea-ink-soft)] italic">
                          {doc.notes}
                        </div>
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
        )}
      </section>
    </main>
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
