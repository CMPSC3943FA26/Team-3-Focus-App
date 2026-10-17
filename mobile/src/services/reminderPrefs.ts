import AsyncStorage from '@react-native-async-storage/async-storage';

import { FrequencyTier } from '../types/alarm';

const KEY = 'timesight.reminderPrefs.v1';
const TIERS: FrequencyTier[] = ['few', 'some', 'many', 'custom'];

export type ReminderPrefs = { default_tier: FrequencyTier; default_custom_offsets: number[] };

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = { default_tier: 'some', default_custom_offsets: [] };

export async function getReminderPrefs(): Promise<ReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_REMINDER_PREFS;
    const parsed = JSON.parse(raw);
    const tier: FrequencyTier = TIERS.includes(parsed?.default_tier) ? parsed.default_tier : 'some';
    const offsets: number[] = Array.isArray(parsed?.default_custom_offsets)
      ? parsed.default_custom_offsets.filter((n: unknown) => Number.isInteger(n))
      : [];
    if (tier === 'custom' && !offsets.length) return DEFAULT_REMINDER_PREFS;
    return { default_tier: tier, default_custom_offsets: tier === 'custom' ? offsets : [] };
  } catch {
    return DEFAULT_REMINDER_PREFS;
  }
}

export async function saveReminderPrefs(prefs: ReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
}
