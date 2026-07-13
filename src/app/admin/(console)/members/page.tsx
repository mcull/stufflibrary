import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { OldConsoleNote } from '@/components/admin/console/OldConsoleNote';

export default function AdminConsoleMembersPage() {
  return (
    <>
      <OldConsoleNote />
      <AdminUserManagement />
    </>
  );
}
