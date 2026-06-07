import { useEffect, useRef, useState } from "react";
import { ImagePlus, Camera, X } from "lucide-react";
import { uploadHomePhotoFn, removeHomePhotoFn } from "@/server/home";
import { isSupportedWebImage, UNSUPPORTED_IMAGE_MESSAGE } from "@/lib/image";
import type { InferSelectModel } from "drizzle-orm";
import type { homes } from "@/db/schema";

type Home = InferSelectModel<typeof homes>;

// Distance (px) over which the hero fades out as the page scrolls down.
const FADE_DISTANCE = 260;

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function HomeHero({ home }: { home: Home }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [opacity, setOpacity] = useState(1);
  const [pending, setPending] = useState(false);

  // Fade the hero into transparency as the user scrolls down.
  useEffect(() => {
    const onScroll = () => {
      setOpacity(Math.max(0, Math.min(1, 1 - window.scrollY / FADE_DISTANCE)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const photoUrl = home.photoStorageKey
    ? `/api/documents/${encodeURIComponent(home.photoStorageKey)}?v=${new Date(home.updatedAt).getTime()}`
    : null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!isSupportedWebImage(file)) {
      alert(UNSUPPORTED_IMAGE_MESSAGE);
      return;
    }

    setPending(true);
    try {
      const fileContent = await fileToBase64(file);
      await uploadHomePhotoFn({
        data: { fileContent, mimeType: file.type || "image/jpeg", filename: file.name },
      });
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload photo");
      setPending(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Remove the home photo?")) return;
    setPending(true);
    try {
      await removeHomePhotoFn();
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove photo");
      setPending(false);
    }
  }

  return (
    <div
      className="relative h-52 w-full overflow-hidden border-b border-[var(--line)] sm:h-72"
      style={{ opacity }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      {photoUrl ? (
        <>
          <img src={photoUrl} alt="Your home" className="h-full w-full object-cover" />
          {/* Legibility wash + a touch of editorial vignette. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-transparent to-transparent" />
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="group flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[var(--lagoon-deep)]/15 via-[var(--sand)] to-[var(--bg-base)] text-[var(--sea-ink-soft)] transition hover:text-[var(--lagoon-deep)] disabled:opacity-60"
        >
          <ImagePlus className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-sm font-medium">
            {pending ? "Uploading…" : "Add a photo of your home"}
          </span>
        </button>
      )}

      {/* Home name overlay (only meaningful when there's an image behind it). */}
      {photoUrl && home.name && (
        <div className="pointer-events-none absolute bottom-3 left-4 right-4">
          <h2 className="font-serif text-2xl font-bold text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)] sm:text-3xl">
            {home.name}
          </h2>
        </div>
      )}

      {/* Change / remove controls (only when a photo exists). */}
      {photoUrl && (
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/35 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/55 disabled:opacity-60"
          >
            <Camera className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            {pending ? "Saving…" : "Change"}
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            aria-label="Remove photo"
            className="inline-flex items-center justify-center rounded-full border border-white/30 bg-black/35 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/55 disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
