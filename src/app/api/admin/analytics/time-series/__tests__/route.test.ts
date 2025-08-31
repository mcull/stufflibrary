import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules before importing them
vi.mock('@/lib/admin-auth');
vi.mock('@/lib/db', () => ({
  db: {
    $queryRaw: vi.fn(),
  },
}));
vi.mock('@/lib/redis', () => ({
  RedisService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { RedisService } from '@/lib/redis';

import { GET } from '../route';

const mockDb = db as unknown as {
  $queryRaw: ReturnType<typeof vi.fn>;
};
const mockRequireAdminAuth = requireAdminAuth as ReturnType<typeof vi.fn>;
const mockRedisService = RedisService as unknown as {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
};

const mockTimeSeriesData = [
  {
    date: '2023-01-01',
    total: 100,
    active: 85,
  },
  {
    date: '2023-01-02',
    total: 105,
    active: 90,
  },
];

describe('/api/admin/analytics/time-series', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ id: 'admin-1' });
    mockRedisService.get.mockResolvedValue(null); // No cached data by default
  });

  it('returns time series data for users', async () => {
    mockDb.$queryRaw.mockResolvedValueOnce(mockTimeSeriesData);

    const request = new NextRequest(
      'http://localhost/api/admin/analytics/time-series?metric=users&period=day&startDate=2023-01-01&endDate=2023-01-02'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metric).toBe('users');
    expect(data.period).toBe('day');
    expect(data.data).toEqual(mockTimeSeriesData);
    expect(data.startDate).toBe('2023-01-01');
    expect(data.endDate).toBe('2023-01-02');
  });

  it('returns cached data when available', async () => {
    const cachedData = {
      metric: 'users',
      period: 'day',
      data: mockTimeSeriesData,
      startDate: '2023-01-01',
      endDate: '2023-01-02',
    };
    mockRedisService.get.mockResolvedValueOnce(cachedData);

    const request = new NextRequest(
      'http://localhost/api/admin/analytics/time-series?metric=users&period=day&startDate=2023-01-01&endDate=2023-01-02'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(cachedData);
    expect(mockDb.$queryRaw).not.toHaveBeenCalled();
  });

  it('caches data after fetching from database', async () => {
    mockDb.$queryRaw.mockResolvedValueOnce(mockTimeSeriesData);

    const request = new NextRequest(
      'http://localhost/api/admin/analytics/time-series?metric=users&period=day&startDate=2023-01-01&endDate=2023-01-02'
    );
    await GET(request);

    expect(mockRedisService.set).toHaveBeenCalledWith(
      'analytics:timeseries:users:day:2023-01-01:2023-01-02',
      {
        data: mockTimeSeriesData,
        metric: 'users',
        period: 'day',
        startDate: '2023-01-01',
        endDate: '2023-01-02',
      },
      { ex: 600 }
    );
  });

  it('handles different metrics', async () => {
    mockDb.$queryRaw.mockResolvedValueOnce(mockTimeSeriesData);

    const request = new NextRequest(
      'http://localhost/api/admin/analytics/time-series?metric=items&period=week&startDate=2023-01-01&endDate=2023-01-07'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metric).toBe('items');
    expect(data.period).toBe('week');
  });

  it('handles different time periods', async () => {
    mockDb.$queryRaw.mockResolvedValueOnce(mockTimeSeriesData);

    const request = new NextRequest(
      'http://localhost/api/admin/analytics/time-series?metric=users&period=month&startDate=2023-01-01&endDate=2023-03-01'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.period).toBe('month');
  });

  it('defaults to users metric and day period', async () => {
    mockDb.$queryRaw.mockResolvedValueOnce(mockTimeSeriesData);

    const request = new NextRequest(
      'http://localhost/api/admin/analytics/time-series?startDate=2023-01-01&endDate=2023-01-02'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metric).toBe('users');
    expect(data.period).toBe('day');
  });

  it('returns 400 when startDate is missing', async () => {
    const request = new NextRequest(
      'http://localhost/api/admin/analytics/time-series?endDate=2023-01-02'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('startDate and endDate are required');
  });

  it('returns 400 when endDate is missing', async () => {
    const request = new NextRequest(
      'http://localhost/api/admin/analytics/time-series?startDate=2023-01-01'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('startDate and endDate are required');
  });

  it('returns 400 for invalid metric', async () => {
    const request = new NextRequest(
      'http://localhost/api/admin/analytics/time-series?metric=invalid&startDate=2023-01-01&endDate=2023-01-02'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid metric specified');
  });

  it('continues without cache when Redis fails', async () => {
    mockRedisService.get.mockRejectedValueOnce(new Error('Redis error'));
    mockDb.$queryRaw.mockResolvedValueOnce(mockTimeSeriesData);

    const request = new NextRequest(
      'http://localhost/api/admin/analytics/time-series?metric=users&period=day&startDate=2023-01-01&endDate=2023-01-02'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockDb.$queryRaw).toHaveBeenCalled();
  });

  it('continues without caching when Redis set fails', async () => {
    mockDb.$queryRaw.mockResolvedValueOnce(mockTimeSeriesData);
    mockRedisService.set.mockRejectedValueOnce(new Error('Redis set error'));

    const request = new NextRequest(
      'http://localhost/api/admin/analytics/time-series?metric=users&period=day&startDate=2023-01-01&endDate=2023-01-02'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('requires admin authentication', async () => {
    mockRequireAdminAuth.mockRejectedValueOnce(new Error('Unauthorized'));

    const request = new NextRequest(
      'http://localhost/api/admin/analytics/time-series?metric=users&startDate=2023-01-01&endDate=2023-01-02'
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('handles database errors', async () => {
    mockDb.$queryRaw.mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(
      'http://localhost/api/admin/analytics/time-series?metric=users&startDate=2023-01-01&endDate=2023-01-02'
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
