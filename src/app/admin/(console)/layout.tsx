import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { ConsoleShell } from '@/components/admin/console/ConsoleShell';
import { isAdmin } from '@/lib/admin-auth';
import { authOptions } from '@/lib/auth';

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !isAdmin(session)) {
    redirect('/admin/login');
  }

  return (
    <ConsoleShell userName={session.user.name ?? 'Admin'}>
      {children}
    </ConsoleShell>
  );
}
