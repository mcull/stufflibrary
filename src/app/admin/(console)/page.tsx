import { DeskClient } from '@/components/admin/console/DeskClient';

// Auth guard lives in the (console) group layout; this page is just the Desk.
export default function AdminDeskPage() {
  return <DeskClient />;
}
