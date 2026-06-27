/**
 * Backup health evaluation for the Supabase-managed Postgres backups.
 *
 * Pure logic over the Supabase Management API response
 * (`GET /v1/projects/{ref}/database/backups`) so it can be unit-tested without
 * network access. The CLI in scripts/backup-monitor.ts fetches the data and
 * feeds it here.
 */

export interface SupabaseBackup {
  status?: string;
  inserted_at?: string;
  is_physical_backup?: boolean;
}

export interface SupabaseBackupsResponse {
  region?: string;
  walg_enabled?: boolean;
  pitr_enabled?: boolean;
  backups?: SupabaseBackup[];
}

export interface BackupHealth {
  pitrEnabled: boolean;
  lastBackup: Date | null;
  ageHours: number | null;
  healthy: boolean;
  alerts: string[];
}

export function evaluateBackupHealth(
  data: SupabaseBackupsResponse,
  opts: { maxBackupAgeHours: number; now: number }
): BackupHealth {
  const times = (data.backups ?? [])
    .map((b) => (b.inserted_at ? Date.parse(b.inserted_at) : NaN))
    .filter((t) => !Number.isNaN(t));

  const lastMs = times.length ? Math.max(...times) : null;
  const lastBackup = lastMs === null ? null : new Date(lastMs);
  const ageHours = lastMs === null ? null : (opts.now - lastMs) / 3_600_000;

  const alerts: string[] = [];
  if (lastBackup === null) {
    alerts.push('No backups found for the project.');
  } else if (ageHours !== null && ageHours > opts.maxBackupAgeHours) {
    alerts.push(
      `Most recent backup is ${ageHours.toFixed(1)}h old (max allowed ${opts.maxBackupAgeHours}h).`
    );
  }

  return {
    pitrEnabled: Boolean(data.pitr_enabled),
    lastBackup,
    ageHours,
    healthy: alerts.length === 0,
    alerts,
  };
}
