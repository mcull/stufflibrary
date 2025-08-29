import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { DashboardMetrics } from '@/components/admin/DashboardMetrics';
import { RecentActivity } from '@/components/admin/RecentActivity';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { isAdmin } from '@/lib/admin-auth';
import { authOptions } from '@/lib/auth';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !isAdmin(session)) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            System overview and administrative tools
          </p>
        </div>

        {/* Dashboard Metrics */}
        <div className="mb-8" id="metrics">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Key Metrics</h2>
            <a
              href="/admin/analytics"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              View Analytics Dashboard
            </a>
          </div>
          <DashboardMetrics />
        </div>

        {/* System Health and Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            System Status
          </h2>
          <SystemHealth />
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <RecentActivity limit={15} />
        </div>

        {/* User Management */}
        <div id="users">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            User Management
          </h2>
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <AdminUserManagement />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
