/**
 * Photo preparation for intake (#461/#468). Everything is normalized
 * coordinates (fractions of image dimensions) until draw time.
 */

export interface NormalizedBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NormalizedSquare {
  x: number;
  y: number;
  size: number;
}

/**
 * The square crop to take around a recognized subject: the box's longer
 * side plus breathing room, centered on the subject, clamped inside the
 * image. Returns null for degenerate boxes so callers fall back to a
 * center crop.
 */
export function squareAroundBox(
  box: NormalizedBox,
  margin = 1.3
): NormalizedSquare | null {
  if (
    !(box.w > 0) ||
    !(box.h > 0) ||
    box.x < 0 ||
    box.y < 0 ||
    box.x + box.w > 1.001 ||
    box.y + box.h > 1.001
  ) {
    return null;
  }
  const size = Math.min(1, Math.max(box.w, box.h) * margin);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const clamp = (v: number) => Math.min(Math.max(v, 0), 1 - size);
  return { x: clamp(cx - size / 2), y: clamp(cy - size / 2), size };
}

/** The default when no subject is known: the largest centered square. */
export function centerSquare(width: number, height: number): NormalizedSquare {
  const sizePx = Math.min(width, height);
  return {
    x: (width - sizePx) / 2 / width,
    y: (height - sizePx) / 2 / height,
    size: sizePx / Math.max(width, height), // normalized against the LONG side
  };
}

/**
 * Re-encodes a photo through a canvas (strips EXIF/GPS, downsizes phone
 * originals). With a `region`, crops that normalized square; without one,
 * re-encodes the full frame (used to analyze before the crop is known).
 * Browser only.
 */
export async function prepareImage(
  file: File | Blob,
  options: {
    maxDimension?: number;
    quality?: number;
    region?: NormalizedSquare | null;
  } = {}
): Promise<Blob> {
  const { maxDimension = 1600, quality = 0.8, region = null } = options;
  const bitmap = await createImageBitmap(file);

  let srcX = 0;
  let srcY = 0;
  let srcW = bitmap.width;
  let srcH = bitmap.height;
  if (region) {
    // region.size is normalized against the long side; convert to pixels
    // and clamp to the frame.
    const sizePx = Math.min(
      Math.round(region.size * Math.max(bitmap.width, bitmap.height)),
      bitmap.width,
      bitmap.height
    );
    srcX = Math.min(Math.round(region.x * bitmap.width), bitmap.width - sizePx);
    srcY = Math.min(
      Math.round(region.y * bitmap.height),
      bitmap.height - sizePx
    );
    srcW = sizePx;
    srcH = sizePx;
  }

  const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const outW = Math.round(srcW * scale);
  const outH = Math.round(srcH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
  bitmap.close();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Failed to encode photo')),
      'image/jpeg',
      quality
    );
  });
}

/** Reads a blob's pixel dimensions (browser only). */
export async function imageDimensions(
  file: File | Blob
): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const dims = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dims;
}
