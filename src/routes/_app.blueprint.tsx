import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  listFloorsFn,
  createFloorFn,
  updateFloorFn,
  reorderFloorsFn,
  deleteFloorFn,
} from "@/server/floor";
import { listShapesFn } from "@/server/shape";
import { listRoomsFn } from "@/server/room";
import { RoomPeek } from "@/components/blueprint/RoomPeek";
import type { InferSelectModel } from "drizzle-orm";
import type { floors, shapes, rooms } from "@/db/schema";

type Floor = InferSelectModel<typeof floors>;
type Shape = InferSelectModel<typeof shapes>;
type Room = InferSelectModel<typeof rooms>;

// react-konva touches `window`/`canvas`, so it must never run during SSR.
// Lazy-load it and only mount once we're on the client (see `mounted` below).
const BlueprintCanvas = lazy(() => import("@/components/blueprint/BlueprintCanvas"));

export const Route = createFileRoute("/_app/blueprint")({
  loader: async () => {
    try {
      const [floorsList, roomsList] = await Promise.all([listFloorsFn(), listRoomsFn()]);
      return { floors: floorsList as Floor[], rooms: roomsList as Room[] };
    } catch (err) {
      if (err instanceof Error && err.message === "Not authenticated") {
        throw redirect({ to: "/sign-in" });
      }
      throw err;
    }
  },
  component: BlueprintPage,
});

function BlueprintPage() {
  const { floors: initialFloors, rooms: initialRooms } = Route.useLoaderData();
  const [floors, setFloors] = useState(initialFloors);
  const [rooms, setRooms] = useState(initialRooms);
  // Default to View — the blueprint reads as a navigation surface; editing is a
  // deliberate switch that prevents accidental edits.
  const [mode, setMode] = useState<"edit" | "view">("view");
  const [peekRoomId, setPeekRoomId] = useState<string | null>(null);
  const navigate = useNavigate();

  const peekRoom = peekRoomId ? (rooms.find((r) => r.id === peekRoomId) ?? null) : null;
  const [selectedId, setSelectedId] = useState<string | null>(initialFloors[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const selected = floors.find((f) => f.id === selectedId) ?? null;

  // Client-only flag so the Konva canvas never renders during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Load shapes for the selected floor.
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [loadingShapes, setLoadingShapes] = useState(false);
  useEffect(() => {
    if (!selectedId) {
      setShapes([]);
      return;
    }
    let cancelled = false;
    setLoadingShapes(true);
    listShapesFn({ data: { floorId: selectedId } })
      .then((rows) => {
        if (!cancelled) setShapes(rows as Shape[]);
      })
      .catch(() => {
        if (!cancelled) setShapes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingShapes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function handleAdd() {
    const defaultName = `Floor ${floors.length + 1}`;
    setBusy(true);
    try {
      const created = (await createFloorFn({ data: { name: defaultName } })) as Floor;
      setFloors((prev) => [...prev, created]);
      setSelectedId(created.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add floor");
    } finally {
      setBusy(false);
    }
  }

  function startRename(floor: Floor) {
    setEditingId(floor.id);
    setDraftName(floor.name);
  }

  async function saveRename(floorId: string) {
    const name = draftName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const updated = (await updateFloorFn({ data: { floorId, name } })) as Floor;
      setFloors((prev) => prev.map((f) => (f.id === floorId ? updated : f)));
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to rename floor");
    } finally {
      setBusy(false);
    }
  }

  async function move(floorId: string, direction: -1 | 1) {
    const index = floors.findIndex((f) => f.id === floorId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= floors.length) return;

    const next = [...floors];
    [next[index], next[target]] = [next[target], next[index]];
    setFloors(next); // optimistic
    setBusy(true);
    try {
      await reorderFloorsFn({ data: { orderedIds: next.map((f) => f.id) } });
    } catch (err) {
      setFloors(floors); // revert
      alert(err instanceof Error ? err.message : "Failed to reorder floors");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(floor: Floor) {
    if (!confirm(`Delete "${floor.name}"? Anything drawn on this floor will be removed.`)) return;
    setBusy(true);
    try {
      await deleteFloorFn({ data: { floorId: floor.id } });
      const remaining = floors.filter((f) => f.id !== floor.id);
      setFloors(remaining);
      if (selectedId === floor.id) setSelectedId(remaining[0]?.id ?? null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete floor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-wrap px-4 pb-4 pt-4">
      <header className="rise-in mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div>
          <p className="island-kicker mb-1">Lay it out</p>
          <h1 className="font-serif text-2xl font-bold text-[var(--sea-ink)] sm:text-3xl">
            Blueprint
          </h1>
        </div>

        {/* Edit / View toggle. View opens rooms; Edit draws & links. */}
        <div
          role="tablist"
          aria-label="Blueprint mode"
          className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] p-1"
        >
          {(["view", "edit"] as const).map((m) => {
            const active = mode === m;
            const Icon = m === "view" ? Eye : Pencil;
            return (
              <button
                key={m}
                role="tab"
                aria-selected={active}
                onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  active
                    ? "bg-[var(--lagoon-deep)] text-[var(--on-accent)]"
                    : "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {m === "view" ? "View" : "Edit"}
              </button>
            );
          })}
        </div>
      </header>

      {floors.length === 0 ? (
        <div className="island-shell rounded-2xl p-10 text-center">
          <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
            No floors yet. Add a floor to start laying out your home.
          </p>
          <button
            onClick={handleAdd}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-sm bg-[var(--lagoon-deep)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--on-accent)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Add floor
          </button>
        </div>
      ) : (
        <>
          {/* Floor switcher */}
          <div
            role="tablist"
            aria-label="Floors"
            className="mb-4 flex flex-wrap items-center gap-2"
          >
            {floors.map((floor) => {
              const isActive = floor.id === selectedId;
              const isEditing = editingId === floor.id;
              return (
                <div
                  key={floor.id}
                  className={`flex items-center gap-1 rounded-full border px-1 py-1 transition ${
                    isActive
                      ? "border-[var(--lagoon-deep)] bg-[var(--lagoon-deep)]/10"
                      : "border-[var(--line)] bg-[var(--surface-strong)]"
                  }`}
                >
                  {isEditing ? (
                    <span className="flex items-center gap-1 pl-2">
                      <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(floor.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-28 bg-transparent text-sm text-[var(--sea-ink)] outline-none"
                      />
                      <button
                        onClick={() => saveRename(floor.id)}
                        disabled={busy}
                        aria-label="Save floor name"
                        className="rounded-full p-1 text-[var(--lagoon-deep)] transition hover:bg-[var(--link-bg-hover)]"
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel rename"
                        className="rounded-full p-1 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)]"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </span>
                  ) : (
                    <>
                      <button
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setSelectedId(floor.id)}
                        className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                          isActive
                            ? "text-[var(--lagoon-deep)]"
                            : "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
                        }`}
                      >
                        {floor.name}
                      </button>
                      {isActive && (
                        <span className="flex items-center gap-0.5 pr-1">
                          <button
                            onClick={() => move(floor.id, -1)}
                            disabled={busy || floors[0]?.id === floor.id}
                            aria-label="Move floor up"
                            className="rounded-full p-1 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)] disabled:opacity-30"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => move(floor.id, 1)}
                            disabled={busy || floors[floors.length - 1]?.id === floor.id}
                            aria-label="Move floor down"
                            className="rounded-full p-1 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)] disabled:opacity-30"
                          >
                            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => startRename(floor)}
                            aria-label="Rename floor"
                            className="rounded-full p-1 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => handleDelete(floor)}
                            disabled={busy}
                            aria-label="Delete floor"
                            className="rounded-full p-1 text-[var(--sea-ink-soft)] transition hover:bg-[var(--danger,#c0392b)]/10 hover:text-[var(--danger,#c0392b)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            <button
              onClick={handleAdd}
              disabled={busy}
              className="flex items-center gap-1 rounded-full border border-dashed border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--sea-ink-soft)] transition hover:border-[var(--lagoon-deep)] hover:text-[var(--lagoon-deep)] disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Add floor
            </button>
          </div>

          {/* Interactive canvas (client-only). A gridded box stands in until
              the Konva canvas hydrates or while shapes load. */}
          {mounted && selected && !loadingShapes ? (
            <Suspense fallback={<CanvasFallback />}>
              <BlueprintCanvas
                key={selected.id}
                floorId={selected.id}
                initialShapes={shapes}
                rooms={rooms}
                onRoomCreated={(room) => setRooms((prev) => [...prev, room])}
                mode={mode}
                onOpenRoom={(roomId) => setPeekRoomId(roomId)}
              />
            </Suspense>
          ) : (
            <CanvasFallback />
          )}
        </>
      )}

      {peekRoom && (
        <RoomPeek
          roomId={peekRoom.id}
          roomName={peekRoom.name}
          category={peekRoom.category}
          onClose={() => setPeekRoomId(null)}
          onManage={() => navigate({ to: "/rooms", search: { focus: peekRoom.id } })}
        />
      )}
    </main>
  );
}

function CanvasFallback() {
  return (
    <div
      className="h-[calc(100svh-12rem)] w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] md:h-[calc(100vh-13rem)]"
      style={{
        backgroundImage:
          "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
      aria-hidden="true"
    />
  );
}
