import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getHomeFn } from "@/server/home";
import {
  seedTemplatesFn,
  listTemplatesFn,
  listItemsFn,
  createItemFn,
  updateItemFn,
  moveItemFn,
  deleteItemFn,
} from "@/server/item";
import { listRoomsFn } from "@/server/room";
import { listSystemsFn, listSystemUnitsFn } from "@/server/system";
import { DropdownMenu } from "@/components/DropdownMenu";
import type { itemTemplates, items, rooms, systemUnits } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Template = InferSelectModel<typeof itemTemplates>;
type Item = InferSelectModel<typeof items> & {
  template?: Template;
  room?: InferSelectModel<typeof rooms> | null;
  systemUnit?: InferSelectModel<typeof systemUnits> | null;
};
type Room = InferSelectModel<typeof rooms>;
type SystemUnit = InferSelectModel<typeof systemUnits>;

export const Route = createFileRoute("/items")({
  loader: async () => {
    try {
      const home = await getHomeFn();
      if (!home?.address) {
        throw redirect({ to: "/setup" });
      }

      // Seed templates if needed.
      await seedTemplatesFn();

      const [templates, allItems, roomsList, systemsList] = await Promise.all([
        listTemplatesFn(),
        listItemsFn(),
        listRoomsFn(),
        listSystemsFn(),
      ]);

      // Fetch system units for each system.
      const allUnits: SystemUnit[] = [];
      for (const system of systemsList) {
        const units = await listSystemUnitsFn({ data: { systemId: system.id } });
        allUnits.push(...units);
      }

      return {
        home,
        templates,
        items: allItems as Item[],
        rooms: roomsList,
        systemUnits: allUnits,
      };
    } catch (err) {
      if (err instanceof Error && err.message === "Not authenticated") {
        throw redirect({ to: "/sign-in" });
      }
      throw err;
    }
  },
  component: ItemsPage,
});

function ItemsPage() {
  const {
    home,
    templates,
    items: initialItems,
    rooms: roomsList,
    systemUnits,
  } = Route.useLoaderData();

  const [items, setItems] = useState(initialItems);
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [movingItem, setMovingItem] = useState<Item | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCreate(data: {
    templateId: string;
    name: string;
    roomId?: string;
    systemUnitId?: string;
    fields: Record<string, unknown>;
  }) {
    setPending(true);
    try {
      const newItem = await createItemFn({ data });
      // Fetch the full item with relations.
      const allItems = await listItemsFn();
      const created = allItems.find((i) => i.id === newItem.id);
      if (created) {
        setItems((prev) => [...prev, created as Item]);
      }
      setShowCreate(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setPending(false);
    }
  }

  async function handleUpdate(
    itemId: string,
    data: {
      name?: string;
      roomId?: string | null;
      systemUnitId?: string | null;
      fields?: Record<string, unknown>;
    },
  ) {
    setPending(true);
    try {
      await updateItemFn({ data: { itemId, ...data } });
      // Refresh items list.
      const allItems = await listItemsFn();
      setItems(allItems as Item[]);
      setEditingItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update item");
    } finally {
      setPending(false);
    }
  }

  async function handleMove(itemId: string, roomId: string | null) {
    setPending(true);
    try {
      await moveItemFn({ data: { itemId, roomId } });
      // Refresh items list.
      const allItems = await listItemsFn();
      setItems(allItems as Item[]);
      setMovingItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to move item");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(itemId: string) {
    setDeleteError(null);
    setPending(true);
    try {
      await deleteItemFn({ data: { itemId } });
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <p className="island-kicker mb-3">Items</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          {home.name || "My Home"}
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          {home.address}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Add Item
          </button>
          <Link
            to="/templates"
            className="rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-gray-50"
          >
            Manage Templates
          </Link>
          <Link
            to="/"
            className="rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>

      {deleteError && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {deleteError}
          <button onClick={() => setDeleteError(null)} className="ml-2 font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <section className="island-shell mt-8 rounded-2xl p-8 text-center">
          <p className="text-sm text-[var(--sea-ink-soft)]">
            No items yet. Add your first item from a template to start cataloging your home.
          </p>
        </section>
      ) : (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={() => setEditingItem(item)}
              onMove={() => setMovingItem(item)}
              onDelete={() => handleDelete(item.id)}
              pending={pending}
            />
          ))}
        </section>
      )}

      {showCreate && (
        <CreateItemModal
          templates={templates}
          rooms={roomsList}
          systemUnits={systemUnits}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          pending={pending}
        />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          rooms={roomsList}
          systemUnits={systemUnits}
          onSubmit={(data) => handleUpdate(editingItem.id, data)}
          onCancel={() => setEditingItem(null)}
          pending={pending}
        />
      )}

      {movingItem && (
        <MoveItemModal
          item={movingItem}
          rooms={roomsList}
          onSubmit={(roomId) => handleMove(movingItem.id, roomId)}
          onCancel={() => setMovingItem(null)}
          pending={pending}
        />
      )}
    </main>
  );
}

function ItemCard({
  item,
  onEdit,
  onMove,
  onDelete,
  pending,
}: {
  item: Item;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
  pending: boolean;
}) {
  return (
    <article className="island-shell feature-card rise-in relative rounded-2xl p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--sea-ink)]">{item.name}</h2>
          <p className="text-xs text-[var(--sea-ink-soft)]">{item.template?.name}</p>
        </div>
        <DropdownMenu>
          <DropdownMenu.Item onClick={onEdit} disabled={pending}>
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={onMove} disabled={pending}>
            Move
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={onDelete} variant="danger" disabled={pending}>
            Delete
          </DropdownMenu.Item>
        </DropdownMenu>
      </div>

      {item.room && (
        <p className="mb-2 text-xs text-[var(--sea-ink-soft)]">
          Room: <span className="font-medium">{item.room.name}</span>
        </p>
      )}
      {item.systemUnit && (
        <p className="mb-2 text-xs text-[var(--sea-ink-soft)]">
          System Unit: <span className="font-medium">{item.systemUnit.name}</span>
        </p>
      )}
      {item.template?.category && (
        <span className="inline-flex rounded-full bg-[var(--lagoon-deep)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--lagoon-deep)]">
          {item.template.category}
        </span>
      )}
    </article>
  );
}

function CreateItemModal({
  templates,
  rooms,
  systemUnits,
  onSubmit,
  onCancel,
  pending,
}: {
  templates: Template[];
  rooms: Room[];
  systemUnits: SystemUnit[];
  onSubmit: (data: {
    templateId: string;
    name: string;
    roomId?: string;
    systemUnitId?: string;
    fields: Record<string, unknown>;
  }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [systemUnitId, setSystemUnitId] = useState("");
  const [fields, setFields] = useState<Record<string, unknown>>({});

  const selectedTemplate = templates.find((t) => t.id === templateId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !templateId) return;
    onSubmit({
      templateId,
      name: name.trim(),
      roomId: roomId || undefined,
      systemUnitId: systemUnitId || undefined,
      fields,
    });
  }

  function handleFieldChange(key: string, value: unknown) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">Add Item</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
              Item Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Living Room Paint"
              required
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
              Room (optional)
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
            >
              <option value="">None</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
              System Unit (optional)
            </label>
            <select
              value={systemUnitId}
              onChange={(e) => setSystemUnitId(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
            >
              <option value="">None</option>
              {systemUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTemplate?.fields.map((field) => (
            <div key={field.key}>
              <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </label>
              {field.type === "select" ? (
                <select
                  value={(fields[field.key] as string) ?? ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
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
                  className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
                />
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="flex-1 rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="flex-1 rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-white"
            >
              {pending ? "Creating…" : "Create Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditItemModal({
  item,
  rooms,
  systemUnits,
  onSubmit,
  onCancel,
  pending,
}: {
  item: Item;
  rooms: Room[];
  systemUnits: SystemUnit[];
  onSubmit: (data: {
    name?: string;
    roomId?: string | null;
    systemUnitId?: string | null;
    fields?: Record<string, unknown>;
  }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(item.name);
  const [roomId, setRoomId] = useState(item.roomId ?? "");
  const [systemUnitId, setSystemUnitId] = useState(item.systemUnitId ?? "");
  const [fields, setFields] = useState<Record<string, unknown>>(item.fields);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      roomId: roomId || null,
      systemUnitId: systemUnitId || null,
      fields,
    });
  }

  function handleFieldChange(key: string, value: unknown) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">Edit Item</h2>
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
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
              Room (optional)
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
            >
              <option value="">None</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
              System Unit (optional)
            </label>
            <select
              value={systemUnitId}
              onChange={(e) => setSystemUnitId(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
            >
              <option value="">None</option>
              {systemUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {item.template?.fields.map((field) => (
            <div key={field.key}>
              <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
                {field.label}
              </label>
              {field.type === "select" ? (
                <select
                  value={(fields[field.key] as string) ?? ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
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
                  className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
                />
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="flex-1 rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="flex-1 rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-white"
            >
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MoveItemModal({
  item,
  rooms,
  onSubmit,
  onCancel,
  pending,
}: {
  item: Item;
  rooms: Room[];
  onSubmit: (roomId: string | null) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [roomId, setRoomId] = useState(item.roomId ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(roomId || null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">Move Item</h2>
        <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
          Move <strong>{item.name}</strong> to a different room.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">Room</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
            >
              <option value="">No Room</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="flex-1 rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-white"
            >
              {pending ? "Moving…" : "Move Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
