import { useState } from "react";
import type { itemTemplates } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Template = InferSelectModel<typeof itemTemplates>;

interface ItemFormModalProps {
  templates: Template[];
  title?: string;
  defaultRoomId?: string;
  defaultSystemUnitId?: string;
  onSubmit: (data: {
    templateId: string;
    name: string;
    roomId?: string;
    systemUnitId?: string;
    fields: Record<string, unknown>;
  }) => void;
  onCancel: () => void;
  pending: boolean;
}

export function ItemFormModal({
  templates,
  title = "Add Item",
  defaultRoomId,
  defaultSystemUnitId,
  onSubmit,
  onCancel,
  pending,
}: ItemFormModalProps) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [name, setName] = useState("");
  const [fields, setFields] = useState<Record<string, unknown>>({});

  const selectedTemplate = templates.find((t) => t.id === templateId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !templateId) return;
    onSubmit({
      templateId,
      name: name.trim(),
      roomId: defaultRoomId,
      systemUnitId: defaultSystemUnitId,
      fields,
    });
  }

  function handleFieldChange(key: string, value: unknown) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">{title}</h2>
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
              className="flex-1 rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="flex-1 rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {pending ? "Creating…" : "Create Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
