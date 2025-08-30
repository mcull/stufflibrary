'use client';

// Stub enums until schema is updated  
enum AdminActionType {
  WARNING = 'WARNING',
  SUSPENSION = 'SUSPENSION',
  BAN = 'BAN',
  TRUST_SCORE_ADJUSTMENT = 'TRUST_SCORE_ADJUSTMENT'
}
import { useState, useEffect, useCallback } from 'react';

interface TrustSafetyStats {
  totalReports: number;
  pendingReports: number;
  openDisputes: number;
  suspendedUsers: number;
  avgTrustScore: number;
  recentActions: AdminAction[];
}

interface AdminAction {
  id: string;
  type: AdminActionType;
  description: string;
  reason: string | null;
  createdAt: string;
  admin: {
    id: string;
    name: string | null;
    email: string | null;
  };
  targetUser: {
    id: string;
    name: string | null;
    email: string | null;
    trustScore: number;
    warningCount: number;
    suspensionCount: number;
    isSuspended: boolean;
  };
}

export function TrustSafetyDashboard() {
  const [stats, setStats] = useState<TrustSafetyStats>({
    totalReports: 0,
    pendingReports: 0,
    openDisputes: 0,
    suspendedUsers: 0,
    avgTrustScore: 0,
    recentActions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newActionForm, setNewActionForm] = useState({
    targetUserId: '',
    type: '' as AdminActionType | '',
    description: '',
    reason: '',
    metadata: {},
  });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, these would be separate API calls
      // For now, we'll simulate the data
      const mockStats: TrustSafetyStats = {
        totalReports: 45,
        pendingReports: 12,
        openDisputes: 8,
        suspendedUsers: 3,
        avgTrustScore: 876,
        recentActions: [],
      };

      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching trust & safety stats:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch stats'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleTrustAction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !newActionForm.targetUserId ||
      !newActionForm.type ||
      !newActionForm.description
    ) {
      setError('Target user ID, action type, and description are required');
      return;
    }

    try {
      const response = await fetch('/api/admin/trust-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newActionForm),
      });

      if (!response.ok) {
        throw new Error('Failed to create trust action');
      }

      setNewActionForm({
        targetUserId: '',
        type: '',
        description: '',
        reason: '',
        metadata: {},
      });

      await fetchStats();
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error creating trust action:', error);
      }
      setError(
        error instanceof Error ? error.message : 'Failed to create trust action'
      );
    }
  };

  const getActionTypeColor = (type: AdminActionType) => {
    switch (type) {
      case AdminActionType.USER_WARNING:
        return 'bg-yellow-100 text-yellow-800';
      case AdminActionType.USER_SUSPENSION:
        return 'bg-red-100 text-red-800';
      case AdminActionType.USER_UNSUSPENSION:
        return 'bg-green-100 text-green-800';
      case AdminActionType.TRUST_SCORE_ADJUSTMENT:
        return 'bg-blue-100 text-blue-800';
      case AdminActionType.ITEM_REMOVAL:
        return 'bg-purple-100 text-purple-800';
      case AdminActionType.LIBRARY_SUSPENSION:
        return 'bg-orange-100 text-orange-800';
      case AdminActionType.DISPUTE_RESOLUTION:
        return 'bg-indigo-100 text-indigo-800';
      case AdminActionType.MANUAL_INTERVENTION:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatActionType = (type: AdminActionType) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="p-6 text-center">Loading trust & safety dashboard...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Trust & Safety Dashboard
        </h2>
        <div className="text-sm text-gray-500">
          Platform safety overview and controls
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
          <button
            onClick={() => setError(null)}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            ×
          </button>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Total Reports</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalReports}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">
            Pending Reports
          </div>
          <div className="text-2xl font-bold text-yellow-600">
            {stats.pendingReports}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Open Disputes</div>
          <div className="text-2xl font-bold text-red-600">
            {stats.openDisputes}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">
            Suspended Users
          </div>
          <div className="text-2xl font-bold text-red-600">
            {stats.suspendedUsers}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">
            Avg Trust Score
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {stats.avgTrustScore}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Trust Actions
        </h3>
        <form onSubmit={handleTrustAction} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Target User ID"
              value={newActionForm.targetUserId}
              onChange={(e) =>
                setNewActionForm((prev) => ({
                  ...prev,
                  targetUserId: e.target.value,
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <select
              value={newActionForm.type}
              onChange={(e) =>
                setNewActionForm((prev) => ({
                  ...prev,
                  type: e.target.value as AdminActionType,
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Action Type</option>
              <option value="USER_WARNING">Issue Warning</option>
              <option value="USER_SUSPENSION">Suspend User</option>
              <option value="USER_UNSUSPENSION">Unsuspend User</option>
              <option value="TRUST_SCORE_ADJUSTMENT">Adjust Trust Score</option>
              <option value="ITEM_REMOVAL">Remove Item</option>
              <option value="LIBRARY_SUSPENSION">Suspend Library</option>
              <option value="DISPUTE_RESOLUTION">Resolve Dispute</option>
              <option value="MANUAL_INTERVENTION">Manual Intervention</option>
            </select>

            <input
              type="text"
              placeholder="Reason (optional)"
              value={newActionForm.reason}
              onChange={(e) =>
                setNewActionForm((prev) => ({
                  ...prev,
                  reason: e.target.value,
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex space-x-4">
            <textarea
              placeholder="Action description (required)"
              value={newActionForm.description}
              onChange={(e) =>
                setNewActionForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />

            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 self-start"
            >
              Execute Action
            </button>
          </div>
        </form>
      </div>

      {/* Recent Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Admin Actions
          </h3>
        </div>
        <div className="p-6">
          {stats.recentActions.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg"
                >
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionTypeColor(action.type)}`}
                  >
                    {formatActionType(action.type)}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {action.description}
                    </div>
                    <div className="text-sm text-gray-500">
                      Target:{' '}
                      {action.targetUser.name || action.targetUser.email}
                      (Trust: {action.targetUser.trustScore.toFixed(0)})
                    </div>
                    <div className="text-xs text-gray-400">
                      By {action.admin.name || action.admin.email} •{' '}
                      {new Date(action.createdAt).toLocaleString()}
                    </div>
                    {action.reason && (
                      <div className="text-xs text-gray-600 mt-1">
                        Reason: {action.reason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
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
                <p className="text-lg font-medium">No recent actions</p>
                <p className="text-sm">Admin actions will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Automated Flagging Rules */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Automated Flagging System
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">
                Multiple Failed Returns
              </div>
              <div className="text-sm text-gray-500">
                Flag users with 3+ items overdue by more than 7 days
              </div>
            </div>
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
              Active
            </span>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">
                Suspicious Activity Pattern
              </div>
              <div className="text-sm text-gray-500">
                Flag accounts with rapid borrowing without returns
              </div>
            </div>
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
              Active
            </span>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">
                Trust Score Threshold
              </div>
              <div className="text-sm text-gray-500">
                Auto-suspend users below 500 trust score
              </div>
            </div>
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
              Monitoring
            </span>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Multiple Reports</div>
              <div className="text-sm text-gray-500">
                Escalate users with 5+ reports from different sources
              </div>
            </div>
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
