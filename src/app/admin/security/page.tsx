import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { SecurityDashboard } from '@/components/admin/SecurityDashboard';
import { isAdmin } from '@/lib/admin-auth';
import { authOptions } from '@/lib/auth';

export default async function SecurityPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !isAdmin(session)) {
    redirect('/admin/login');
  }

  const cssVars = {
    ['--font-size-multiplier']: 1,
    ['--letter-spacing']: 'normal',
    ['--line-height-multiplier']: 1,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-gray-50" style={cssVars}>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Security Monitoring
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor security events, manage IP blocks, and track compliance
          </p>
        </div>

        {/* Security Dashboard */}
        <SecurityDashboard />
      </div>
    </div>
  );
}
