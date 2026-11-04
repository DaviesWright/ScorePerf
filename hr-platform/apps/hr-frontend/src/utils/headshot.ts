// Professional headshots for the demo shell. Photos are kept in this browser's localStorage per user id;
// a real deployment would upload the processed image to authenticated object storage instead.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const OUTPUT_SIZE = 256;
const STORED_PREFIX = "data:image/jpeg;base64,";

const storageKey = (userId: string) => `scoreview_headshot_${userId}`;

/**
 * Validates an uploaded image, crops it to a centred square, resizes it to 256x256 and re-encodes it as
 * JPEG on a canvas. Re-encoding drops EXIF/location metadata, and SVG is refused, so nothing but pixels is kept.
 * Throws an Error with a user-readable message.
 */
export async function processHeadshot(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Use a JPEG, PNG or WebP image.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("The image must be 5 MB or smaller.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That file could not be read as an image.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("This browser cannot process images.");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.fillStyle = "#ffffff"; // JPEG has no alpha; transparent PNGs get a white background
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Returns the stored headshot, or null. Anything that is not our own JPEG data URL is ignored. */
export function loadHeadshot(userId: string): string | null {
  try {
    const value = localStorage.getItem(storageKey(userId));
    return value && value.startsWith(STORED_PREFIX) ? value : null;
  } catch {
    return null;
  }
}

export function saveHeadshot(userId: string, dataUrl: string): boolean {
  try {
    localStorage.setItem(storageKey(userId), dataUrl);
    return true;
  } catch {
    return false;
  }
}

export function clearHeadshot(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {}
}
