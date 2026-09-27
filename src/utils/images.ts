// Client-side image handling for proposal uploads. Photos are downscaled and
// re-encoded as JPEG data URLs so a handful fit in localStorage in the POC.
// In production the file goes to blob storage and only the URL is stored.

export interface StoredImage {
  name: string;
  dataUrl: string;
}

const MAX_EDGE = 1280;
const QUALITY = 0.8;

export async function fileToStoredImage(file: File): Promise<StoredImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { name: file.name, dataUrl: canvas.toDataURL("image/jpeg", QUALITY) };
}

/** Rough byte size of a data URL payload, for the storage budget note. */
export function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  return Math.round(((dataUrl.length - i - 1) * 3) / 4);
}
