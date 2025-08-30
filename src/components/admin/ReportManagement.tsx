'use client';

// Stub enums until schema is updated
enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED'
}
enum ReportPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}
enum UserReportReason {
  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  FRAUD = 'FRAUD',
  OTHER = 'OTHER'
}
import { useState, useEffect, useCallback } from 'react';

interface UserReport {
  id: string;
  reason: UserReportReason;
  description: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  notes: string | null;
  reporter: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  reported: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    trustScore: number;
    warningCount: number;
    suspensionCount: number;
    isSuspended: boolean;
  };
  item?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  library?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function ReportManagement() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    reason: '',
  });
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        search: filters.search,
        status: filters.status,
        priority: filters.priority,
        reason: filters.reason,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(`/api/admin/reports?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(data.reports);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch reports'
      );
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleBulkAction = async (
    action: string,
    data?: Record<string, unknown>
  ) => {
    if (selectedReports.length === 0) return;

    try {
      const response = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportIds: selectedReports, action, data }),
      });

      if (!response.ok) {
        throw new Error('Failed to update reports');
      }

      setSelectedReports([]);
      await fetchReports();
    } catch (error) {
      console.error('Error updating reports:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update reports'
      );
    }
  };

  const handleReportSelect = (reportId: string, checked: boolean) => {
    if (checked) {
      setSelectedReports([...selectedReports, reportId]);
    } else {
      setSelectedReports(selectedReports.filter((id) => id !== reportId));
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case ReportStatus.UNDER_REVIEW:
        return 'bg-blue-100 text-blue-800';
      case ReportStatus.RESOLVED:
        return 'bg-green-100 text-green-800';
      case ReportStatus.DISMISSED:
        return 'bg-gray-100 text-gray-800';
      case ReportStatus.ESCALATED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: ReportPriority) => {
    switch (priority) {
      case ReportPriority.LOW:
        return 'bg-gray-100 text-gray-800';
      case ReportPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800';
      case ReportPriority.HIGH:
        return 'bg-orange-100 text-orange-800';
      case ReportPriority.CRITICAL:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatReason = (reason: UserReportReason) => {
    return reason
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return <div className="p-6 text-center">Loading reports...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>Error: {error}</p>
        <button
          onClick={() => fetchReports()}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Report Management</h2>
        <div className="text-sm text-gray-500">
          {pagination.total} reports total
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search reports, users..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="ESCALATED">Escalated</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, priority: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <select
            value={filters.reason}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, reason: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Reasons</option>
            <option value="INAPPROPRIATE_CONTENT">Inappropriate Content</option>
            <option value="SPAM">Spam</option>
            <option value="FRAUD">Fraud</option>
            <option value="HARASSMENT">Harassment</option>
            <option value="COPYRIGHT_VIOLATION">Copyright Violation</option>
            <option value="SAFETY_CONCERN">Safety Concern</option>
            <option value="TERMS_VIOLATION">Terms Violation</option>
            <option value="OTHER">Other</option>
          </select>

          <button
            onClick={() =>
              setFilters({ search: '', status: '', priority: '', reason: '' })
            }
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedReports.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedReports.length} report(s) selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('resolve')}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Resolve
              </button>
              <button
                onClick={() => handleBulkAction('dismiss')}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleBulkAction('escalate')}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Escalate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedReports.length === reports.length &&
                    reports.length > 0
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedReports(reports.map((report) => report.id));
                    } else {
                      setSelectedReports([]);
                    }
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Report Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reporter
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reported User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedReports.includes(report.id)}
                    onChange={(e) =>
                      handleReportSelect(report.id, e.target.checked)
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatReason(report.reason)}
                    </div>
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {report.description || 'No description'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </div>
                    {report.item && (
                      <div className="text-xs text-blue-600">
                        Item: {report.item.name}
                      </div>
                    )}
                    {report.library && (
                      <div className="text-xs text-purple-600">
                        Library: {report.library.name}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {report.reporter.name || 'No name'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {report.reporter.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {report.reported.name || 'No name'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {report.reported.email}
                  </div>
                  <div className="text-xs text-gray-400">
                    Trust: {report.reported.trustScore.toFixed(0)} | Warnings:{' '}
                    {report.reported.warningCount} | Suspensions:{' '}
                    {report.reported.suspensionCount}
                    {report.reported.isSuspended && (
                      <span className="text-red-600 ml-1">(Suspended)</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(report.priority)}`}
                  >
                    {report.priority.toLowerCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}
                  >
                    {report.status.toLowerCase().replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded text-xs">
                    View Details
                  </button>
                  {report.status === ReportStatus.PENDING && (
                    <>
                      <button
                        onClick={() =>
                          handleBulkAction('resolve', {
                            reportIds: [report.id],
                          })
                        }
                        className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded text-xs"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() =>
                          handleBulkAction('escalate', {
                            reportIds: [report.id],
                          })
                        }
                        className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs"
                      >
                        Escalate
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {reports.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
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
              <p className="text-lg font-medium">No reports found</p>
              <p className="text-sm">No reports match the current filters</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
