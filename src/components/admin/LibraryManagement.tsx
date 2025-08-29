'use client';

import { useCallback, useEffect, useState } from 'react';

interface Library {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  members: Array<{
    id: string;
    role: string;
    joinedAt: string;
    isActive: boolean;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }>;
  totalMembers: number;
  totalItems: number;
  totalInvitations: number;
  activeMembers: number;
}

interface Filters {
  search: string;
  isPublic: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function LibraryManagement() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [expandedLibrary, setExpandedLibrary] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    search: '',
    isPublic: '',
  });

  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 0,
  });

  const fetchLibraries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        search: filters.search,
        isPublic: filters.isPublic,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(`/api/admin/libraries?${queryParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch libraries');
      }

      const data = await response.json();
      setLibraries(data.libraries);
      setPagination(data.pagination);
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error fetching libraries:', err);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page]);

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  const resetFilters = () => {
    setFilters({
      search: '',
      isPublic: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedLibraries.length === 0) return;

    try {
      const requestData: any = {
        libraryIds: selectedLibraries,
        action: bulkAction,
      };

      if (bulkAction === 'updateVisibility') {
        const isPublic = confirm(
          'Make selected libraries public? (Cancel for private)'
        );
        requestData.data = { isPublic };
      }

      const response = await fetch('/api/admin/libraries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) throw new Error('Failed to perform bulk action');

      const result = await response.json();
      alert(`Successfully ${bulkAction}d ${result.affected} libraries`);

      setSelectedLibraries([]);
      setBulkAction('');
      await fetchLibraries();
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Bulk action error:', error);
      }
      alert(error instanceof Error ? error.message : 'Bulk action failed');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLibraries(libraries.map((library) => library.id));
    } else {
      setSelectedLibraries([]);
    }
  };

  const handleLibrarySelect = (libraryId: string, checked: boolean) => {
    if (checked) {
      setSelectedLibraries([...selectedLibraries, libraryId]);
    } else {
      setSelectedLibraries(selectedLibraries.filter((id) => id !== libraryId));
    }
  };

  const toggleLibraryExpansion = (libraryId: string) => {
    setExpandedLibrary(expandedLibrary === libraryId ? null : libraryId);
  };

  const getVisibilityColor = (isPublic: boolean) => {
    return isPublic
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Loading libraries...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={() => fetchLibraries()}
          className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Library Management</h2>
        <div className="text-sm text-gray-500">
          {pagination.total} total libraries
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div>
            <input
              type="text"
              placeholder="Search libraries, owners..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filters.isPublic}
            onChange={(e) =>
              setFilters({ ...filters, isPublic: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Visibility</option>
            <option value="true">Public</option>
            <option value="false">Private</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={resetFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Reset Filters
          </button>
          <div className="text-sm text-gray-500">
            Showing {libraries.length} of {pagination.total} libraries
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedLibraries.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedLibraries.length} library(ies) selected
            </span>
            <div className="flex items-center space-x-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1 border border-blue-300 rounded text-sm"
              >
                <option value="">Choose action...</option>
                <option value="togglePublic">Toggle Public/Private</option>
                <option value="updateVisibility">Set Visibility</option>
                <option value="delete">Delete Libraries</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Libraries Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedLibraries.length === libraries.length &&
                    libraries.length > 0
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Library
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Visibility
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stats
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {libraries.map((library) => (
              <>
                <tr key={library.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedLibraries.includes(library.id)}
                      onChange={(e) =>
                        handleLibrarySelect(library.id, e.target.checked)
                      }
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {library.name}
                      </div>
                      {library.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {library.description}
                        </div>
                      )}
                      {library.location && (
                        <div className="text-xs text-gray-400">
                          📍 {library.location}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        Created{' '}
                        {new Date(library.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {library.owner.name || 'No name'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {library.owner.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getVisibilityColor(library.isPublic)}`}
                    >
                      {library.isPublic ? 'Public' : 'Private'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      Members: {library.totalMembers} ({library.activeMembers}{' '}
                      active)
                    </div>
                    <div>Items: {library.totalItems}</div>
                    <div>Invitations: {library.totalInvitations}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => toggleLibraryExpansion(library.id)}
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded text-xs"
                    >
                      {expandedLibrary === library.id
                        ? 'Hide Details'
                        : 'View Details'}
                    </button>
                  </td>
                </tr>

                {/* Expanded Details Row */}
                {expandedLibrary === library.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">
                          Library Members
                        </h4>
                        {library.members.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {library.members.map((member) => (
                              <div
                                key={member.id}
                                className="bg-white p-3 rounded-lg border"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {member.user.name || 'No name'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {member.user.email}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      Joined{' '}
                                      {new Date(
                                        member.joinedAt
                                      ).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        member.role === 'admin'
                                          ? 'bg-purple-100 text-purple-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      {member.role}
                                    </span>
                                    {!member.isActive && (
                                      <span className="text-xs text-red-600 mt-1">
                                        Inactive
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">
                            No members found
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {libraries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No libraries found matching your criteria
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() =>
                setPagination({
                  ...pagination,
                  page: Math.max(1, pagination.page - 1),
                })
              }
              disabled={pagination.page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPagination({
                  ...pagination,
                  page: Math.min(pagination.pages, pagination.page + 1),
                })
              }
              disabled={pagination.page === pagination.pages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span>{' '}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() =>
                    setPagination({
                      ...pagination,
                      page: Math.max(1, pagination.page - 1),
                    })
                  }
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from(
                  { length: Math.min(5, pagination.pages) },
                  (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setPagination({ ...pagination, page })}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pagination.page === page
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  }
                )}
                <button
                  onClick={() =>
                    setPagination({
                      ...pagination,
                      page: Math.min(pagination.pages, pagination.page + 1),
                    })
                  }
                  disabled={pagination.page === pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
