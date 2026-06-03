import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getHomeFn } from "@/server/home";
import {
  seedTemplatesFn,
  listCustomTemplatesFn,
  createCustomTemplateFn,
  updateCustomTemplateFn,
  deleteCustomTemplateFn,
} from "@/server/item";
import { itemTemplates } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Template = InferSelectModel<typeof itemTemplates>;
type FieldType = "text" | "number" | "date" | "select" | "boolean";

interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
}

export const Route = createFileRoute("/templates")({
  loader: async () => {
    try {
      const home = await getHomeFn();
      if (!home?.address) {
        throw redirect({ to: "/setup" });
      }
      await seedTemplatesFn();
      const templates = await listCustomTemplatesFn();
      return { home, templates };
    } catch (err) {
      if (err instanceof Error && err.message === "Not authenticated") {
        throw redirect({ to: "/sign-in" });
      }
      throw err;
    }
  },
  component: TemplatesPage,
});

function TemplatesPage() {
  const { home, templates: initialTemplates } = Route.useLoaderData();
  const [templates, setTemplates] = useState(initialTemplates);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCreate(data: {
    name: string;
    category: string;
    description?: string;
    fields: TemplateField[];
  }) {
    setPending(true);
    try {
      const newTemplate = await createCustomTemplateFn({ data });
      setTemplates((prev) => [...prev, newTemplate]);
      setShowCreate(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setPending(false);
    }
  }

  async function handleUpdate(
    templateId: string,
    data: {
      name?: string;
      category?: string;
      description?: string;
      fields?: TemplateField[];
    },
  ) {
    setPending(true);
    try {
      const updated = await updateCustomTemplateFn({ data: { templateId, ...data } });
      setTemplates((prev) => prev.map((t) => (t.id === templateId ? updated : t)));
      setEditingTemplate(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update template");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(templateId: string) {
    setDeleteError(null);
    setPending(true);
    try {
      await deleteCustomTemplateFn({ data: { templateId } });
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete template");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <p className="island-kicker mb-3">Custom Templates</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          {home.name || "My Home"}
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Create your own item templates for things not covered by built-in defaults.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Create Template
          </button>
          <Link
            to="/items"
            className="rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-gray-50"
          >
            Back to Items
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

      {templates.length === 0 ? (
        <section className="island-shell mt-8 rounded-2xl p-8 text-center">
          <p className="text-sm text-[var(--sea-ink-soft)]">
            No custom templates yet. Create one to define your own item types.
          </p>
        </section>
      ) : (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => setEditingTemplate(template)}
              onDelete={() => handleDelete(template.id)}
              pending={pending}
            />
          ))}
        </section>
      )}

      {showCreate && (
        <TemplateFormModal
          title="Create Template"
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          pending={pending}
        />
      )}

      {editingTemplate && (
        <TemplateFormModal
          title="Edit Template"
          initialName={editingTemplate.name}
          initialCategory={editingTemplate.category}
          initialDescription={editingTemplate.description ?? ""}
          initialFields={editingTemplate.fields as TemplateField[]}
          onSubmit={(data) => handleUpdate(editingTemplate.id, data)}
          onCancel={() => setEditingTemplate(null)}
          pending={pending}
        />
      )}
    </main>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
  pending,
}: {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const fields = template.fields as TemplateField[];

  return (
    <article className="island-shell feature-card rise-in rounded-2xl p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--sea-ink)]">{template.name}</h2>
          <p className="text-xs text-[var(--sea-ink-soft)]">{template.category}</p>
        </div>
        <span className="inline-flex rounded-full bg-[var(--lagoon-deep)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--lagoon-deep)]">
          Custom
        </span>
      </div>

      {template.description && (
        <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">{template.description}</p>
      )}

      <div className="mb-3 border-t border-[var(--line)] pt-3">
        <p className="mb-2 text-xs font-medium text-[var(--sea-ink-soft)]">
          {fields.length} {fields.length === 1 ? "field" : "fields"}
        </p>
        <div className="flex flex-wrap gap-1">
          {fields.slice(0, 5).map((field) => (
            <span
              key={field.key}
              className="rounded bg-gray-100 px-2 py-0.5 text-xs text-[var(--sea-ink)]"
            >
              {field.label}
            </span>
          ))}
          {fields.length > 5 && (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-[var(--sea-ink-soft)]">
              +{fields.length - 5} more
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
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

function TemplateFormModal({
  title,
  initialName,
  initialCategory,
  initialDescription,
  initialFields,
  onSubmit,
  onCancel,
  pending,
}: {
  title: string;
  initialName?: string;
  initialCategory?: string;
  initialDescription?: string;
  initialFields?: TemplateField[];
  onSubmit: (data: {
    name: string;
    category: string;
    description?: string;
    fields: TemplateField[];
  }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [category, setCategory] = useState(initialCategory ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [fields, setFields] = useState<TemplateField[]>(
    initialFields ?? [{ key: "", label: "", type: "text" }],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !category.trim() || fields.length === 0) return;

    const validFields = fields.filter((f) => f.key.trim() && f.label.trim());
    if (validFields.length === 0) {
      alert("At least one field with a key and label is required");
      return;
    }

    onSubmit({
      name: name.trim(),
      category: category.trim(),
      description: description.trim() || undefined,
      fields: validFields.map((f) => ({
        key: f.key.trim(),
        label: f.label.trim(),
        type: f.type,
        options: f.type === "select" ? f.options : undefined,
        required: f.required,
      })),
    });
  }

  function addField() {
    setFields((prev) => [...prev, { key: "", label: "", type: "text" }]);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function updateField(index: number, updates: Partial<TemplateField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Appliance, Tool, Plant"
              required
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., appliance, tool, plant"
              required
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this template for?"
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
            />
          </div>

          <div className="border-t border-[var(--line)] pt-4">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--sea-ink)]">Fields</label>
              <button
                type="button"
                onClick={addField}
                className="rounded-lg bg-[var(--lagoon-deep)]/10 px-3 py-1.5 text-xs font-medium text-[var(--lagoon-deep)] transition hover:bg-[var(--lagoon-deep)]/20"
              >
                + Add Field
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <FieldEditor
                  key={index}
                  field={field}
                  onChange={(updates) => updateField(index, updates)}
                  onRemove={() => removeField(index)}
                  canRemove={fields.length > 1}
                />
              ))}
            </div>
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
              disabled={pending || !name.trim() || !category.trim()}
              className="flex-1 rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {pending ? "Saving…" : title === "Create Template" ? "Create" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  onChange,
  onRemove,
  canRemove,
}: {
  field: TemplateField;
  onChange: (updates: Partial<TemplateField>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [optionsText, setOptionsText] = useState(field.options?.join(", ") ?? "");

  function handleOptionsChange(value: string) {
    setOptionsText(value);
    const options = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onChange({ options });
  }

  return (
    <div className="rounded-lg border border-[var(--line)] bg-gray-50 p-3">
      <div className="mb-2 grid grid-cols-2 gap-2">
        <input
          type="text"
          value={field.key}
          onChange={(e) => onChange({ key: e.target.value })}
          placeholder="Field key (e.g., brand)"
          className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Field label (e.g., Brand)"
          className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-2 flex items-center gap-2">
        <select
          value={field.type}
          onChange={(e) => onChange({ type: e.target.value as FieldType })}
          className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
          <option value="select">Dropdown</option>
          <option value="boolean">Checkbox</option>
        </select>

        <label className="flex items-center gap-1.5 text-sm text-[var(--sea-ink)]">
          <input
            type="checkbox"
            checked={field.required ?? false}
            onChange={(e) => onChange({ required: e.target.checked })}
            className="rounded"
          />
          Required
        </label>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto rounded px-2 py-1 text-xs text-red-500 transition hover:bg-red-100"
          >
            Remove
          </button>
        )}
      </div>

      {field.type === "select" && (
        <input
          type="text"
          value={optionsText}
          onChange={(e) => handleOptionsChange(e.target.value)}
          placeholder="Options (comma-separated, e.g., Red, Green, Blue)"
          className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
