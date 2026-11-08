import { addDays, startOfDay } from 'date-fns';

import { TimeEntry } from '../types/timeEntry';
import { parseLocal } from './dates';

export const PACE_DAY_START_HOUR = 8;
export const PACE_DAY_END_HOUR = 22;

export type PaceStatus = 'done' | 'on_pace' | 'behind' | 'not_started';

export function minutesLoggedOn(entries: TimeEntry[], day: Date, now: Date = new Date()): number {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();
  let total = 0;
  for (const entry of entries) {
    const start = parseLocal(entry.started_at).getTime();
    const end = entry.ended_at ? parseLocal(entry.ended_at).getTime() : now.getTime();
    // cut each entry to this day, so a timer running past midnight count on both days
    const overlap = Math.min(end, dayEnd) - Math.max(start, dayStart);
    if (overlap > 0) total += overlap;
  }
  return Math.floor(total / 60_000);
}

export function paceFor(
  loggedMinutes: number,
  targetMinutes: number,
  now: Date = new Date(),
): { status: PaceStatus; expectedMinutes: number; progress: number } {
  const start = new Date(now);
  start.setHours(PACE_DAY_START_HOUR, 0, 0, 0);
  const end = new Date(now);
  end.setHours(PACE_DAY_END_HOUR, 0, 0, 0);
  const fraction = Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / (end.getTime() - start.getTime())));
  const expectedMinutes = Math.round(targetMinutes * fraction);
  const progress = targetMinutes > 0 ? Math.min(1, loggedMinutes / targetMinutes) : 0;
  if (loggedMinutes >= targetMinutes) return { status: 'done', expectedMinutes, progress };
  if (fraction === 0) return { status: 'not_started', expectedMinutes, progress };
  return { status: loggedMinutes >= expectedMinutes ? 'on_pace' : 'behind', expectedMinutes, progress };
}

export function minutesLeftToday(now: Date = new Date()): number {
  const end = new Date(now);
  end.setHours(PACE_DAY_END_HOUR, 0, 0, 0);
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60_000));
}

export const PACE_LABELS: Record<PaceStatus, string> = {
  done: 'Target hit',
  on_pace: 'On pace',
  behind: 'Behind',
  not_started: 'Day starts at 8 AM',
};

export const PACE_URGENCY: Record<PaceStatus, 'calm' | 'warning' | 'neutral'> = {
  done: 'calm',
  on_pace: 'calm',
  behind: 'warning',
  not_started: 'neutral',
};

export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe} min`;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}
