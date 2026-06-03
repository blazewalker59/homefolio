import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getHomeFn } from "@/server/home";
import { listHomeDocumentsFn, deleteDocumentFn } from "@/server/document";
import { listRoomsFn } from "@/server/room";
import { listSystemsFn } from "@/server/system";
import { listItemsFn } from "@/server/item";
import { DocumentUpload } from "@/components/DocumentUpload";
import type { documents } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Document = InferSelectModel<typeof documents>;

export const Route = createFileRoute("/documents")({
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

  function handleUploadComplete() {
    setShowUpload(false);
    setSelectedEntity(null);
    // Reload documents
    listHomeDocumentsFn().then((docs) => setDocuments(docs as Document[]));
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <p className="island-kicker mb-3">Documents</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          {home.name || "My Home"}
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Upload and manage receipts, manuals, warranties, and other documents.
        </p>

        <button
          onClick={() => setShowUpload(true)}
          className="rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Upload Document
        </button>
      </section>

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
                  className="rounded-lg border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--lagoon-deep)]"
                >
                  <div className="font-medium text-[var(--sea-ink)]">Home</div>
                  <div className="text-xs text-[var(--sea-ink-soft)]">General home documents</div>
                </button>

                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedEntity({ type: "room", id: room.id })}
                    className="rounded-lg border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--lagoon-deep)]"
                  >
                    <div className="font-medium text-[var(--sea-ink)]">{room.name}</div>
                    <div className="text-xs text-[var(--sea-ink-soft)]">Room</div>
                  </button>
                ))}

                {systems.map((system) => (
                  <button
                    key={system.id}
                    onClick={() => setSelectedEntity({ type: "system", id: system.id })}
                    className="rounded-lg border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--lagoon-deep)]"
                  >
                    <div className="font-medium text-[var(--sea-ink)]">{system.name}</div>
                    <div className="text-xs text-[var(--sea-ink-soft)]">System</div>
                  </button>
                ))}

                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedEntity({ type: "item", id: item.id })}
                    className="rounded-lg border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--lagoon-deep)]"
                  >
                    <div className="font-medium text-[var(--sea-ink)]">{item.name}</div>
                    <div className="text-xs text-[var(--sea-ink-soft)]">Item</div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowUpload(false)}
                className="mt-4 rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-gray-50"
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
                className="mt-4 rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-gray-50"
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
                className="island-shell flex items-center justify-between rounded-lg border border-[var(--line)] bg-white p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--sea-ink)]">{doc.filename}</span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-[var(--sea-ink-soft)]">
                      {doc.type}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-[var(--sea-ink-soft)]">
                      {doc.entityType}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--sea-ink-soft)]">
                    {formatFileSize(doc.size)} • Uploaded {formatDate(doc.createdAt)}
                  </div>
                  {doc.notes && (
                    <div className="mt-1 text-xs text-[var(--sea-ink-soft)] italic">
                      {doc.notes}
                    </div>
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
