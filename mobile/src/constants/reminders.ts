import { Alarm, DayCode, FrequencyTier } from '../types/alarm';

export const TIER_ORDER: FrequencyTier[] = ['few', 'some', 'many', 'custom'];

export const TIER_LABELS: Record<FrequencyTier, string> = {
  few: 'Gentle',
  some: 'Steady',
  many: 'Intense',
  custom: 'Custom',
};

export const TIER_OFFSETS: Record<Exclude<FrequencyTier, 'custom'>, number[]> = {
  few: [10, 0],
  some: [30, 10, 0],
  many: [60, 30, 15, 10, 5, 0],
};

export const DAY_LABELS: Record<DayCode, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export function offsetsFor(alarm: Pick<Alarm, 'frequency_tier' | 'custom_offsets'>): number[] {
  return alarm.frequency_tier === 'custom'
    ? [...alarm.custom_offsets]
    : [...TIER_OFFSETS[alarm.frequency_tier]];
}

export function describeOffsets(offsets: number[]): string {
  if (!offsets.length) return 'No reminders';
  return offsets
    .map((minutes) => {
      if (minutes === 0) return 'on time';
      if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} hr before`;
      return `${minutes} min before`;
    })
    .join(', ');
}

export function parseOffsets(text: string): number[] | null {
  const parts = text.split(',').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  const values = parts.map((part) => (/^\d+$/.test(part) ? Number(part) : Number.NaN));
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 1440)) return null;
  return Array.from(new Set(values)).sort((a, b) => b - a);
}

export function formatDays(days: DayCode[]): string {
  if (!days.length) return 'One time';
  if (days.length === 7) return 'Every day';
  return days.map((day) => DAY_LABELS[day]).join(' ');
}
