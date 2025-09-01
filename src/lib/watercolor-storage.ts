// Simple in-memory store for watercolor results (in production, use Redis or DB)
const watercolorResults = new Map<string, any>();

// Helper function to store watercolor results
export function storeWatercolorResult(previewId: string, result: any) {
  watercolorResults.set(previewId, result);

  // Clean up after 5 minutes to prevent memory leaks
  setTimeout(
    () => {
      watercolorResults.delete(previewId);
    },
    5 * 60 * 1000
  );
}

// Helper function to get watercolor results
export function getWatercolorResult(previewId: string) {
  const result = watercolorResults.get(previewId);

  // Don't delete immediately - let the cleanup timeout handle it
  // This allows multiple polling requests to get the same result
  return result || null;
}
