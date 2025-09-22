import { Container } from '@mui/material';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { PlatformAnalyticsDashboard } from '@/components/admin/PlatformAnalyticsDashboard';
import { isAdmin } from '@/lib/admin-auth';
import { authOptions } from '@/lib/auth';

export default async function AdminAnalyticsPage() {
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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Platform Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Comprehensive analytics and insights for platform usage, growth, and
            engagement
          </p>
        </div>

        {/* Analytics Dashboard */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <PlatformAnalyticsDashboard />
          </div>
        </div>
      </Container>
    </div>
  );
}
