import { Metadata } from 'next';

import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export const metadata: Metadata = {
  title: 'Notifications | StuffLibrary',
  description: 'View and manage your notifications',
};

export default function NotificationsPage() {
  return <NotificationCenter />;
}