import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { Alarm, DayCode } from '../types/alarm';

const CHANNEL_ID = 'reminders';
const ALARM_CATEGORY = 'alarm';
export const SNOOZE_ACTION = 'snooze';
const MAX_SCHEDULED = 60;
const DAY_INDEX: Record<DayCode, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export interface PlannedReminder {
  fireAt: number;
  title: string;
  body: string;
  data: Record<string, number>;
}

let initialized = false;

export async function initNotifications(): Promise<void> {
  if (initialized) return;
  initialized = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  // opens the app on tap, if false a killed app never hear the snooze press
  await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY, [
    { identifier: SNOOZE_ACTION, buttonTitle: 'Snooze', options: { opensAppToForeground: true } },
  ]).catch(() => undefined);
}

export async function notificationsAllowed(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

export async function askNotificationPermission(): Promise<boolean> {
  await initNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

export async function openNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

export function nextOccurrence(alarm: Pick<Alarm, 'time' | 'repeat_days'>, from: Date = new Date()): Date {
  const [hours, minutes] = alarm.time.split(':').map(Number);
  const allowed = alarm.repeat_days.length ? new Set(alarm.repeat_days.map((day) => DAY_INDEX[day])) : null;
  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidate = new Date(from.getFullYear(), from.getMonth(), from.getDate() + dayOffset, hours, minutes, 0, 0);
    if (candidate.getTime() <= from.getTime()) continue;
    if (allowed && !allowed.has(candidate.getDay())) continue;
    return candidate;
  }
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1, hours, minutes, 0, 0);
}

function isAppReminder(request: Notifications.NotificationRequest): boolean {
  const data = request.content.data;
  return typeof data?.alarmId === 'number' || typeof data?.eventId === 'number';
}

export async function applyReminderPlan(plan: PlannedReminder[]): Promise<number> {
  await initNotifications();
  if (!(await notificationsAllowed())) return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter(isAppReminder);
  await Promise.all(
    ours.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => undefined)),
  );
  const budget = Math.max(0, MAX_SCHEDULED - (scheduled.length - ours.length));
  const chosen = plan.slice(0, budget);
  for (const item of chosen) {
    // only the alarm itself gets snooze, early nudges dont need it
    const snoozable = typeof item.data.alarmId === 'number' && item.data.minutesBefore === 0;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: item.body,
        sound: 'default',
        data: item.data,
        categoryIdentifier: snoozable ? ALARM_CATEGORY : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(item.fireAt),
        channelId: CHANNEL_ID,
      },
    });
  }
  return chosen.length;
}

// snoozedAlarmId not alarmId, so applyReminderPlan dont cancel it on next sync
export async function scheduleSnooze(alarmId: number, title: string, body: string, minutes: number): Promise<void> {
  await initNotifications();
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: { snoozedAlarmId: alarmId, snoozeMinutes: minutes },
      categoryIdentifier: ALARM_CATEGORY,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutes * 60,
      channelId: CHANNEL_ID,
    },
  });
}

export async function dismissNotification(identifier: string): Promise<void> {
  await Notifications.dismissNotificationAsync(identifier).catch(() => undefined);
}

export async function cancelSnoozes(alarmId: number): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const snoozes = scheduled.filter((request) => request.content.data?.snoozedAlarmId === alarmId);
  await Promise.all(
    snoozes.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => undefined)),
  );
}

export async function scheduleTestSequence(): Promise<string[]> {
  if (!(await askNotificationPermission())) return [];
  const ids: string[] = [];
  for (const seconds of [60, 120, 180]) {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: 'Test reminder', body: `${seconds / 60} min after scheduling`, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: CHANNEL_ID },
    });
    ids.push(id);
  }
  return ids;
}

export async function cancelTestSequence(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
}

export async function scheduledCount(): Promise<number> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.length;
}
