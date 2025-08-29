'use client';

import { useCallback, useEffect, useState } from 'react';

interface UserDetails {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  phoneVerified: boolean;
  bio: string | null;
  status: string;
  profileCompleted: boolean;
  shareInterests: string[];
  borrowInterests: string[];
  movedInDate: string | null;
  createdAt: string;
  updatedAt: string;
  addresses: Array<{
    id: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    createdAt: string;
  }>;
  borrowRequests: Array<{
    id: string;
    status: string;
    requestMessage: string | null;
    lenderMessage: string | null;
    createdAt: string;
    item: {
      id: string;
      name: string;
      owner: {
        id: string;
        name: string | null;
        email: string | null;
      };
    };
  }>;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    condition: string;
    category: string | null;
    imageUrl: string | null;
    createdAt: string;
    _count: {
      borrowRequests: number;
    };
  }>;
  metrics: {
    trustScore: number;
    activityLevel: string;
    recentActivity: number;
    totalBorrowRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    pendingRequests: number;
    approvalRate: number;
  };
}

interface UserDetailModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UserDetailModal({
  userId,
  isOpen,
  onClose,
}: UserDetailModalProps) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchUserDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/users/${userId}/details`);

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load user details'
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
    }
  }, [isOpen, userId, fetchUserDetails]);

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getActivityLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'text-green-600 bg-green-100';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100';
      case 'DECLINED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        <div className="inline-block w-full max-w-6xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">User Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600">
                Loading user details...
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-700">Error: {error}</p>
            </div>
          )}

          {user && (
            <div>
              {/* User Header */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xl font-medium text-gray-600">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">
                        {user.name || 'No name'}
                      </h4>
                      <p className="text-gray-600">{user.email}</p>
                      <p className="text-gray-500 text-sm">
                        Member since{' '}
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getTrustScoreColor(user.metrics.trustScore)}`}
                    >
                      Trust Score: {user.metrics.trustScore}/100
                    </div>
                    <div
                      className={`inline-flex px-3 py-1 text-sm font-medium rounded-full mt-2 ${getActivityLevelColor(user.metrics.activityLevel)}`}
                    >
                      {user.metrics.activityLevel.charAt(0).toUpperCase() +
                        user.metrics.activityLevel.slice(1)}{' '}
                      Activity
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'activity', label: 'Activity' },
                    { id: 'items', label: 'Items' },
                    { id: 'requests', label: 'Requests' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">
                      Personal Information
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Status:</strong> {user.status}
                      </div>
                      <div>
                        <strong>Phone:</strong> {user.phone || 'Not provided'}
                      </div>
                      <div>
                        <strong>Phone Verified:</strong>{' '}
                        {user.phoneVerified ? 'Yes' : 'No'}
                      </div>
                      <div>
                        <strong>Profile Complete:</strong>{' '}
                        {user.profileCompleted ? 'Yes' : 'No'}
                      </div>
                      <div>
                        <strong>Bio:</strong> {user.bio || 'Not provided'}
                      </div>
                      <div>
                        <strong>Move-in Date:</strong>{' '}
                        {user.movedInDate
                          ? new Date(user.movedInDate).toLocaleDateString()
                          : 'Not provided'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">
                      Activity Metrics
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Total Items:</strong> {user.items.length}
                      </div>
                      <div>
                        <strong>Total Requests:</strong>{' '}
                        {user.metrics.totalBorrowRequests}
                      </div>
                      <div>
                        <strong>Approved:</strong>{' '}
                        {user.metrics.approvedRequests}
                      </div>
                      <div>
                        <strong>Rejected:</strong>{' '}
                        {user.metrics.rejectedRequests}
                      </div>
                      <div>
                        <strong>Pending:</strong> {user.metrics.pendingRequests}
                      </div>
                      <div>
                        <strong>Approval Rate:</strong>{' '}
                        {user.metrics.approvalRate.toFixed(1)}%
                      </div>
                      <div>
                        <strong>Recent Activity:</strong>{' '}
                        {user.metrics.recentActivity} requests in last 30 days
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">
                    Recent Activity
                  </h5>
                  <div className="space-y-3">
                    {user.borrowRequests.slice(0, 10).map((request) => (
                      <div key={request.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{request.item.name}</p>
                            <p className="text-sm text-gray-600">
                              From:{' '}
                              {request.item.owner.name ||
                                request.item.owner.email}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${getStatusColor(request.status)}`}
                          >
                            {request.status}
                          </span>
                        </div>
                        {request.requestMessage && (
                          <p className="text-sm text-gray-700 mt-2">
                            &ldquo;{request.requestMessage}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'items' && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">
                    User&apos;s Items
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {user.items.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3">
                        <h6 className="font-medium">{item.name}</h6>
                        <p className="text-sm text-gray-600">
                          {item.description}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          <div>Condition: {item.condition}</div>
                          <div>Category: {item.category || 'N/A'}</div>
                          <div>Requests: {item._count.borrowRequests}</div>
                          <div>
                            Added:{' '}
                            {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'requests' && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">
                    All Borrow Requests
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Item
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Owner
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {user.borrowRequests.map((request) => (
                          <tr key={request.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {request.item.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {request.item.owner.name ||
                                request.item.owner.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${getStatusColor(request.status)}`}
                              >
                                {request.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
