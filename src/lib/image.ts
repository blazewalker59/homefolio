/**
 * Supported web image formats. We only accept formats every browser can
 * render in an <img> tag (so the hero and document viewer always work).
 * Notably this excludes HEIC/HEIF (iPhone's default), which most browsers
 * can't display.
 */
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const SUPPORTED_IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

export const UNSUPPORTED_IMAGE_MESSAGE =
  "Unsupported image format. Please upload a JPG, PNG, GIF, or WebP image.";

/** Whether a file is a browser-renderable web image. */
export function isSupportedWebImage(file: File): boolean {
  if (SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase())) return true;
  return SUPPORTED_IMAGE_EXT.test(file.name);
}

/**
 * Whether a file looks like an image at all (by MIME type or extension),
 * including formats we don't support. Used to decide when to enforce the
 * web-image check on otherwise free-form uploads (e.g. documents).
 */
export function looksLikeImage(file: File): boolean {
  return file.type.startsWith("image/") || /\.(heic|heif|bmp|tiff?|avif|svg)$/i.test(file.name);
}

/**
 * Downscale + recompress an image in the browser before upload so stored
 * files (and the hero/viewer) stay small and load fast. Photos straight off a
 * phone are multiple MB at 4000px+; this caps the long edge and re-encodes to
 * JPEG. EXIF orientation is honored so portrait shots aren't sideways.
 *
 * Animated GIFs are left alone (canvas would flatten them). On any failure it
 * falls back to the original file, so optimization is best-effort.
 */
export async function optimizeImage(
  file: File,
  opts: { maxEdge?: number; quality?: number } = {},
): Promise<File> {
  const maxEdge = opts.maxEdge ?? 2048;
  const quality = opts.quality ?? 0.82;

  if (file.type === "image/gif") return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;
    // Only adopt the result if it actually saved space (or we downscaled).
    if (scale === 1 && blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
