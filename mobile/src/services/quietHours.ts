import AsyncStorage from '@react-native-async-storage/async-storage';

import { DAY_CODES, type DayCode } from '../types/alarm';

const KEY = 'timesight.quietHours.v1';

export type QuietHours = {
  enabled: boolean;
  start: string;
  end: string;
  days: DayCode[];
};

export const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: false,
  start: '22:00',
  end: '07:00',
  days: [],
};

function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function getQuietHours(): Promise<QuietHours> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_QUIET_HOURS;
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed?.enabled === true,
      start: validTime(parsed?.start) ? parsed.start : DEFAULT_QUIET_HOURS.start,
      end: validTime(parsed?.end) ? parsed.end : DEFAULT_QUIET_HOURS.end,
      days: Array.isArray(parsed?.days)
        ? parsed.days.filter((day: unknown): day is DayCode => DAY_CODES.includes(day as DayCode))
        : [],
    };
  } catch {
    return DEFAULT_QUIET_HOURS;
  }
}

export async function saveQuietHours(value: QuietHours): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(value));
}
