import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'timesight.pacePrefs.v1';

export const DEFAULT_DAILY_TARGET_MINUTES = 180;

export async function getDailyTarget(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const value = raw ? Number(JSON.parse(raw)?.daily_target_minutes) : Number.NaN;
    return Number.isInteger(value) && value >= 30 && value <= 720 ? value : DEFAULT_DAILY_TARGET_MINUTES;
  } catch {
    return DEFAULT_DAILY_TARGET_MINUTES;
  }
}

export async function saveDailyTarget(minutes: number): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({ daily_target_minutes: minutes }));
}
