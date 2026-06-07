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
