import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.hoisted(() => vi.fn());
const mockFindFirst = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
    joinCode: {
      create: mockCreate,
      findFirst: mockFindFirst,
      update: mockUpdate,
    },
  },
}));

import { CROCKFORD_ALPHABET } from '../join-code';
import {
  createJoinCode,
  resolveJoinCode,
  rotateJoinCode,
  recordJoinCodeUse,
} from '../join-code-service';

/** Every stored code must be drawn from the printable Crockford alphabet. */
function expectStorableCode(code: unknown) {
  expect(typeof code).toBe('string');
  const value = code as string;
  expect(value).toHaveLength(8);
  for (const char of value) {
    expect(CROCKFORD_ALPHABET).toContain(char);
  }
}

describe('createJoinCode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stores an unhyphenated 8-character code', async () => {
    mockCreate.mockResolvedValue({ id: 'jc-1' });
    await createJoinCode('col-1', 'user-1', 'corkboard flyer');

    const data = mockCreate.mock.calls[0]![0].data;
    expect(data.code).toHaveLength(8);
    expect(data.code).not.toContain('-');
    expect(data.label).toBe('corkboard flyer');
  });

  it('files the code under the library and the admin who made it', async () => {
    mockCreate.mockResolvedValue({ id: 'jc-1' });
    await createJoinCode('col-1', 'user-1', 'corkboard flyer');

    const data = mockCreate.mock.calls[0]![0].data;
    expect(data.collectionId).toBe('col-1');
    expect(data.createdById).toBe('user-1');
    expectStorableCode(data.code);
  });

  it('stores a null label when the admin did not name the batch', async () => {
    mockCreate.mockResolvedValue({ id: 'jc-1' });
    await createJoinCode('col-1', 'user-1');

    expect(mockCreate.mock.calls[0]![0].data.label).toBeNull();
  });
});

describe('resolveJoinCode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('normalizes user input before lookup', async () => {
    mockFindFirst.mockResolvedValue({ id: 'jc-1', collectionId: 'col-1' });
    await resolveJoinCode('xkf7-2m9q');

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { code: 'XKF72M9Q', isActive: true },
    });
  });

  // A flyer misread as I/O rather than 1/0 has to still resolve, so the
  // service must use the real normalizer, not an upcase-and-strip lookalike.
  it('folds Crockford lookalikes the way the printed card is read', async () => {
    mockFindFirst.mockResolvedValue({ id: 'jc-1', collectionId: 'col-1' });
    await resolveJoinCode('  oiff-7m9q  ');

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { code: '01FF7M9Q', isActive: true },
    });
  });

  it('returns null for an inactive or unknown code', async () => {
    mockFindFirst.mockResolvedValue(null);
    expect(await resolveJoinCode('ZZZZZZZZ')).toBeNull();
  });

  it('returns the row identity the join flow needs', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'jc-1',
      collectionId: 'col-1',
      label: 'corkboard flyer',
    });

    expect(await resolveJoinCode('XKF72M9Q')).toEqual({
      id: 'jc-1',
      collectionId: 'col-1',
    });
  });
});

describe('createJoinCode collision handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retries with a fresh code when the unique constraint fires', async () => {
    const collision = Object.assign(new Error('unique'), { code: 'P2002' });
    mockCreate.mockRejectedValueOnce(collision).mockResolvedValueOnce({
      id: 'jc-2',
    });

    const created = await createJoinCode('col-1', 'user-1');

    expect(created).toEqual({ id: 'jc-2' });
    expect(mockCreate).toHaveBeenCalledTimes(2);
    // A retry that reuses the colliding code would loop forever.
    expect(mockCreate.mock.calls[0]![0].data.code).not.toBe(
      mockCreate.mock.calls[1]![0].data.code
    );
  });

  it('rethrows errors that are not collisions rather than burning retries', async () => {
    mockCreate.mockRejectedValue(new Error('connection lost'));
    await expect(createJoinCode('col-1', 'user-1')).rejects.toThrow(
      'connection lost'
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('gives up after a bounded number of collisions instead of spinning', async () => {
    const collision = Object.assign(new Error('unique'), { code: 'P2002' });
    mockCreate.mockRejectedValue(collision);

    await expect(createJoinCode('col-1', 'user-1')).rejects.toMatchObject({
      code: 'P2002',
    });
    expect(mockCreate).toHaveBeenCalledTimes(5);
  });
});

describe('rotateJoinCode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deactivates the old row and creates a replacement with the same label', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'jc-1',
      collectionId: 'col-1',
      label: 'corkboard flyer',
    });
    mockUpdate.mockResolvedValue({});
    mockCreate.mockResolvedValue({ id: 'jc-2' });

    await rotateJoinCode('jc-1', 'user-1');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'jc-1' },
      data: { isActive: false, rotatedAt: expect.any(Date) },
    });
    expect(mockCreate.mock.calls[0]![0].data.label).toBe('corkboard flyer');
  });

  // The whole point of rotation is that the leaked code stops working.
  // Carrying the old code onto the new row would be a silent no-op.
  it('issues a genuinely new code rather than reprinting the leaked one', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'jc-1',
      code: 'XKF72M9Q',
      collectionId: 'col-1',
      label: 'corkboard flyer',
    });
    mockUpdate.mockResolvedValue({});
    mockCreate.mockResolvedValue({ id: 'jc-2' });

    await rotateJoinCode('jc-1', 'user-1');

    const data = mockCreate.mock.calls[0]![0].data;
    expectStorableCode(data.code);
    expect(data.code).not.toBe('XKF72M9Q');
  });

  it('keeps the replacement on the same library, credited to the rotator', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'jc-1',
      code: 'XKF72M9Q',
      collectionId: 'col-1',
      createdById: 'user-original',
      label: 'corkboard flyer',
    });
    mockUpdate.mockResolvedValue({});
    mockCreate.mockResolvedValue({ id: 'jc-2' });

    await rotateJoinCode('jc-1', 'user-1');

    const data = mockCreate.mock.calls[0]![0].data;
    expect(data.collectionId).toBe('col-1');
    expect(data.createdById).toBe('user-1');
  });

  it('touches only the rotated row, so a library can hold several live codes', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'jc-mailers',
      collectionId: 'col-1',
      label: 'spring mailers',
    });
    mockUpdate.mockResolvedValue({});
    mockCreate.mockResolvedValue({ id: 'jc-mailers-2' });

    await rotateJoinCode('jc-mailers', 'user-1');

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0]![0].where).toEqual({ id: 'jc-mailers' });
  });

  it('returns the replacement row so the caller can print it', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'jc-1',
      collectionId: 'col-1',
      label: null,
    });
    mockUpdate.mockResolvedValue({});
    mockCreate.mockResolvedValue({ id: 'jc-2' });

    expect(await rotateJoinCode('jc-1', 'user-1')).toEqual({ id: 'jc-2' });
  });

  it('returns null for an unknown code rather than creating an orphan', async () => {
    mockFindFirst.mockResolvedValue(null);
    expect(await rotateJoinCode('nope', 'user-1')).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('recordJoinCodeUse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('increments rather than overwrites, so concurrent joins both count', async () => {
    mockUpdate.mockResolvedValue({});
    await recordJoinCodeUse('jc-1');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'jc-1' },
      data: { useCount: { increment: 1 } },
    });
  });
});
