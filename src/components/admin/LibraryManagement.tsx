'use client';

import { useState, useEffect } from 'react';

interface Library {
  id: string;
  name: string;
  description: string;
  adminUser: {
    name: string;
    email: string;
  };
}

export function LibraryManagement() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
  });

  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        setLoading(true);
        // Mock API call
        await new Promise((resolve) => setTimeout(resolve, 100));
        setLibraries([
          {
            id: '1',
            name: 'Test Library',
            description: 'A test library',
            adminUser: {
              name: 'Jane Doe',
              email: 'jane@example.com',
            },
          },
        ]);
      } catch (error) {
        console.error('Error fetching libraries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLibraries();
  }, []);

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Loading libraries...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Library Management</h2>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search libraries..."
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
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Libraries Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Library
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admin
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {libraries.map((library) => (
              <tr key={library.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {library.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {library.description}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {library.adminUser.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {library.adminUser.email}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {libraries.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg font-medium">No libraries found</p>
              <p className="text-sm">No libraries match the current filters</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
