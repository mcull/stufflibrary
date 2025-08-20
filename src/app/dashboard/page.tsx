import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  // Redirect dashboard to lobby - maintaining backward compatibility
  redirect('/lobby');
}
