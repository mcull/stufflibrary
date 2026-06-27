#!/usr/bin/env tsx

/**
 * Backup Monitoring Script
 *
 * Checks the real Supabase-managed backup status via the Supabase Management
 * API (GET /v1/projects/{ref}/database/backups) and alerts if the most recent
 * backup is missing or stale.
 *
 * Requires (env-gated — no-op with a clear message if absent):
 *   SUPABASE_ACCESS_TOKEN   Personal access token from
 *                           https://supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF    The project ref to monitor (e.g. the prod project).
 *
 * The restore drill is a manual, console-driven procedure (see `test-restore`).
 */

import {
  evaluateBackupHealth,
  type SupabaseBackupsResponse,
} from '../src/lib/backup-monitor';

const MANAGEMENT_API = 'https://api.supabase.com';

function formatAge(hours: number | null): string {
  if (hours === null) return 'never';
  if (hours < 1) return `${Math.round(hours * 60)}m ago`;
  return `${hours.toFixed(1)}h ago`;
}

async function fetchBackups(
  ref: string,
  token: string
): Promise<SupabaseBackupsResponse> {
  const res = await fetch(
    `${MANAGEMENT_API}/v1/projects/${ref}/database/backups`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Supabase Management API returned ${res.status} ${res.statusText}${
        body ? `: ${body.slice(0, 200)}` : ''
      }`
    );
  }
  return (await res.json()) as SupabaseBackupsResponse;
}

async function monitorBackups(maxBackupAgeHours: number) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;

  if (!token || !ref) {
    console.log(
      '⏭️  Backup monitoring skipped — set SUPABASE_ACCESS_TOKEN and ' +
        'SUPABASE_PROJECT_REF to enable the real Supabase backup check.'
    );
    console.log(
      '    Token: https://supabase.com/dashboard/account/tokens · ' +
        'Ref: Supabase project settings.'
    );
    return;
  }

  console.log(`🔍 Checking Supabase backups for project ${ref}...`);
  const data = await fetchBackups(ref, token);
  const health = evaluateBackupHealth(data, {
    maxBackupAgeHours,
    now: Date.now(),
  });

  console.log('\n📊 Backup Status:');
  console.log(`   Project: ${ref}${data.region ? ` (${data.region})` : ''}`);
  console.log(
    `   Last backup: ${health.lastBackup?.toISOString() ?? 'never'} (${formatAge(health.ageHours)})`
  );
  console.log(`   Backups returned: ${data.backups?.length ?? 0}`);
  console.log(
    `   PITR: ${health.pitrEnabled ? 'enabled' : 'disabled (daily backups only)'}`
  );

  if (!health.healthy) {
    for (const alert of health.alerts) {
      console.error(`🚨 CRITICAL: ${alert}`);
    }
    process.exit(1);
  }

  console.log('\n✅ Backups look healthy.');
}

function printRestoreRunbook() {
  console.log('🧪 Backup restore drill — this is a MANUAL procedure.');
  console.log('');
  console.log(
    'Supabase-managed restores are performed from the dashboard, not'
  );
  console.log(
    'scripted here (restoring into the live project is destructive).'
  );
  console.log('');
  console.log('Drill steps:');
  console.log('  1. Supabase → (project) → Database → Backups.');
  console.log('  2. Restore the latest daily backup into a THROWAWAY project');
  console.log('     (or a new branch), never the live one.');
  console.log(
    '  3. Verify row counts / a few key tables in the restored copy.'
  );
  console.log('  4. Record the wall-clock restore time (your RTO) and the');
  console.log('     backup date (your worst-case RPO).');
  console.log('  5. Tear down the throwaway project.');
  console.log('');
  console.log(
    'Run `tsx scripts/backup-monitor.ts monitor` to confirm a recent'
  );
  console.log('backup exists before/after the drill.');
}

// CLI interface
const command = process.argv[2];
const maxBackupAgeHours = parseInt(process.argv[3] || '26', 10) || 26;

if (command === '--help' || !command) {
  console.log('Backup Monitoring Script');
  console.log('');
  console.log('Usage: tsx scripts/backup-monitor.ts <command> [max-age-hours]');
  console.log('');
  console.log('Commands:');
  console.log(
    '  monitor         Check real Supabase backup status (alerts if stale)'
  );
  console.log('  test-restore    Print the manual restore-drill runbook');
  console.log('');
  console.log('Env: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF');
  process.exit(0);
}

switch (command) {
  case 'monitor':
    monitorBackups(maxBackupAgeHours).catch((err) => {
      console.error(
        `❌ Backup monitoring failed: ${err instanceof Error ? err.message : err}`
      );
      process.exit(1);
    });
    break;
  case 'test-restore':
  case 'test-restore-live':
    printRestoreRunbook();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
