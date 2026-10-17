import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { offsetsFor } from '../constants/reminders';
import { Alarm, DayCode } from '../types/alarm';

const CHANNEL_ID = 'reminders';
const IDS_KEY = 'timesight.notificationIds.v1';
const MAX_SCHEDULED = 60;
const DAY_INDEX: Record<DayCode, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

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

async function readIds(): Promise<Record<string, string[]>> {
  try {
    const raw = await AsyncStorage.getItem(IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeIds(map: Record<string, string[]>): Promise<void> {
  await AsyncStorage.setItem(IDS_KEY, JSON.stringify(map));
}

function reminderBody(minutes: number): string {
  if (minutes === 0) return 'Time to go';
  if (minutes < 60) return `In ${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = minutes / 60;
  const text = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `In ${text} hour${hours === 1 ? '' : 's'}`;
}

function isAlarmReminder(request: Notifications.NotificationRequest): boolean {
  return typeof request.content.data?.alarmId === 'number';
}

async function scheduleWithin(alarm: Alarm, budget: number): Promise<string[]> {
  if (!alarm.is_active || budget <= 0) return [];
  const eventAt = nextOccurrence(alarm).getTime();
  const now = Date.now();
  const ids: string[] = [];
  for (const minutes of offsetsFor(alarm)) {
    if (ids.length >= budget) break;
    const fireAt = eventAt - minutes * 60_000;
    if (fireAt <= now + 5_000) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: alarm.label,
        body: reminderBody(minutes),
        sound: 'default',
        data: { alarmId: alarm.id, minutesBefore: minutes },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fireAt),
        channelId: CHANNEL_ID,
      },
    });
    ids.push(id);
  }
  return ids;
}

export async function cancelAlarmReminders(alarmId: number): Promise<void> {
  const map = await readIds();
  const ids = map[String(alarmId)] ?? [];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  delete map[String(alarmId)];
  await writeIds(map);
}

export async function scheduleAlarmReminders(alarm: Alarm): Promise<number> {
  await initNotifications();
  await cancelAlarmReminders(alarm.id);
  if (!alarm.is_active || !(await notificationsAllowed())) return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ids = await scheduleWithin(alarm, MAX_SCHEDULED - scheduled.length);
  const map = await readIds();
  map[String(alarm.id)] = ids;
  await writeIds(map);
  return ids.length;
}

export async function rescheduleAllReminders(alarms: Alarm[]): Promise<void> {
  await initNotifications();
  if (!(await notificationsAllowed())) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const alarmReminders = scheduled.filter(isAlarmReminder);
  await Promise.all(
    alarmReminders.map((request) =>
      Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => undefined),
    ),
  );
  let remaining = MAX_SCHEDULED - (scheduled.length - alarmReminders.length);
  const upcoming = alarms
    .filter((alarm) => alarm.is_active)
    .map((alarm) => ({ alarm, at: nextOccurrence(alarm).getTime() }))
    .sort((a, b) => a.at - b.at);
  const map: Record<string, string[]> = {};
  for (const { alarm } of upcoming) {
    if (remaining <= 0) break;
    const ids = await scheduleWithin(alarm, remaining);
    map[String(alarm.id)] = ids;
    remaining -= ids.length;
  }
  await writeIds(map);
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
