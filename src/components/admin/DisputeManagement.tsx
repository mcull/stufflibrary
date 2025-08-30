'use client';

// Stub enums until schema is updated
enum DisputeStatus {
  PENDING = 'PENDING',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  UNDER_REVIEW = 'UNDER_REVIEW', 
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  DISMISSED = 'DISMISSED'
}
enum DisputeType {
  ITEM_DAMAGE = 'ITEM_DAMAGE',
  RETURN_DELAY = 'RETURN_DELAY',
  NO_SHOW = 'NO_SHOW',
  OTHER = 'OTHER'
}
enum ReportPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}
import { useState, useEffect, useCallback } from 'react';

interface Dispute {
  id: string;
  type: DisputeType;
  status: DisputeStatus;
  priority: ReportPriority;
  title: string;
  description: string;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  assignedTo: string | null;
  partyA: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    trustScore: number;
  };
  partyB: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    trustScore: number;
  };
  item?: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
  } | null;
  borrowRequest?: {
    id: string;
    status: string;
    requestedReturnDate: string;
    actualReturnDate: string | null;
  } | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function DisputeManagement() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
    priority: '',
  });
  const [selectedDisputes, setSelectedDisputes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        search: filters.search,
        status: filters.status,
        type: filters.type,
        priority: filters.priority,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(`/api/admin/disputes?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch disputes');
      }

      const data = await response.json();
      setDisputes(data.disputes);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch disputes'
      );
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const handleBulkAction = async (
    action: string,
    data?: Record<string, unknown>
  ) => {
    if (selectedDisputes.length === 0) return;

    try {
      const response = await fetch('/api/admin/disputes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disputeIds: selectedDisputes, action, data }),
      });

      if (!response.ok) {
        throw new Error('Failed to update disputes');
      }

      setSelectedDisputes([]);
      await fetchDisputes();
    } catch (error) {
      console.error('Error updating disputes:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update disputes'
      );
    }
  };

  const handleDisputeSelect = (disputeId: string, checked: boolean) => {
    if (checked) {
      setSelectedDisputes([...selectedDisputes, disputeId]);
    } else {
      setSelectedDisputes(selectedDisputes.filter((id) => id !== disputeId));
    }
  };

  const getStatusColor = (status: DisputeStatus) => {
    switch (status) {
      case DisputeStatus.OPEN:
        return 'bg-yellow-100 text-yellow-800';
      case DisputeStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800';
      case DisputeStatus.RESOLVED:
        return 'bg-green-100 text-green-800';
      case DisputeStatus.CLOSED:
        return 'bg-gray-100 text-gray-800';
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

  const formatDisputeType = (type: DisputeType) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return <div className="p-6 text-center">Loading disputes...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>Error: {error}</p>
        <button
          onClick={() => fetchDisputes()}
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
        <h2 className="text-2xl font-bold text-gray-900">Dispute Management</h2>
        <div className="text-sm text-gray-500">
          {pagination.total} disputes total
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search disputes, users..."
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
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, type: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            <option value="ITEM_NOT_RETURNED">Item Not Returned</option>
            <option value="ITEM_DAMAGED">Item Damaged</option>
            <option value="ITEM_NOT_AS_DESCRIBED">Item Not As Described</option>
            <option value="PAYMENT_DISPUTE">Payment Dispute</option>
            <option value="HARASSMENT">Harassment</option>
            <option value="OTHER">Other</option>
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

          <button
            onClick={() =>
              setFilters({ search: '', status: '', type: '', priority: '' })
            }
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedDisputes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedDisputes.length} dispute(s) selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const resolution = prompt('Enter resolution:');
                  if (resolution) {
                    handleBulkAction('resolve', { resolution });
                  }
                }}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Resolve
              </button>
              <button
                onClick={() => handleBulkAction('close')}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                Close
              </button>
              <button
                onClick={() =>
                  handleBulkAction('updateStatus', {
                    status: DisputeStatus.IN_PROGRESS,
                  })
                }
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Mark In Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disputes Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedDisputes.length === disputes.length &&
                    disputes.length > 0
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDisputes(
                        disputes.map((dispute) => dispute.id)
                      );
                    } else {
                      setSelectedDisputes([]);
                    }
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dispute Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Parties
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item/Context
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
            {disputes.map((dispute) => (
              <tr key={dispute.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedDisputes.includes(dispute.id)}
                    onChange={(e) =>
                      handleDisputeSelect(dispute.id, e.target.checked)
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatDisputeType(dispute.type)}
                    </div>
                    <div className="text-sm font-semibold text-gray-700">
                      {dispute.title}
                    </div>
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {dispute.description}
                    </div>
                    <div className="text-xs text-gray-400">
                      Created:{' '}
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </div>
                    {dispute.resolvedAt && (
                      <div className="text-xs text-green-600">
                        Resolved:{' '}
                        {new Date(dispute.resolvedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Party A: {dispute.partyA.name || 'No name'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {dispute.partyA.email} | Trust:{' '}
                        {dispute.partyA.trustScore.toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Party B: {dispute.partyB.name || 'No name'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {dispute.partyB.email} | Trust:{' '}
                        {dispute.partyB.trustScore.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {dispute.item && (
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {dispute.item.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {dispute.item.description}
                      </div>
                    </div>
                  )}
                  {dispute.borrowRequest && (
                    <div className="text-xs text-blue-600 mt-1">
                      Request Status: {dispute.borrowRequest.status}
                      <br />
                      Due:{' '}
                      {new Date(
                        dispute.borrowRequest.requestedReturnDate
                      ).toLocaleDateString()}
                      {dispute.borrowRequest.actualReturnDate && (
                        <>
                          <br />
                          Returned:{' '}
                          {new Date(
                            dispute.borrowRequest.actualReturnDate
                          ).toLocaleDateString()}
                        </>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(dispute.priority)}`}
                  >
                    {dispute.priority.toLowerCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(dispute.status)}`}
                  >
                    {dispute.status.toLowerCase().replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded text-xs">
                    View Details
                  </button>
                  {dispute.status === DisputeStatus.OPEN && (
                    <>
                      <button
                        onClick={() =>
                          handleBulkAction('updateStatus', {
                            status: DisputeStatus.IN_PROGRESS,
                            disputeIds: [dispute.id],
                          })
                        }
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs"
                      >
                        Take Case
                      </button>
                      <button
                        onClick={() => {
                          const resolution = prompt('Enter resolution:');
                          if (resolution) {
                            handleBulkAction('resolve', {
                              resolution,
                              disputeIds: [dispute.id],
                            });
                          }
                        }}
                        className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded text-xs"
                      >
                        Resolve
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {disputes.length === 0 && (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg font-medium">No disputes found</p>
              <p className="text-sm">No disputes match the current filters</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
