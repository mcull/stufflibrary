'use client';

import { useEffect, useState } from 'react';

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalItems: number;
  totalLibraries: number;
  pendingRequests: number;
  suspendedUsers: number;
  recentUsers: number;
  recentItems: number;
}

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  icon?: React.ReactNode;
}

function MetricCard({ title, value, subtitle, trend, icon }: MetricCardProps) {
  const safeValue = typeof value === 'number' ? value : 0;
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {icon && <div className="w-8 h-8 text-gray-400">{icon}</div>}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {safeValue.toLocaleString()}
              </dd>
              {subtitle && (
                <dd className="text-sm text-gray-500">{subtitle}</dd>
              )}
              {trend && (
                <dd className="flex items-center text-sm">
                  <span
                    className={`${
                      trend.positive !== false
                        ? 'text-green-600'
                        : 'text-red-600'
                    } font-medium`}
                  >
                    {trend.positive !== false ? '+' : ''}
                    {trend.value}
                  </span>
                  <span className="ml-2 text-gray-500">{trend.label}</span>
                </dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard-metrics');

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white shadow rounded-lg p-5">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={fetchMetrics}
          className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  const UsersIcon = () => (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
      />
    </svg>
  );

  const ItemsIcon = () => (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );

  const LibrariesIcon = () => (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );

  const RequestsIcon = () => (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Total Users"
        value={metrics.totalUsers}
        subtitle={`${metrics.activeUsers} active`}
        trend={{
          value: metrics.recentUsers,
          label: 'new this week',
          positive: true,
        }}
        icon={<UsersIcon />}
      />

      <MetricCard
        title="Total Items"
        value={metrics.totalItems}
        trend={{
          value: metrics.recentItems,
          label: 'new this week',
          positive: true,
        }}
        icon={<ItemsIcon />}
      />

      <MetricCard
        title="Libraries"
        value={
          (metrics as any).totalLibraries ??
          (metrics as any).totalCollections ??
          0
        }
        subtitle="Community libraries"
        icon={<LibrariesIcon />}
      />

      <MetricCard
        title="Pending Requests"
        value={metrics.pendingRequests}
        subtitle="Awaiting response"
        icon={<RequestsIcon />}
      />

      <MetricCard
        title="Active Users"
        value={metrics.activeUsers}
        subtitle={`${((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1)}% of total`}
        icon={<UsersIcon />}
      />

      <MetricCard
        title="Suspended Users"
        value={metrics.suspendedUsers}
        subtitle="Requiring attention"
        trend={{
          value: metrics.suspendedUsers,
          label: 'total suspended',
          positive: false,
        }}
        icon={<UsersIcon />}
      />

      <MetricCard
        title="New Users"
        value={metrics.recentUsers}
        subtitle="Last 7 days"
        icon={<UsersIcon />}
      />

      <MetricCard
        title="New Items"
        value={metrics.recentItems}
        subtitle="Last 7 days"
        icon={<ItemsIcon />}
      />
    </div>
  );
}
