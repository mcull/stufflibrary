import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGenerateConcepts = vi.hoisted(() => vi.fn());
const mockDiscardBatch = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('@/lib/item-concept-service', () => ({
  ItemConceptService: vi.fn().mockImplementation(() => ({
    generateConcepts: mockGenerateConcepts,
    discardBatch: mockDiscardBatch,
  })),
}));

describe('POST /api/items/suggest-visuals', () => {
  beforeEach(() => {
    mockGetServerSession.mockReset();
    mockGenerateConcepts.mockReset();
    mockDiscardBatch.mockReset();
  });

  it('returns 401 when user is unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const { POST } = await import('../suggest-visuals/route');

    const request = {
      json: vi.fn(),
      headers: new Headers(),
    } as any;

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns generated concepts when request is valid', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user_123' } });
    mockGenerateConcepts.mockResolvedValue({
      batchId: 'batch_1',
      options: [
        {
          id: 'concept_1',
          watercolorUrl: 'https://example.com/image.webp',
          watercolorThumbUrl: 'https://example.com/thumb.webp',
          sourceType: 'OPENVERSE',
          generatedName: 'Cordless Drill',
          sourceAttribution: null,
        },
      ],
    });

    const { POST } = await import('../suggest-visuals/route');

    const requestBody = { name: 'Cordless drill', count: 10 };
    const request = {
      json: vi.fn().mockResolvedValue(requestBody),
      headers: new Headers(),
    } as any;

    const response = await POST(request);

    expect(mockGenerateConcepts).toHaveBeenCalledWith({
      userId: 'user_123',
      name: 'Cordless drill',
      description: undefined,
      brand: undefined,
      count: 5,
    });

    const payload = await response.json();
    expect(payload).toEqual({
      batchId: 'batch_1',
      options: [
        {
          conceptId: 'concept_1',
          watercolorUrl: 'https://example.com/image.webp',
          watercolorThumbUrl: 'https://example.com/thumb.webp',
          sourceType: 'OPENVERSE',
          generatedName: 'Cordless Drill',
          sourceAttribution: null,
        },
      ],
    });
  });

  it('discards previous batches when discardBatchId provided', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user_123' } });
    mockGenerateConcepts.mockResolvedValue({ batchId: 'batch_2', options: [] });

    const { POST } = await import('../suggest-visuals/route');

    const request = {
      json: vi.fn().mockResolvedValue({
        name: 'Camping tent',
        discardBatchId: 'old_batch',
      }),
      headers: new Headers(),
    } as any;

    await POST(request);

    expect(mockDiscardBatch).toHaveBeenCalledWith('old_batch', 'user_123');
  });

  it('returns 503 when concept storage is missing', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user_123' } });
    mockGenerateConcepts.mockRejectedValue(
      new Error('ITEM_CONCEPTS_TABLE_MISSING')
    );

    const { POST } = await import('../suggest-visuals/route');

    const request = {
      json: vi.fn().mockResolvedValue({ name: 'Cordless drill' }),
      headers: new Headers(),
    } as any;

    const response = await POST(request);
    expect(response.status).toBe(503);
  });

  it('returns 404 when no visuals can be produced', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user_123' } });
    mockGenerateConcepts.mockRejectedValue(
      new Error(
        'No matching library photos found. Configure GOOGLE_AI_API_KEY to enable watercolor suggestions.'
      )
    );

    const { POST } = await import('../suggest-visuals/route');

    const request = {
      json: vi.fn().mockResolvedValue({ name: 'Cordless drill' }),
      headers: new Headers(),
    } as any;

    const response = await POST(request);
    expect(response.status).toBe(404);
  });
});
