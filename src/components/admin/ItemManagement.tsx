'use client';

import { useCallback, useEffect, useState } from 'react';

interface Item {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  condition: string;
  location: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  stuffType: {
    displayName: string;
    category: string;
    iconPath: string;
  } | null;
  libraries: Array<{
    id: string;
    name: string;
  }>;
  currentBorrower: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  totalBorrowRequests: number;
}

interface Filters {
  search: string;
  category: string;
  condition: string;
  status: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function ItemManagement() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');

  const [filters, setFilters] = useState<Filters>({
    search: '',
    category: '',
    condition: '',
    status: '',
  });

  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 0,
  });

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        search: filters.search,
        category: filters.category,
        condition: filters.condition,
        status: filters.status,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(`/api/admin/items?${queryParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }

      const data = await response.json();
      setItems(data.items);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      condition: '',
      status: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedItems.length === 0) return;

    try {
      const requestData: any = { itemIds: selectedItems, action: bulkAction };

      if (bulkAction === 'updateCondition') {
        const condition = prompt(
          'Enter new condition (excellent, good, fair, poor):'
        );
        if (!condition) return;
        requestData.data = { condition };
      } else if (bulkAction === 'updateCategory') {
        const category = prompt('Enter new category:');
        if (!category) return;
        requestData.data = { category };
      }

      const response = await fetch('/api/admin/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) throw new Error('Failed to perform bulk action');

      const result = await response.json();
      alert(`Successfully ${bulkAction}d ${result.affected} items`);

      setSelectedItems([]);
      setBulkAction('');
      await fetchItems();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Bulk action failed');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(items.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleItemSelect = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (isAvailable: boolean) => {
    return isAvailable
      ? 'bg-green-100 text-green-800'
      : 'bg-orange-100 text-orange-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Loading items...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={() => fetchItems()}
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
        <h2 className="text-2xl font-bold text-gray-900">Item Management</h2>
        <div className="text-sm text-gray-500">
          {pagination.total} total items
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <input
              type="text"
              placeholder="Search items, owners..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filters.category}
            onChange={(e) =>
              setFilters({ ...filters, category: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            <option value="tools">Tools</option>
            <option value="books">Books</option>
            <option value="electronics">Electronics</option>
            <option value="kitchen">Kitchen</option>
            <option value="garden">Garden</option>
            <option value="sports">Sports</option>
            <option value="other">Other</option>
          </select>

          <select
            value={filters.condition}
            onChange={(e) =>
              setFilters({ ...filters, condition: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Conditions</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="borrowed">Borrowed</option>
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
            Showing {items.length} of {pagination.total} items
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedItems.length} item(s) selected
            </span>
            <div className="flex items-center space-x-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1 border border-blue-300 rounded text-sm"
              >
                <option value="">Choose action...</option>
                <option value="updateCondition">Update Condition</option>
                <option value="updateCategory">Update Category</option>
                <option value="delete">Delete Items</option>
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

      {/* Items Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedItems.length === items.length && items.length > 0
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Condition
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Libraries
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activity
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) =>
                      handleItemSelect(item.id, e.target.checked)
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12">
                      {item.imageUrl ? (
                        <img
                          className="h-12 w-12 rounded-lg object-cover"
                          src={item.imageUrl}
                          alt={item.name}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">
                            No Image
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.category || 'No category'}
                      </div>
                      <div className="text-xs text-gray-400">
                        Added {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {item.owner.name || 'No name'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.owner.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.isAvailable)}`}
                  >
                    {item.isAvailable ? 'Available' : 'Borrowed'}
                  </span>
                  {item.currentBorrower && (
                    <div className="text-xs text-gray-500 mt-1">
                      By:{' '}
                      {item.currentBorrower.name || item.currentBorrower.email}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConditionColor(item.condition)}`}
                  >
                    {item.condition}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.libraries.length > 0 ? (
                    <div className="space-y-1">
                      {item.libraries.slice(0, 2).map((library) => (
                        <div
                          key={library.id}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                        >
                          {library.name}
                        </div>
                      ))}
                      {item.libraries.length > 2 && (
                        <div className="text-xs text-gray-400">
                          +{item.libraries.length - 2} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">No libraries</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>Requests: {item.totalBorrowRequests}</div>
                  <div className="text-xs text-gray-400">
                    Updated {new Date(item.updatedAt).toLocaleDateString()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No items found matching your criteria
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
