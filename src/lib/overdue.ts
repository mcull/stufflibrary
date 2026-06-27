export interface OverdueCandidate {
  id: string;
  status: string;
  requestedReturnDate: Date | string;
  lastOverdueReminderAt: Date | string | null;
}
export type ReminderKind = 'DUE_TOMORROW' | 'OVERDUE';
export interface Reminder {
  id: string;
  kind: ReminderKind;
}

const DAY = 24 * 60 * 60 * 1000;

export function selectOverdueReminders(
  borrows: OverdueCandidate[],
  now: number
): Reminder[] {
  const out: Reminder[] = [];
  for (const b of borrows) {
    if (b.status !== 'ACTIVE') continue;
    const due = new Date(b.requestedReturnDate).getTime();
    const last = b.lastOverdueReminderAt
      ? new Date(b.lastOverdueReminderAt).getTime()
      : null;
    if (last !== null && now - last < DAY) continue; // throttle

    if (due < now) {
      out.push({ id: b.id, kind: 'OVERDUE' });
    } else if (due - now <= DAY) {
      out.push({ id: b.id, kind: 'DUE_TOMORROW' });
    }
  }
  return out;
}
