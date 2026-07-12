/**
 * Re-encodes a photo through a canvas before upload (#461): center-crops
 * to a square, strips EXIF/GPS metadata that camera-roll files carry, and
 * downsizes phone-camera originals to an upload-friendly size.
 *
 * The square crop matches the live-capture contract — capturePhoto crops
 * to the viewfinder's center square — so recognition and the watercolor
 * model see batch photos framed the same way, and renders sit correctly
 * in the shelf's square frames instead of arriving tall with the subject
 * cover-cropped away. Browser only.
 */
export async function prepareImage(
  file: File,
  maxDimension = 1600,
  quality = 0.8
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const cropSize = Math.min(bitmap.width, bitmap.height);
  const cropX = (bitmap.width - cropSize) / 2;
  const cropY = (bitmap.height - cropSize) / 2;
  const outSize = Math.min(cropSize, maxDimension);

  const canvas = document.createElement('canvas');
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(
    bitmap,
    cropX,
    cropY,
    cropSize,
    cropSize,
    0,
    0,
    outSize,
    outSize
  );
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
