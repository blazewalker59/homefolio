import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getHomeFn } from "@/server/home";
import { listRoomsFn, createRoomFn, updateRoomFn, deleteRoomFn } from "@/server/room";
import { ROOM_CATEGORIES, getRoomCategory } from "@/lib/room-categories";
import { rooms } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Room = InferSelectModel<typeof rooms>;

export const Route = createFileRoute("/rooms")({
  loader: async () => {
    try {
      const home = await getHomeFn();
      if (!home?.address) {
        throw redirect({ to: "/setup" });
      }
      const rooms = await listRoomsFn();
      return { home, rooms };
    } catch (err) {
      if (err instanceof Error && err.message === "Not authenticated") {
        throw redirect({ to: "/sign-in" });
      }
      throw err;
    }
  },
  component: RoomsPage,
});

function RoomsPage() {
  const { home, rooms: initialRooms } = Route.useLoaderData();
  const [rooms, setRooms] = useState(initialRooms);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCreate(data: { name: string; category: string }) {
    setPending(true);
    try {
      const newRoom = await createRoomFn({ data });
      setRooms((prev) => [...prev, newRoom]);
      setShowCreate(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setPending(false);
    }
  }

  async function handleUpdate(roomId: string, data: { name: string; category: string }) {
    setPending(true);
    try {
      const updated = await updateRoomFn({ data: { roomId, ...data } });
      setRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
      setEditingRoom(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update room");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(roomId: string) {
    setDeleteError(null);
    setPending(true);
    try {
      await deleteRoomFn({ data: { roomId } });
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete room");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <p className="island-kicker mb-3">Rooms</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          {home.name || "My Home"}
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          {home.address}
        </p>

        <button
          onClick={() => setShowCreate(true)}
          className="rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Add Room
        </button>
      </section>

      {deleteError && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {deleteError}
          <button onClick={() => setDeleteError(null)} className="ml-2 font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {rooms.length === 0 ? (
        <section className="island-shell mt-8 rounded-2xl p-8 text-center">
          <p className="text-sm text-[var(--sea-ink-soft)]">
            No rooms yet. Add your first room to start organizing your home.
          </p>
        </section>
      ) : (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onEdit={() => setEditingRoom(room)}
              onDelete={() => handleDelete(room.id)}
              pending={pending}
            />
          ))}
        </section>
      )}

      {showCreate && (
        <RoomFormModal
          title="Add Room"
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          pending={pending}
        />
      )}

      {editingRoom && (
        <RoomFormModal
          title="Edit Room"
          initialName={editingRoom.name}
          initialCategory={editingRoom.category}
          onSubmit={(data) => handleUpdate(editingRoom.id, data)}
          onCancel={() => setEditingRoom(null)}
          pending={pending}
        />
      )}
    </main>
  );
}

function RoomCard({
  room,
  onEdit,
  onDelete,
  pending,
}: {
  room: Room;
  onEdit: () => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const category = getRoomCategory(room.category);

  return (
    <article className="island-shell feature-card rise-in rounded-2xl p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--sea-ink)]">{room.name}</h2>
          {category && <p className="text-xs text-[var(--sea-ink-soft)]">{category.label}</p>}
        </div>
        <span
          className="inline-flex rounded-full bg-[var(--lagoon-deep)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--lagoon-deep)]"
          data-room-category={room.category}
        >
          {category?.label ?? room.category}
        </span>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={onEdit}
          disabled={pending}
          className="flex-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-medium text-[var(--sea-ink)] transition hover:bg-gray-50 disabled:opacity-50"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={pending}
          className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function RoomFormModal({
  title,
  initialName,
  initialCategory,
  onSubmit,
  onCancel,
  pending,
}: {
  title: string;
  initialName?: string;
  initialCategory?: string;
  onSubmit: (data: { name: string; category: string }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [category, setCategory] = useState(initialCategory ?? "bedroom");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), category });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="room-name"
              className="mb-2 block text-sm font-medium text-[var(--sea-ink)]"
            >
              Room Name
            </label>
            <input
              id="room-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Master Bedroom"
              required
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.2)]"
            />
          </div>

          <div>
            <label
              htmlFor="room-category"
              className="mb-2 block text-sm font-medium text-[var(--sea-ink)]"
            >
              Category
            </label>
            <select
              id="room-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.2)]"
            >
              {ROOM_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="flex-1 rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="flex-1 rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {pending ? "Saving…" : title === "Add Room" ? "Add Room" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
