'use client';

import { useEffect, useState } from 'react';

interface ComplianceReport {
  id: string;
  type: 'GDPR_EXPORT' | 'GDPR_DELETION' | 'PRIVACY_AUDIT' | 'DATA_BREACH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  userId?: string;
  description?: string;
  reportData?: any;
  generatedById?: string;
  completedAt?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  generatedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ComplianceReportsResponse {
  complianceReports: ComplianceReport[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}

export function ComplianceManager() {
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedType, setSelectedType] = useState<
    ComplianceReport['type'] | 'ALL'
  >('ALL');
  const [selectedStatus, setSelectedStatus] = useState<
    ComplianceReport['status'] | 'ALL'
  >('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<
    ComplianceReportsResponse['pagination'] | null
  >(null);

  // Form state
  const [formData, setFormData] = useState({
    type: 'GDPR_EXPORT' as ComplianceReport['type'],
    userId: '',
    description: '',
  });

  useEffect(() => {
    fetchReports();
  }, [selectedType, selectedStatus, page]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (selectedType !== 'ALL') {
        params.append('type', selectedType);
      }
      if (selectedStatus !== 'ALL') {
        params.append('status', selectedStatus);
      }

      const response = await fetch(`/api/admin/security/compliance?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch compliance reports');
      }

      const data: ComplianceReportsResponse = await response.json();
      setReports(data.complianceReports);
      setPagination(data.pagination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch compliance reports'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/security/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create compliance report');
      }

      // Reset form and refresh list
      setFormData({
        type: 'GDPR_EXPORT',
        userId: '',
        description: '',
      });
      setShowCreateForm(false);
      await fetchReports();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create compliance report'
      );
    }
  };

  const getStatusColor = (status: ComplianceReport['status']) => {
    const colors: Record<ComplianceReport['status'], string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  const getTypeIcon = (type: ComplianceReport['type']) => {
    switch (type) {
      case 'GDPR_EXPORT':
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case 'GDPR_DELETION':
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        );
      case 'PRIVACY_AUDIT':
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'DATA_BREACH':
        return (
          <svg
            className="w-5 h-5"
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
      default:
        return null;
    }
  };

  const getTypeLabel = (type: ComplianceReport['type']) => {
    const labels: Record<ComplianceReport['type'], string> = {
      GDPR_EXPORT: 'GDPR Data Export',
      GDPR_DELETION: 'GDPR Data Deletion',
      PRIVACY_AUDIT: 'Privacy Audit',
      DATA_BREACH: 'Data Breach Report',
    };
    return labels[type];
  };

  if (loading && reports.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
                Compliance Management
              </h3>
              <p className="text-sm text-gray-600">
                Manage GDPR requests, privacy audits, and compliance reports
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Report
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Filter by Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="ALL">All Types</option>
                <option value="GDPR_EXPORT">GDPR Data Export</option>
                <option value="GDPR_DELETION">GDPR Data Deletion</option>
                <option value="PRIVACY_AUDIT">Privacy Audit</option>
                <option value="DATA_BREACH">Data Breach Report</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Filter by Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Create Report Form */}
        {showCreateForm && (
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
            <form onSubmit={handleCreateReport} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Report Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as any })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="GDPR_EXPORT">GDPR Data Export</option>
                    <option value="GDPR_DELETION">GDPR Data Deletion</option>
                    <option value="PRIVACY_AUDIT">Privacy Audit</option>
                    <option value="DATA_BREACH">Data Breach Report</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    User ID (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="User ID for user-specific reports"
                    value={formData.userId}
                    onChange={(e) =>
                      setFormData({ ...formData, userId: e.target.value })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe the purpose of this compliance report..."
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Create Report
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

        {/* Reports List */}
        <div className="px-6 py-4">
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No compliance reports found</p>
              <p className="text-sm text-gray-400 mt-1">
                Note: The compliance reports table may not exist yet. Run
                database migration first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 text-gray-400">
                        {getTypeIcon(report.type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {getTypeLabel(report.type)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}
                    >
                      {report.status.replace('_', ' ')}
                    </span>
                  </div>

                  {report.description && (
                    <p className="mt-2 text-sm text-gray-600">
                      {report.description}
                    </p>
                  )}

                  <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                    {report.user && (
                      <span>
                        User: {report.user.name} ({report.user.email})
                      </span>
                    )}
                    {report.generatedBy && (
                      <span>Generated by: {report.generatedBy.name}</span>
                    )}
                    {report.completedAt && (
                      <span>
                        Completed:{' '}
                        {new Date(report.completedAt).toLocaleString()}
                      </span>
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
