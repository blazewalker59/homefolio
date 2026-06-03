import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getHomeFn } from "@/server/home";
import {
  listSystemsFn,
  createSystemFn,
  updateSystemFn,
  deleteSystemFn,
  listSystemUnitsFn,
  createSystemUnitFn,
  updateSystemUnitFn,
  deleteSystemUnitFn,
} from "@/server/system";
import {
  seedTemplatesFn,
  listTemplatesFn,
  listItemsBySystemUnitFn,
  createItemFn,
} from "@/server/item";
import { ItemFormModal } from "@/components/ItemFormModal";
import { systems, systemUnits, itemTemplates, items } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type System = InferSelectModel<typeof systems>;
type SystemUnit = InferSelectModel<typeof systemUnits>;
type Template = InferSelectModel<typeof itemTemplates>;
type ItemWithTemplate = InferSelectModel<typeof items> & {
  template?: Template;
};

interface SystemUnitWithItems extends SystemUnit {
  items: ItemWithTemplate[];
}

interface SystemWithUnits extends System {
  units: SystemUnitWithItems[];
}

export const Route = createFileRoute("/systems")({
  loader: async () => {
    try {
      const home = await getHomeFn();
      if (!home?.address) {
        throw redirect({ to: "/setup" });
      }
      const systemsList = await listSystemsFn();

      await seedTemplatesFn();
      const templates = await listTemplatesFn();

      const systemsWithUnits: SystemWithUnits[] = await Promise.all(
        systemsList.map(async (system) => {
          const units = await listSystemUnitsFn({ data: { systemId: system.id } });
          const unitsWithItems: SystemUnitWithItems[] = await Promise.all(
            units.map(async (unit) => {
              const unitItems = await listItemsBySystemUnitFn({ data: { systemUnitId: unit.id } });
              return { ...unit, items: unitItems as ItemWithTemplate[] };
            }),
          );
          return { ...system, units: unitsWithItems };
        }),
      );

      return { home, systems: systemsWithUnits, templates };
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
  const { home, systems: initialSystems, templates } = Route.useLoaderData();
  const [systems, setSystems] = useState(initialSystems);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSystem, setEditingSystem] = useState<System | null>(null);
  const [addUnitSystem, setAddUnitSystem] = useState<System | null>(null);
  const [editingUnit, setEditingUnit] = useState<SystemUnit | null>(null);
  const [addItemUnitId, setAddItemUnitId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCreateSystem(data: { name: string }) {
    setPending(true);
    try {
      const newSystem = await createSystemFn({ data });
      setSystems((prev) => [...prev, { ...newSystem, units: [] }]);
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

  const addItemUnit = systems.flatMap((s) => s.units).find((u) => u.id === addItemUnitId);

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <p className="island-kicker mb-3">Systems</p>
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
          Add System
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
  pending,
}: {
  system: SystemWithUnits;
  onEdit: () => void;
  onDelete: () => void;
  onAddUnit: () => void;
  onEditUnit: (unit: SystemUnitWithItems) => void;
  onDeleteUnit: (unitId: string) => void;
  onAddItem: (unitId: string) => void;
  pending: boolean;
}) {
  return (
    <article className="island-shell feature-card rise-in rounded-2xl p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--sea-ink)]">{system.name}</h2>
          <p className="text-xs text-[var(--sea-ink-soft)]">
            {system.units.length} {system.units.length === 1 ? "unit" : "units"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            disabled={pending}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)] transition hover:bg-gray-50 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            disabled={pending}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {system.units.length > 0 && (
        <div className="mt-3 space-y-3 border-t border-[var(--line)] pt-3">
          {system.units.map((unit) => (
            <div key={unit.id} className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--sea-ink)]">{unit.name}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onEditUnit(unit)}
                    disabled={pending}
                    className="rounded px-2 py-1 text-xs text-[var(--sea-ink-soft)] transition hover:bg-gray-200 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteUnit(unit.id)}
                    disabled={pending}
                    className="rounded px-2 py-1 text-xs text-red-500 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {unit.items.length > 0 && (
                <div className="mt-2 space-y-1">
                  {unit.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded bg-white px-2 py-1"
                    >
                      <span className="text-xs text-[var(--sea-ink)]">{item.name}</span>
                      {item.template && (
                        <span className="text-xs text-[var(--sea-ink-soft)]">
                          {item.template.category}
                        </span>
                      )}
                    </div>
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
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-6 shadow-lg">
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
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.2)]"
            />
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
              {pending ? "Saving…" : title.includes("Add") ? "Add" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
