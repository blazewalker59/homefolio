/**
 * Convert HEIC/HEIF images (e.g. iPhone photos) to JPEG in the browser so
 * they render in <img> and the document viewer — most browsers can't decode
 * HEIC. Non-HEIC files pass through unchanged. heic2any is browser-only and
 * pulls in a wasm decoder, so it's imported lazily on first need.
 */
export async function toViewableImage(file: File): Promise<File> {
  const isHeic = /image\/(heic|heif)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (!isHeic) return file;

  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(converted) ? converted[0] : converted;

  const base = file.name.replace(/\.(heic|heif)$/i, "");
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
