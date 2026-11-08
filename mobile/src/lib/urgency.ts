import { differenceInCalendarDays, differenceInMinutes } from 'date-fns';

import type { ColorTokens } from '../../theme/tokens';

export type Urgency = 'calm' | 'warning' | 'urgent' | 'neutral';

export function minutesUrgency(minutesUntil: number): Urgency {
  if (minutesUntil <= 0) return 'urgent';
  return minutesUntil >= 30 ? 'calm' : 'warning';
}

export function dueUrgency(due: Date, now: Date = new Date()): Urgency {
  if (due.getTime() < now.getTime()) return 'urgent';
  return differenceInCalendarDays(due, now) <= 2 ? 'warning' : 'neutral';
}

export function describeUntil(target: Date, now: Date = new Date()): string {
  const minutes = differenceInMinutes(target, now);
  if (minutes <= 0) return 'now';
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 6) {
    const rest = minutes % 60;
    return rest ? `in ${hours} hr ${rest} min` : `in ${hours} hr`;
  }
  if (hours < 24) return `in ${hours} hr`;
  const days = differenceInCalendarDays(target, now);
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}

export function describeDue(due: Date, now: Date = new Date()): string {
  if (due.getTime() < now.getTime()) {
    const days = differenceInCalendarDays(now, due);
    if (days === 0) return 'Was due today';
    if (days === 1) return 'Was due yesterday';
    return `Was due ${days} days ago`;
  }
  const days = differenceInCalendarDays(due, now);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 14) return `${days} days left`;
  return `${Math.round(days / 7)} weeks left`;
}

export function urgencyColors(colors: ColorTokens, urgency: Urgency): { base: string; text: string } {
  switch (urgency) {
    case 'calm':
      return { base: colors.calm, text: colors.calmText };
    case 'warning':
      return { base: colors.warning, text: colors.warningText };
    case 'urgent':
      return { base: colors.urgent, text: colors.urgent };
    default:
      return { base: colors.textSecondary, text: colors.textSecondary };
  }
}
