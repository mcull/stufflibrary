/**
 * Re-encodes a photo through a canvas before upload (#461): strips
 * EXIF/GPS metadata that camera-roll files carry, and downsizes
 * phone-camera originals to an upload-friendly size. The live-capture
 * flow gets this implicitly from its canvas; this gives picked files
 * the same treatment. Browser only.
 */
export async function prepareImage(
  file: File,
  maxDimension = 1600,
  quality = 0.8
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height)
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
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
