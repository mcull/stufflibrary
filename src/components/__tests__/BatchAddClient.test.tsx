import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BatchAddClient } from '../BatchAddClient';

vi.mock('next/navigation');
// jsdom has no createImageBitmap/canvas.toBlob — the canvas work is a
// browser detail; the crop math stays real.
vi.mock('@/lib/image-prep', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/image-prep')>()),
  prepareImage: vi
    .fn()
    .mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' })),
  imageDimensions: vi.fn().mockResolvedValue({ width: 3000, height: 4000 }),
}));

global.fetch = vi.fn();

let draftCounter = 0;
let analysisCounter = 0;

function mockPipelineFetch() {
  (fetch as any).mockImplementation((url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.includes('/api/items/create-draft')) {
      draftCounter += 1;
      return Promise.resolve({
        ok: true,
        json: async () => ({ itemId: `item-${draftCounter}` }),
      });
    }
    if (u.includes('/api/items/render-watercolor')) {
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }
    if (u.includes('/api/analyze-item')) {
      analysisCounter += 1;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          recognized: true,
          name: `Wrench ${analysisCounter}`,
          subjectBox: [0.1, 0.2, 0.3, 0.5],
          description: 'A trusty wrench',
          category: 'tools',
          confidence: 0.9,
        }),
      });
    }
    if (u.includes('/api/items/update-analysis')) {
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }
    if (u.includes('/api/items/activate')) {
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }
    if (init?.method === 'DELETE') {
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

function pickFiles(count: number) {
  const input = screen.getByTestId('batch-file-input');
  const files = Array.from(
    { length: count },
    (_, i) => new File(['p'], `garage-${i}.jpg`, { type: 'image/jpeg' })
  );
  fireEvent.change(input, { target: { files } });
}

describe('BatchAddClient (#461 camera-roll intake)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    draftCounter = 0;
    analysisCounter = 0;
    (useRouter as any).mockReturnValue({ push: vi.fn() });
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => `blob:preview-${Math.random()}`),
      revokeObjectURL: vi.fn(),
    });
    mockPipelineFetch();
  });

  it('walks a two-photo batch: add one (renamed), skip one, stamp the summary', async () => {
    render(<BatchAddClient libraryId="lib-1" />);

    pickFiles(2);

    // First recognized card comes up for review.
    const nameField = await screen.findByLabelText('Name');
    await waitFor(() => {
      expect((nameField as HTMLInputElement).value).toBe('Wrench 1');
    });

    // Correct the name, then add.
    fireEvent.change(nameField, { target: { value: 'Adjustable wrench' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to shelf' }));

    // The corrected name reaches update-analysis, and activate carries the library.
    await waitFor(() => {
      const activate = (fetch as any).mock.calls.find((c: any[]) =>
        String(c[0]).includes('/api/items/activate')
      );
      expect(activate).toBeTruthy();
      expect(JSON.parse(activate[1].body)).toMatchObject({
        itemId: 'item-1',
        libraryIds: ['lib-1'],
      });
    });
    const rename = (fetch as any).mock.calls.filter((c: any[]) =>
      String(c[0]).includes('/api/items/update-analysis')
    );
    expect(
      rename.some(
        (c: any[]) => JSON.parse(c[1].body).name === 'Adjustable wrench'
      )
    ).toBe(true);

    // Second card up next; skip it — its draft gets deleted.
    await waitFor(() => {
      expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe(
        'Wrench 2'
      );
    });
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    await waitFor(() => {
      expect(screen.getByText(/1 ADDED TO YOUR SHELF/)).toBeInTheDocument();
    });
    expect(screen.getByText(/1 skipped/)).toBeInTheDocument();
    const del = (fetch as any).mock.calls.find(
      (c: any[]) => c[1]?.method === 'DELETE'
    );
    expect(String(del[0])).toContain('/api/items/item-2');
  });

  it('marks unrecognizable photos failed instead of blocking the queue', async () => {
    (fetch as any).mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('create-draft')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ itemId: 'item-x' }),
        });
      }
      if (u.includes('analyze-item')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ recognized: false }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<BatchAddClient />);
    pickFiles(1);

    await waitFor(() => {
      expect(screen.getByText(/0 ADDED TO YOUR SHELF/)).toBeInTheDocument();
    });
    expect(screen.getByText(/1 we couldn't take in/)).toBeInTheDocument();
  });
});
