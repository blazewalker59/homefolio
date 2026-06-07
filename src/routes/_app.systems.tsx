import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
  createSystemFn,
  updateSystemFn,
  deleteSystemFn,
  createSystemUnitFn,
  updateSystemUnitFn,
  deleteSystemUnitFn,
  getSystemsPageFn,
} from "@/server/system";
import { listItemsBySystemUnitFn, createItemFn, updateItemFn, deleteItemFn } from "@/server/item";
import { ItemFormModal } from "@/components/ItemFormModal";
import { ItemDetailModal } from "@/components/ItemDetailModal";
import { DocumentsSection } from "@/components/DocumentsSection";
import { DropdownMenu } from "@/components/DropdownMenu";
import { systems, systemUnits, itemTemplates, items, documents } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type System = InferSelectModel<typeof systems>;
type SystemUnit = InferSelectModel<typeof systemUnits>;
type Template = InferSelectModel<typeof itemTemplates>;
type Document = InferSelectModel<typeof documents>;
type ItemWithTemplate = InferSelectModel<typeof items> & {
  template?: Template;
};

interface SystemUnitWithItems extends SystemUnit {
  items: ItemWithTemplate[];
}

interface SystemWithUnits extends System {
  units: SystemUnitWithItems[];
  documents: Document[];
}

export const Route = createFileRoute("/_app/systems")({
  loader: async () => {
    try {
      const { systems, templates } = await getSystemsPageFn();
      return { systems: systems as SystemWithUnits[], templates };
    } catch (err) {
      if (err instanceof Error && err.message === "Not authenticated") {
        throw redirect({ to: "/sign-in" });
      }
      throw err;
    }
  },
  component: SystemsPage,
});

function SystemsPage() {
  const { systems: initialSystems, templates } = Route.useLoaderData();
  const [systems, setSystems] = useState(initialSystems);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSystem, setEditingSystem] = useState<System | null>(null);
  const [addUnitSystem, setAddUnitSystem] = useState<System | null>(null);
  const [editingUnit, setEditingUnit] = useState<SystemUnit | null>(null);
  const [addItemUnitId, setAddItemUnitId] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<ItemWithTemplate | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCreateSystem(data: { name: string }) {
    setPending(true);
    try {
      const newSystem = await createSystemFn({ data });
      setSystems((prev) => [...prev, { ...newSystem, units: [], documents: [] }]);
      setShowCreate(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create system");
    } finally {
      setPending(false);
    }
  }

  async function handleUpdateSystem(systemId: string, data: { name: string }) {
    setPending(true);
    try {
      const updated = await updateSystemFn({ data: { systemId, ...data } });
      setSystems((prev) => prev.map((s) => (s.id === systemId ? { ...s, ...updated } : s)));
      setEditingSystem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update system");
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteSystem(systemId: string) {
    setDeleteError(null);
    setPending(true);
    try {
      await deleteSystemFn({ data: { systemId } });
      setSystems((prev) => prev.filter((s) => s.id !== systemId));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete system");
    } finally {
      setPending(false);
    }
  }

  async function handleCreateUnit(systemId: string, data: { name: string }) {
    setPending(true);
    try {
      const newUnit = await createSystemUnitFn({ data: { systemId, ...data } });
      setSystems((prev) =>
        prev.map((s) =>
          s.id === systemId ? { ...s, units: [...s.units, { ...newUnit, items: [] }] } : s,
        ),
      );
      setAddUnitSystem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create unit");
    } finally {
      setPending(false);
    }
  }

  async function handleUpdateUnit(unitId: string, data: { name: string }) {
    setPending(true);
    try {
      const updated = await updateSystemUnitFn({ data: { unitId, ...data } });
      setSystems((prev) =>
        prev.map((s) => ({
          ...s,
          units: s.units.map((u) => (u.id === unitId ? { ...u, ...updated } : u)),
        })),
      );
      setEditingUnit(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update unit");
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteUnit(unitId: string, systemId: string) {
    setPending(true);
    try {
      await deleteSystemUnitFn({ data: { unitId } });
      setSystems((prev) =>
        prev.map((s) =>
          s.id === systemId ? { ...s, units: s.units.filter((u) => u.id !== unitId) } : s,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete unit");
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
    if (!addItemUnitId) return;
    setPending(true);
    try {
      await createItemFn({ data: { ...data, systemUnitId: addItemUnitId } });
      const updatedItems = await listItemsBySystemUnitFn({ data: { systemUnitId: addItemUnitId } });
      setSystems((prev) =>
        prev.map((s) => ({
          ...s,
          units: s.units.map((u) =>
            u.id === addItemUnitId ? { ...u, items: updatedItems as ItemWithTemplate[] } : u,
          ),
        })),
      );
      setAddItemUnitId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setPending(false);
    }
  }

  async function refreshUnitItems(systemUnitId: string) {
    const updatedItems = await listItemsBySystemUnitFn({ data: { systemUnitId } });
    setSystems((prev) =>
      prev.map((s) => ({
        ...s,
        units: s.units.map((u) =>
          u.id === systemUnitId ? { ...u, items: updatedItems as ItemWithTemplate[] } : u,
        ),
      })),
    );
  }

  async function handleUpdateItem(data: { name: string; fields: Record<string, unknown> }) {
    if (!viewingItem?.systemUnitId) return;
    setPending(true);
    try {
      await updateItemFn({
        data: { itemId: viewingItem.id, name: data.name, fields: data.fields },
      });
      await refreshUnitItems(viewingItem.systemUnitId);
      setViewingItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update item");
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteItem() {
    if (!viewingItem?.systemUnitId) return;
    setPending(true);
    try {
      await deleteItemFn({ data: { itemId: viewingItem.id } });
      await refreshUnitItems(viewingItem.systemUnitId);
      setViewingItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setPending(false);
    }
  }

  const addItemUnit = systems.flatMap((s) => s.units).find((u) => u.id === addItemUnitId);
  const viewingItemUnit = systems
    .flatMap((s) => s.units)
    .find((u) => u.id === viewingItem?.systemUnitId);

  return (
    <main className="page-wrap px-4 pb-8 pt-6">
      <header className="rise-in mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <p className="island-kicker mb-1">Behind the walls</p>
          <h1 className="font-serif text-2xl font-bold text-[var(--sea-ink)] sm:text-3xl">
            Systems
          </h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-sm bg-[var(--lagoon-deep)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--on-accent)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Add System
        </button>
      </header>

      {deleteError && (
        <div className="mt-6 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
          {deleteError}
          <button onClick={() => setDeleteError(null)} className="ml-2 font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {systems.length === 0 ? (
        <section className="island-shell mt-8 rounded-2xl p-8 text-center">
          <p className="text-sm text-[var(--sea-ink-soft)]">
            No systems yet. Add your first system to track HVAC, electrical, plumbing, and more.
          </p>
        </section>
      ) : (
        <section className="mt-8 space-y-4">
          {systems.map((system) => (
            <SystemCard
              key={system.id}
              system={system}
              onEdit={() => setEditingSystem(system)}
              onDelete={() => handleDeleteSystem(system.id)}
              onAddUnit={() => setAddUnitSystem(system)}
              onEditUnit={(unit) => setEditingUnit(unit)}
              onDeleteUnit={(unitId) => handleDeleteUnit(unitId, system.id)}
              onAddItem={(unitId) => setAddItemUnitId(unitId)}
              onViewItem={(item) => setViewingItem(item)}
              pending={pending}
            />
          ))}
        </section>
      )}

      {showCreate && (
        <NameFormModal
          title="Add System"
          placeholder="e.g., HVAC, Electrical, Plumbing"
          onSubmit={handleCreateSystem}
          onCancel={() => setShowCreate(false)}
          pending={pending}
        />
      )}

      {editingSystem && (
        <NameFormModal
          title="Edit System"
          initialName={editingSystem.name}
          placeholder="System name"
          onSubmit={(data) => handleUpdateSystem(editingSystem.id, data)}
          onCancel={() => setEditingSystem(null)}
          pending={pending}
        />
      )}

      {addUnitSystem && (
        <NameFormModal
          title={`Add Unit to ${addUnitSystem.name}`}
          placeholder="e.g., Upstairs Unit, Downstairs Unit"
          onSubmit={(data) => handleCreateUnit(addUnitSystem.id, data)}
          onCancel={() => setAddUnitSystem(null)}
          pending={pending}
        />
      )}

      {editingUnit && (
        <NameFormModal
          title="Edit Unit"
          initialName={editingUnit.name}
          placeholder="Unit name"
          onSubmit={(data) => handleUpdateUnit(editingUnit.id, data)}
          onCancel={() => setEditingUnit(null)}
          pending={pending}
        />
      )}

      {addItemUnit && (
        <ItemFormModal
          templates={templates}
          title={`Add Item to ${addItemUnit.name}`}
          defaultSystemUnitId={addItemUnit.id}
          onSubmit={handleCreateItem}
          onCancel={() => setAddItemUnitId(null)}
          pending={pending}
        />
      )}

      {viewingItem && (
        <ItemDetailModal
          item={viewingItem}
          locationLabel={viewingItemUnit?.name}
          onSave={handleUpdateItem}
          onDelete={handleDeleteItem}
          onCancel={() => setViewingItem(null)}
          pending={pending}
        />
      )}
    </main>
  );
}

function SystemCard({
  system,
  onEdit,
  onDelete,
  onAddUnit,
  onEditUnit,
  onDeleteUnit,
  onAddItem,
  onViewItem,
  pending,
}: {
  system: SystemWithUnits;
  onEdit: () => void;
  onDelete: () => void;
  onAddUnit: () => void;
  onEditUnit: (unit: SystemUnitWithItems) => void;
  onDeleteUnit: (unitId: string) => void;
  onAddItem: (unitId: string) => void;
  onViewItem: (item: ItemWithTemplate) => void;
  pending: boolean;
}) {
  return (
    <article className="island-shell feature-card rise-in relative rounded-2xl p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--sea-ink)]">{system.name}</h2>
          <p className="text-xs text-[var(--sea-ink-soft)]">
            {system.units.length} {system.units.length === 1 ? "unit" : "units"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenu.Item onClick={onEdit} disabled={pending}>
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={onDelete} variant="danger" disabled={pending}>
            Delete
          </DropdownMenu.Item>
        </DropdownMenu>
      </div>

      {system.units.length > 0 && (
        <div className="mt-3 space-y-3 border-t border-[var(--line)] pt-3">
          {system.units.map((unit) => (
            <div key={unit.id} className="rounded-lg bg-[var(--link-bg-hover)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--sea-ink)]">{unit.name}</span>
                <DropdownMenu>
                  <DropdownMenu.Item onClick={() => onEditUnit(unit)} disabled={pending}>
                    Edit
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => onDeleteUnit(unit.id)}
                    variant="danger"
                    disabled={pending}
                  >
                    Delete
                  </DropdownMenu.Item>
                </DropdownMenu>
              </div>

              {unit.items.length > 0 && (
                <div className="mt-2 space-y-1">
                  {unit.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onViewItem(item)}
                      disabled={pending}
                      className="flex w-full items-center justify-between rounded bg-[var(--surface-strong)] px-2 py-1 text-left transition hover:bg-[var(--lagoon-deep)]/10 disabled:opacity-50"
                    >
                      <span className="text-xs text-[var(--sea-ink)]">{item.name}</span>
                      {item.template && (
                        <span className="text-xs text-[var(--sea-ink-soft)]">
                          {item.template.category}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => onAddItem(unit.id)}
                disabled={pending}
                className="mt-2 w-full rounded border border-dashed border-[var(--line)] bg-transparent px-2 py-1 text-xs font-medium text-[var(--sea-ink-soft)] transition hover:border-[var(--lagoon-deep)] hover:text-[var(--lagoon-deep)] disabled:opacity-50"
              >
                + Add Item
              </button>
            </div>
          ))}
        </div>
      )}

      <DocumentsSection documents={system.documents} />

      <button
        onClick={onAddUnit}
        disabled={pending}
        className="mt-3 w-full rounded-lg border border-dashed border-[var(--line)] bg-transparent px-3 py-2 text-xs font-medium text-[var(--sea-ink-soft)] transition hover:border-[var(--lagoon-deep)] hover:text-[var(--lagoon-deep)] disabled:opacity-50"
      >
        + Add Unit
      </button>
    </article>
  );
}

function NameFormModal({
  title,
  initialName,
  placeholder,
  onSubmit,
  onCancel,
  pending,
}: {
  title: string;
  initialName?: string;
  placeholder?: string;
  onSubmit: (data: { name: string }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initialName ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
              required
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
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
              {pending ? "Saving…" : title.includes("Add") ? "Add" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
