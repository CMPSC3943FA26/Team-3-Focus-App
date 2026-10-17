import { Alarm, AlarmInput } from '../types/alarm';
import * as store from './alarmsStore';
import {
  askNotificationPermission,
  cancelAlarmReminders,
  nextOccurrence,
  rescheduleAllReminders,
  scheduleAlarmReminders,
} from './notifications';

async function schedule(alarm: Alarm): Promise<void> {
  try {
    await askNotificationPermission();
    await scheduleAlarmReminders(alarm);
  } catch (error) {
    console.warn('Could not schedule reminders', error);
  }
}

export const listAlarms = store.listAlarms;
export const getAlarm = store.getAlarm;

export async function createAlarm(input: AlarmInput): Promise<Alarm> {
  const alarm = await store.createAlarm(input);
  await schedule(alarm);
  return alarm;
}

export async function updateAlarm(id: number, patch: Partial<AlarmInput>): Promise<Alarm | null> {
  const alarm = await store.updateAlarm(id, patch);
  if (alarm) await schedule(alarm);
  return alarm;
}

export async function toggleAlarm(id: number): Promise<Alarm | null> {
  const alarm = await store.toggleAlarm(id);
  if (!alarm) return null;
  if (alarm.is_active) await schedule(alarm);
  else await cancelAlarmReminders(alarm.id).catch(() => undefined);
  return alarm;
}

export async function deleteAlarm(id: number): Promise<void> {
  await cancelAlarmReminders(id).catch(() => undefined);
  await store.deleteAlarm(id);
}

export async function syncReminders(): Promise<void> {
  try {
    const now = Date.now();
    for (const alarm of await store.listAlarms()) {
      const isOneTime = alarm.is_active && alarm.repeat_days.length === 0;
      if (isOneTime && nextOccurrence(alarm, new Date(alarm.updated_at)).getTime() <= now) {
        await store.updateAlarm(alarm.id, { is_active: false });
      }
    }
    await rescheduleAllReminders(await store.listAlarms());
  } catch (error) {
    console.warn('Could not sync reminders', error);
  }
}

export function nextAlarm(alarms: Alarm[]): { alarm: Alarm; at: Date } | null {
  const upcoming = alarms
    .filter((alarm) => alarm.is_active)
    .map((alarm) => ({ alarm, at: nextOccurrence(alarm) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  return upcoming[0] ?? null;
}
