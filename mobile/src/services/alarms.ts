import { Alarm, AlarmInput } from '../types/alarm';
import * as store from './alarmsStore';
import { askNotificationPermission, nextOccurrence } from './notifications';
import { syncReminders } from './reminders';

export const listAlarms = store.listAlarms;
export const getAlarm = store.getAlarm;

async function afterSave(): Promise<void> {
  await askNotificationPermission().catch(() => false);
  await syncReminders();
}

export async function createAlarm(input: AlarmInput): Promise<Alarm> {
  const alarm = await store.createAlarm(input);
  await afterSave();
  return alarm;
}

export async function updateAlarm(id: number, patch: Partial<AlarmInput>): Promise<Alarm | null> {
  const alarm = await store.updateAlarm(id, patch);
  await afterSave();
  return alarm;
}

export async function toggleAlarm(id: number): Promise<Alarm | null> {
  const alarm = await store.toggleAlarm(id);
  if (alarm?.is_active) await afterSave();
  else await syncReminders();
  return alarm;
}

export async function deleteAlarm(id: number): Promise<void> {
  await store.deleteAlarm(id);
  await syncReminders();
}

export function nextAlarm(alarms: Alarm[]): { alarm: Alarm; at: Date } | null {
  const upcoming = alarms
    .filter((alarm) => alarm.is_active)
    .map((alarm) => ({ alarm, at: nextOccurrence(alarm) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  return upcoming[0] ?? null;
}
