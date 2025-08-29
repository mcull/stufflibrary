'use client';

import { useEffect, useState } from 'react';

interface BlockedIP {
  id: string;
  ipAddress: string;
  reason: string;
  description?: string;
  isActive: boolean;
  expiresAt?: string;
  blockedBy?: string;
  createdAt: string;
}

interface BlockedIPsResponse {
  blockedIPs: BlockedIP[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function IPBlockingManager() {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<
    BlockedIPsResponse['pagination'] | null
  >(null);

  // Form state
  const [formData, setFormData] = useState({
    ipAddress: '',
    reason: 'MANUAL_BLOCK' as const,
    description: '',
    expiresAt: '',
  });

  useEffect(() => {
    fetchBlockedIPs();
  }, [activeOnly, page]);

  const fetchBlockedIPs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        activeOnly: activeOnly.toString(),
        page: page.toString(),
        limit: '20',
      });

      const response = await fetch(`/api/admin/security/blocked-ips?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch blocked IPs');
      }

      const data: BlockedIPsResponse = await response.json();
      setBlockedIPs(data.blockedIPs);
      setPagination(data.pagination);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch blocked IPs'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBlockIP = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/security/blocked-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          expiresAt: formData.expiresAt || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to block IP');
      }

      // Reset form and refresh list
      setFormData({
        ipAddress: '',
        reason: 'MANUAL_BLOCK',
        description: '',
        expiresAt: '',
      });
      setShowBlockForm(false);
      await fetchBlockedIPs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to block IP');
    }
  };

  const handleUnblockIP = async (ipAddress: string) => {
    if (!confirm(`Are you sure you want to unblock ${ipAddress}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/security/blocked-ips?ipAddress=${encodeURIComponent(ipAddress)}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unblock IP');
      }

      await fetchBlockedIPs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unblock IP');
    }
  };

  const isExpired = (expiresAt?: string) => {
    return expiresAt && new Date(expiresAt) < new Date();
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      FAILED_LOGINS: 'Failed Logins',
      API_ABUSE: 'API Abuse',
      SUSPICIOUS_ACTIVITY: 'Suspicious Activity',
      MANUAL_BLOCK: 'Manual Block',
      AUTOMATED_THREAT: 'Automated Threat',
      SPAM: 'Spam',
      BOT_TRAFFIC: 'Bot Traffic',
    };
    return labels[reason] || reason;
  };

  const getReasonColor = (reason: string) => {
    const colors: Record<string, string> = {
      FAILED_LOGINS: 'bg-red-100 text-red-800',
      API_ABUSE: 'bg-orange-100 text-orange-800',
      SUSPICIOUS_ACTIVITY: 'bg-yellow-100 text-yellow-800',
      MANUAL_BLOCK: 'bg-blue-100 text-blue-800',
      AUTOMATED_THREAT: 'bg-purple-100 text-purple-800',
      SPAM: 'bg-pink-100 text-pink-800',
      BOT_TRAFFIC: 'bg-gray-100 text-gray-800',
    };
    return colors[reason] || 'bg-gray-100 text-gray-800';
  };

  if (loading && blockedIPs.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                IP Blocking Management
              </h3>
              <p className="text-sm text-gray-600">
                Manage blocked IP addresses and access controls
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Active only</span>
              </label>
              <button
                onClick={() => setShowBlockForm(!showBlockForm)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Block IP
              </button>
            </div>
          </div>
        </div>

        {/* Block IP Form */}
        {showBlockForm && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <form onSubmit={handleBlockIP} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    IP Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="192.168.1.1"
                    value={formData.ipAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, ipAddress: e.target.value })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reason
                  </label>
                  <select
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reason: e.target.value as any,
                      })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="MANUAL_BLOCK">Manual Block</option>
                    <option value="FAILED_LOGINS">Failed Logins</option>
                    <option value="API_ABUSE">API Abuse</option>
                    <option value="SUSPICIOUS_ACTIVITY">
                      Suspicious Activity
                    </option>
                    <option value="AUTOMATED_THREAT">Automated Threat</option>
                    <option value="SPAM">Spam</option>
                    <option value="BOT_TRAFFIC">Bot Traffic</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description of why this IP is being blocked..."
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expires At (optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) =>
                    setFormData({ ...formData, expiresAt: e.target.value })
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty for permanent block
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBlockForm(false)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Block IP
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-700">Error: {error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Blocked IPs List */}
        <div className="px-6 py-4">
          {blockedIPs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {activeOnly
                ? 'No active blocked IPs found'
                : 'No blocked IPs found'}
            </p>
          ) : (
            <div className="space-y-4">
              {blockedIPs.map((blockedIP) => (
                <div
                  key={blockedIP.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-lg font-medium">
                        {blockedIP.ipAddress}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReasonColor(blockedIP.reason)}`}
                      >
                        {getReasonLabel(blockedIP.reason)}
                      </span>
                      {!blockedIP.isActive && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                      {blockedIP.expiresAt &&
                        isExpired(blockedIP.expiresAt) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Expired
                          </span>
                        )}
                    </div>
                    {blockedIP.isActive && !isExpired(blockedIP.expiresAt) && (
                      <button
                        onClick={() => handleUnblockIP(blockedIP.ipAddress)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Unblock
                      </button>
                    )}
                  </div>

                  {blockedIP.description && (
                    <p className="mt-2 text-sm text-gray-600">
                      {blockedIP.description}
                    </p>
                  )}

                  <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                    <span>
                      Blocked: {new Date(blockedIP.createdAt).toLocaleString()}
                    </span>
                    {blockedIP.expiresAt && (
                      <span>
                        Expires:{' '}
                        {new Date(blockedIP.expiresAt).toLocaleString()}
                      </span>
                    )}
                    {blockedIP.blockedBy && (
                      <span>By: {blockedIP.blockedBy}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.totalPages} (
                {pagination.totalCount} total)
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
