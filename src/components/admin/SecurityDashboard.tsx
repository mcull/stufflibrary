'use client';

import { useEffect, useState } from 'react';

import { ComplianceManager } from './ComplianceManager';
import { IPBlockingManager } from './IPBlockingManager';

interface SecurityOverview {
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  totalEvents: number;
  activeBlockedIPs: number;
  criticalEventsLast24h: number;
  suspiciousIPs: number;
}

interface SecurityMetrics {
  eventsByType: Array<{ type: string; _count: { type: number } }>;
  eventsBySeverity: Array<{ severity: string; _count: { severity: number } }>;
  blockedIPCount: number;
  recentHighSeverityEvents: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    ipAddress?: string;
    createdAt: string;
    user?: { name: string; email: string };
  }>;
  totalEvents: number;
}

interface SuspiciousIP {
  ipAddress: string;
  failedAttempts: number;
}

interface SecurityDashboardData {
  overview: SecurityOverview;
  metrics: SecurityMetrics;
  recentCriticalEvents: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    ipAddress?: string;
    createdAt: string;
    user?: { name: string; email: string };
  }>;
  suspiciousIPs: SuspiciousIP[];
  period: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

function ThreatLevelBadge({ level }: { level: string }) {
  const colors = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[level as keyof typeof colors] || colors.LOW}`}
    >
      {level}
    </span>
  );
}

function SecurityMetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
}) {
  const safeValue = typeof value === 'number' ? value : 0;
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 text-gray-400">{icon}</div>
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
                    className={`${trend.positive ? 'text-green-600' : 'text-red-600'} font-medium`}
                  >
                    {trend.positive ? '+' : ''}
                    {trend.value}
                  </span>
                  <span className="ml-2 text-gray-500">from yesterday</span>
                </dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SecurityDashboard() {
  const [data, setData] = useState<SecurityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('7d');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'ip-blocking' | 'events' | 'compliance'
  >('overview');

  useEffect(() => {
    fetchSecurityData();
  }, [period]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/security/dashboard?period=${period}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch security data');
      }

      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch security data'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white shadow rounded-lg p-5">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={fetchSecurityData}
          className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const ShieldIcon = () => (
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
        d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );

  const ExclamationIcon = () => (
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
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
  );

  const BanIcon = () => (
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
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636"
      />
    </svg>
  );

  const EyeIcon = () => (
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
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('ip-blocking')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ip-blocking'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            IP Blocking
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'events'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Security Events
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'compliance'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Compliance
          </button>
        </nav>
      </div>

      {activeTab === 'ip-blocking' && <IPBlockingManager />}

      {activeTab === 'overview' && (
        <>
          {/* Header with period selector */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Security Overview
              </h2>
              {data && <ThreatLevelBadge level={data.overview.threatLevel} />}
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>

          {/* Security Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SecurityMetricCard
              title="Total Security Events"
              value={data.overview.totalEvents}
              subtitle={`Period: ${period}`}
              icon={<ShieldIcon />}
            />

            <SecurityMetricCard
              title="Critical Events (24h)"
              value={data.overview.criticalEventsLast24h}
              subtitle="High/Critical severity"
              icon={<ExclamationIcon />}
            />

            <SecurityMetricCard
              title="Blocked IPs"
              value={data.overview.activeBlockedIPs}
              subtitle="Currently active"
              icon={<BanIcon />}
            />

            <SecurityMetricCard
              title="Suspicious IPs"
              value={data.overview.suspiciousIPs}
              subtitle="Multiple failed logins"
              icon={<EyeIcon />}
            />
          </div>

          {/* Event Type Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Events by Type
              </h3>
              <div className="space-y-3">
                {data.metrics.eventsByType.slice(0, 6).map((event) => (
                  <div
                    key={event.type}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm text-gray-600">
                      {event.type.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium">{event._count.type}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Events by Severity
              </h3>
              <div className="space-y-3">
                {data.metrics.eventsBySeverity.map((event) => (
                  <div
                    key={event.severity}
                    className="flex justify-between items-center"
                  >
                    <div className="flex items-center space-x-2">
                      <ThreatLevelBadge level={event.severity} />
                    </div>
                    <span className="font-medium">{event._count.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Critical Events */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Recent Critical Events
              </h3>
            </div>
            <div className="px-6 py-4">
              {data.recentCriticalEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No critical events in the selected period
                </p>
              ) : (
                <div className="space-y-4">
                  {data.recentCriticalEvents.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <ThreatLevelBadge level={event.severity} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {event.message}
                        </p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>{event.type.replace(/_/g, ' ')}</span>
                          {event.ipAddress && (
                            <span>IP: {event.ipAddress}</span>
                          )}
                          {event.user && <span>User: {event.user.name}</span>}
                          <span>
                            {new Date(event.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Suspicious IPs */}
          {data.suspiciousIPs.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Suspicious IP Addresses
                </h3>
                <p className="text-sm text-gray-600">
                  IPs with multiple failed login attempts in the last hour
                </p>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-2">
                  {data.suspiciousIPs.slice(0, 10).map((ip) => (
                    <div
                      key={ip.ipAddress}
                      className="flex justify-between items-center py-2 px-3 bg-yellow-50 rounded"
                    >
                      <span className="font-mono text-sm">{ip.ipAddress}</span>
                      <span className="text-sm text-red-600 font-medium">
                        {ip.failedAttempts} failed attempts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'events' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Security Events
          </h3>
          <p className="text-gray-600">
            Security events management interface will be implemented here.
          </p>
        </div>
      )}

      {activeTab === 'compliance' && <ComplianceManager />}
    </div>
  );
}
