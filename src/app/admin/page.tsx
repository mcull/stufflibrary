import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage users and system settings
          </p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              User Management
            </h2>
            <AdminUserManagement />
          </div>
        </div>
      </div>
    </div>
  );
}