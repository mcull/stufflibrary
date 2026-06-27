import { describe, it, expect } from 'vitest';

import { evaluateBackupHealth } from '../backup-monitor';

const NOW = Date.parse('2026-06-27T12:00:00Z');

describe('evaluateBackupHealth', () => {
  it('is healthy when the most recent backup is within the max age', () => {
    const h = evaluateBackupHealth(
      {
        pitr_enabled: false,
        backups: [
          { status: 'COMPLETED', inserted_at: '2026-06-26T13:00:00Z' }, // ~23h
          { status: 'COMPLETED', inserted_at: '2026-06-25T13:00:00Z' },
        ],
      },
      { maxBackupAgeHours: 26, now: NOW }
    );
    expect(h.healthy).toBe(true);
    expect(h.alerts).toEqual([]);
    expect(h.lastBackup?.toISOString()).toBe('2026-06-26T13:00:00.000Z');
    expect(h.pitrEnabled).toBe(false);
  });

  it('alerts when the most recent backup is older than the max age', () => {
    const h = evaluateBackupHealth(
      { backups: [{ inserted_at: '2026-06-24T12:00:00Z' }] }, // 72h
      { maxBackupAgeHours: 26, now: NOW }
    );
    expect(h.healthy).toBe(false);
    expect(h.alerts.join(' ')).toMatch(/old/i);
    expect(Math.round(h.ageHours!)).toBe(72);
  });

  it('alerts when there are no backups at all', () => {
    const h = evaluateBackupHealth(
      { backups: [] },
      { maxBackupAgeHours: 26, now: NOW }
    );
    expect(h.healthy).toBe(false);
    expect(h.lastBackup).toBeNull();
    expect(h.alerts.join(' ')).toMatch(/no backups/i);
  });

  it('reflects pitr_enabled from the API and ignores unparseable timestamps', () => {
    const h = evaluateBackupHealth(
      {
        pitr_enabled: true,
        backups: [
          { inserted_at: 'not-a-date' },
          { inserted_at: '2026-06-27T06:00:00Z' },
        ],
      },
      { maxBackupAgeHours: 26, now: NOW }
    );
    expect(h.pitrEnabled).toBe(true);
    expect(h.lastBackup?.toISOString()).toBe('2026-06-27T06:00:00.000Z');
    expect(h.healthy).toBe(true);
  });
});
