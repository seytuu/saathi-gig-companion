// @ts-check

/**
 * Media helpers. Keep uploads small so Vercel's ~4.5MB request limit
 * is never a problem.
 */

/**
 * Compress an image file to a JPEG with a max dimension of ~1280px.
 * @param {File|Blob} file
 * @param {number} [maxDim]
 * @param {number} [quality]
 * @returns {Promise<{mimeType:string, data:string}>}  base64 (no prefix)
 */
export async function compressImage(file, maxDim = 1280, quality = 0.8) {
  const bitmap = await createBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
  );
  if (!blob) throw new Error('encode failed');
  const data = await blobToBase64(blob);
  return { mimeType: 'image/jpeg', data };
}

/** @param {File|Blob} file */
async function createBitmap(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Encode a Blob to raw base64 (no data: prefix).
 * Uses FileReader.readAsDataURL — natively fast and streaming — and strips
 * the data: prefix. Avoids String.fromCharCode call-stack blow-ups on
 * large audio blobs.
 *
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.onload = () => {
      const url = /** @type {string} */ (reader.result);
      const comma = url.indexOf(',');
      resolve(comma >= 0 ? url.slice(comma + 1) : url);
    };
    reader.readAsDataURL(blob);
  });
}

/** Pass through a PDF File as base64 (no transform). */
export async function pdfToPart(file) {
  if (file.type !== 'application/pdf') throw new Error('Not a PDF.');
  const data = await blobToBase64(file);
  return { mimeType: 'application/pdf', data };
}
