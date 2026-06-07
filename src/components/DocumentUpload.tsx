import { useState } from "react";
import { uploadDocumentFn } from "@/server/document";
import { isSupportedWebImage, looksLikeImage, UNSUPPORTED_IMAGE_MESSAGE } from "@/lib/image";
import type { DocumentType, DocumentEntityType } from "@/lib/storage/types";

interface DocumentUploadProps {
  entityType: DocumentEntityType;
  entityId: string;
  onUploadComplete?: () => void;
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  receipt: "Receipt",
  image: "Image",
  manual: "Manual",
  warranty: "Warranty",
  contract: "Contract",
  other: "Other",
};

export function DocumentUpload({ entityType, entityId, onUploadComplete }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<DocumentType>("other");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    // Image files must be a browser-renderable format (so the viewer works);
    // non-image documents (PDFs, etc.) are unaffected.
    if (looksLikeImage(file) && !isSupportedWebImage(file)) {
      setError(UNSUPPORTED_IMAGE_MESSAGE);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
      );

      await uploadDocumentFn({
        data: {
          entityType,
          entityId,
          type,
          filename: file.name,
          mimeType: file.type,
          fileContent: base64,
          notes: notes || undefined,
          amount: type === "receipt" && amount ? amount : undefined,
        },
      });

      setFile(null);
      setNotes("");
      setAmount("");
      onUploadComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
          Document Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DocumentType)}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm"
        >
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">File</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm"
        />
      </div>

      {type === "receipt" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm"
          />
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--sea-ink)]">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this document..."
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm"
          rows={3}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!file || uploading}
        className="w-full rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-[var(--on-accent)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? "Uploading..." : "Upload Document"}
      </button>
    </form>
  );
}
