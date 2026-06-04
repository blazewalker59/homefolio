import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getHomeFn } from "@/server/home";
import { listRoomsFn, createRoomFn, updateRoomFn, deleteRoomFn } from "@/server/room";
import { seedTemplatesFn, listTemplatesFn, listItemsByRoomFn, createItemFn } from "@/server/item";
import { ROOM_CATEGORIES, getRoomCategory } from "@/lib/room-categories";
import { ItemFormModal } from "@/components/ItemFormModal";
import { DropdownMenu } from "@/components/DropdownMenu";
import { rooms, itemTemplates, items } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Room = InferSelectModel<typeof rooms>;
type Template = InferSelectModel<typeof itemTemplates>;
type ItemWithTemplate = InferSelectModel<typeof items> & {
  template?: Template;
};

interface RoomWithItems extends Room {
  items: ItemWithTemplate[];
}

export const Route = createFileRoute("/rooms")({
  loader: async () => {
    try {
      const home = await getHomeFn();
      if (!home?.address) {
        throw redirect({ to: "/setup" });
      }
      const roomsList = await listRoomsFn();

      await seedTemplatesFn();
      const templates = await listTemplatesFn();

      const roomsWithItems: RoomWithItems[] = await Promise.all(
        roomsList.map(async (room) => {
          const roomItems = await listItemsByRoomFn({ data: { roomId: room.id } });
          return { ...room, items: roomItems as ItemWithTemplate[] };
        }),
      );

      return { home, rooms: roomsWithItems, templates };
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
  const { home, rooms: initialRooms, templates } = Route.useLoaderData();
  const [rooms, setRooms] = useState(initialRooms);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [addItemRoomId, setAddItemRoomId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCreate(data: { name: string; category: string }) {
    setPending(true);
    try {
      const newRoom = await createRoomFn({ data });
      setRooms((prev) => [...prev, { ...newRoom, items: [] }]);
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
      setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, ...updated } : r)));
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

  async function handleCreateItem(data: {
    templateId: string;
    name: string;
    roomId?: string;
    systemUnitId?: string;
    fields: Record<string, unknown>;
  }) {
    if (!addItemRoomId) return;
    setPending(true);
    try {
      await createItemFn({ data: { ...data, roomId: addItemRoomId } });
      const updatedItems = await listItemsByRoomFn({ data: { roomId: addItemRoomId } });
      setRooms((prev) =>
        prev.map((r) =>
          r.id === addItemRoomId ? { ...r, items: updatedItems as ItemWithTemplate[] } : r,
        ),
      );
      setAddItemRoomId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setPending(false);
    }
  }

  const addItemRoom = rooms.find((r) => r.id === addItemRoomId);

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="rise-in border-b border-[var(--line)] pb-10 sm:pb-12">
        <div className="mb-6 flex items-center justify-between text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[var(--sea-ink-soft)]">
          <span>{home.name || "My Home"}</span>
          <span className="font-mono text-[var(--lagoon-deep)]">No. 001</span>
        </div>
        <p className="island-kicker mb-4">A field guide</p>
        <h1 className="display-title mb-5 max-w-3xl text-5xl text-[var(--sea-ink)] sm:text-7xl">
          Rooms<span className="text-[var(--lagoon-deep)]">.</span>
        </h1>
        <p className="mb-8 max-w-2xl font-serif text-lg italic text-[var(--sea-ink-soft)] sm:text-xl">
          {home.address}
        </p>

        <button
          onClick={() => setShowCreate(true)}
          className="rounded-sm bg-[var(--lagoon-deep)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--on-accent)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Add Room
        </button>
      </section>

      {deleteError && (
        <div className="mt-6 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
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
              onAddItem={() => setAddItemRoomId(room.id)}
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

      {addItemRoom && (
        <ItemFormModal
          templates={templates}
          title={`Add Item to ${addItemRoom.name}`}
          defaultRoomId={addItemRoom.id}
          onSubmit={handleCreateItem}
          onCancel={() => setAddItemRoomId(null)}
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
  onAddItem,
  pending,
}: {
  room: RoomWithItems;
  onEdit: () => void;
  onDelete: () => void;
  onAddItem: () => void;
  pending: boolean;
}) {
  const category = getRoomCategory(room.category);

  return (
    <article className="island-shell feature-card rise-in relative rounded-2xl p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--sea-ink)]">{room.name}</h2>
          {category && <p className="text-xs text-[var(--sea-ink-soft)]">{category.label}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex rounded-full bg-[var(--lagoon-deep)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--lagoon-deep)]"
            data-room-category={room.category}
          >
            {category?.label ?? room.category}
          </span>
          <DropdownMenu>
            <DropdownMenu.Item onClick={onEdit} disabled={pending}>
              Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={onDelete} variant="danger" disabled={pending}>
              Delete
            </DropdownMenu.Item>
          </DropdownMenu>
        </div>
      </div>

      {room.items.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-3">
          <p className="text-xs font-medium text-[var(--sea-ink-soft)]">
            {room.items.length} {room.items.length === 1 ? "item" : "items"}
          </p>
          {room.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg bg-[var(--link-bg-hover)] px-3 py-1.5"
            >
              <span className="text-sm text-[var(--sea-ink)]">{item.name}</span>
              {item.template && (
                <span className="text-xs text-[var(--sea-ink-soft)]">{item.template.category}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAddItem}
        disabled={pending}
        className="mt-3 w-full rounded-lg border border-dashed border-[var(--line)] bg-transparent px-3 py-2 text-xs font-medium text-[var(--sea-ink-soft)] transition hover:border-[var(--lagoon-deep)] hover:text-[var(--lagoon-deep)] disabled:opacity-50"
      >
        + Add Item
      </button>
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
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-lg">
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
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
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
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
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
              className="flex-1 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-6 py-3 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="flex-1 rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-[var(--on-accent)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {pending ? "Saving…" : title === "Add Room" ? "Add Room" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
