import AsyncStorage from '@react-native-async-storage/async-storage';

import { Alarm, AlarmInput, DAY_CODES, DayCode } from '../types/alarm';

const STORAGE_KEY = 'timesight.alarms.v2';
const LEGACY_KEYS: string[] = ['timesight.alarms'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

type StoreState = { nextId: number; alarms: Alarm[] };

let state: StoreState | null = null;

function isAlarm(value: unknown): value is Alarm {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.time === 'string' &&
    TIME_PATTERN.test(candidate.time) &&
    typeof candidate.label === 'string' &&
    typeof candidate.is_active === 'boolean' &&
    Array.isArray(candidate.repeat_days) &&
    candidate.repeat_days.every((day) => DAY_CODES.includes(day as DayCode)) &&
    typeof candidate.frequency_tier === 'string' &&
    Array.isArray(candidate.custom_offsets)
  );
}

function toInput(alarm: Alarm): AlarmInput {
  return {
    time: alarm.time,
    label: alarm.label,
    is_active: alarm.is_active,
    repeat_days: alarm.repeat_days,
    sound_file: alarm.sound_file,
    snooze_duration: alarm.snooze_duration,
    frequency_tier: alarm.frequency_tier,
    custom_offsets: alarm.custom_offsets,
    event_id: alarm.event_id,
  };
}

function normalize(input: AlarmInput): AlarmInput {
  const repeatDays = DAY_CODES.filter((day) => input.repeat_days.includes(day));
  const customOffsets =
    input.frequency_tier === 'custom'
      ? Array.from(
          new Set(input.custom_offsets.filter((n) => Number.isInteger(n) && n >= 0 && n <= 1440)),
        ).sort((a, b) => b - a)
      : [];
  return { ...input, label: input.label.trim() || 'Alarm', repeat_days: repeatDays, custom_offsets: customOffsets };
}

async function load(): Promise<StoreState> {
  if (state) return state;
  try {
    if (LEGACY_KEYS.length) await AsyncStorage.multiRemove(LEGACY_KEYS);
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const alarms: Alarm[] = Array.isArray(parsed?.alarms) ? parsed.alarms.filter(isAlarm) : [];
    const highestId = alarms.reduce((max, alarm) => Math.max(max, alarm.id), 0);
    state = { nextId: Math.max(Number(parsed?.nextId) || 1, highestId + 1), alarms };
  } catch {
    state = { nextId: 1, alarms: [] };
  }
  return state;
}

async function persist(next: StoreState): Promise<void> {
  state = next;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function listAlarms(): Promise<Alarm[]> {
  const { alarms } = await load();
  return [...alarms].sort((a, b) => a.time.localeCompare(b.time) || a.id - b.id);
}

export async function getAlarm(id: number): Promise<Alarm | null> {
  const { alarms } = await load();
  return alarms.find((alarm) => alarm.id === id) ?? null;
}

export async function createAlarm(input: AlarmInput): Promise<Alarm> {
  const current = await load();
  const now = new Date().toISOString();
  const alarm: Alarm = { ...normalize(input), id: current.nextId, created_at: now, updated_at: now };
  await persist({ nextId: current.nextId + 1, alarms: [...current.alarms, alarm] });
  return alarm;
}

export async function updateAlarm(id: number, patch: Partial<AlarmInput>): Promise<Alarm | null> {
  const current = await load();
  const existing = current.alarms.find((alarm) => alarm.id === id);
  if (!existing) return null;
  const updated: Alarm = {
    ...existing,
    ...normalize({ ...toInput(existing), ...patch }),
    updated_at: new Date().toISOString(),
  };
  await persist({ ...current, alarms: current.alarms.map((alarm) => (alarm.id === id ? updated : alarm)) });
  return updated;
}

export async function toggleAlarm(id: number): Promise<Alarm | null> {
  const existing = await getAlarm(id);
  if (!existing) return null;
  return updateAlarm(id, { is_active: !existing.is_active });
}

export async function deleteAlarm(id: number): Promise<void> {
  const current = await load();
  await persist({ ...current, alarms: current.alarms.filter((alarm) => alarm.id !== id) });
}
