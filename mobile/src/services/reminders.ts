import type { NotificationResponse } from 'expo-notifications';

import { offsetsFor, TIER_OFFSETS } from '../constants/reminders';
import { parseLocal } from '../lib/dates';
import { Alarm } from '../types/alarm';
import { CalendarEvent } from '../types/event';
import * as alarmsStore from './alarmsStore';
import * as eventsStore from './eventsStore';
import {
  applyReminderPlan,
  dismissNotification,
  nextOccurrence,
  PlannedReminder,
  scheduleSnooze,
  SNOOZE_ACTION,
} from './notifications';
import { getQuietHours, insideQuietHours } from './quietHours';
import { getReminderPrefs } from './reminderPrefs';

const EVENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function spell(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = minutes / 60;
  const text = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${text} hour${hours === 1 ? '' : 's'}`;
}

function alarmBody(minutes: number): string {
  return minutes === 0 ? 'Time to go' : `In ${spell(minutes)}`;
}

function eventBody(minutes: number, travels: boolean): string {
  if (travels) return minutes === 0 ? 'Time to leave' : `Leave in ${spell(minutes)}`;
  return minutes === 0 ? 'Starting now' : `Starts in ${spell(minutes)}`;
}

export function leaveTime(event: CalendarEvent): Date {
  const start = parseLocal(event.start_time);
  return new Date(start.getTime() - (event.travel_minutes ?? 0) * 60_000);
}

export function planReminders(
  alarms: Alarm[],
  events: CalendarEvent[],
  eventOffsets: number[],
  now: Date = new Date(),
): PlannedReminder[] {
  const plans: PlannedReminder[] = [];
  for (const alarm of alarms) {
    if (!alarm.is_active) continue;
    const at = nextOccurrence(alarm, now).getTime();
    for (const minutes of offsetsFor(alarm)) {
      plans.push({
        fireAt: at - minutes * 60_000,
        title: alarm.label,
        body: alarmBody(minutes),
        data: { alarmId: alarm.id, minutesBefore: minutes },
      });
    }
  }
  const horizon = now.getTime() + EVENT_WINDOW_MS;
  for (const event of events) {
    const leave = leaveTime(event).getTime();
    if (leave <= now.getTime() || leave > horizon) continue;
    const travels = (event.travel_minutes ?? 0) > 0;
    for (const minutes of eventOffsets) {
      plans.push({
        fireAt: leave - minutes * 60_000,
        title: event.title,
        body: eventBody(minutes, travels),
        data: { eventId: event.id, minutesBefore: minutes },
      });
    }
  }
  // soonest first, ios keep only around 64 pending so later ones get drop when budget end
  return plans.filter((plan) => plan.fireAt > now.getTime() + 5_000).sort((a, b) => a.fireAt - b.fireAt);
}

async function runSync(): Promise<void> {
  try {
    const now = new Date();
    for (const alarm of await alarmsStore.listAlarms()) {
      const oneTime = alarm.is_active && alarm.repeat_days.length === 0;
      if (oneTime && nextOccurrence(alarm, new Date(alarm.updated_at)).getTime() <= now.getTime()) {
        await alarmsStore.updateAlarm(alarm.id, { is_active: false });
      }
    }
    const prefs = await getReminderPrefs();
    const eventOffsets =
      prefs.default_tier === 'custom' ? prefs.default_custom_offsets : TIER_OFFSETS[prefs.default_tier];
    const quiet = await getQuietHours();
    // minutesBefore 0 is the alarm or leave time itself, it always fires
    const planned = planReminders(await alarmsStore.listAlarms(), await eventsStore.listEvents(), eventOffsets, now);
    const plan = planned.filter(
      (reminder) => reminder.data.minutesBefore === 0 || !insideQuietHours(new Date(reminder.fireAt), quiet),
    );
    await applyReminderPlan(plan);
  } catch (error) {
    console.warn('Could not sync reminders', error);
  }
}

const handledResponses = new Set<string>();

export async function handleSnoozeResponse(response: NotificationResponse): Promise<void> {
  if (response.actionIdentifier !== SNOOZE_ACTION) return;
  const { identifier, content } = response.notification.request;
  // same press can come from listener and last response both, only snooze once
  if (handledResponses.has(identifier)) return;
  handledResponses.add(identifier);
  const data = content.data;
  const alarmId = typeof data?.alarmId === 'number' ? data.alarmId : data?.snoozedAlarmId;
  if (typeof alarmId !== 'number') return;
  try {
    const alarm = await alarmsStore.getAlarm(alarmId);
    if (!alarm) return;
    await scheduleSnooze(alarm.id, content.title ?? alarm.label, content.body ?? alarmBody(0), alarm.snooze_duration);
    await dismissNotification(identifier);
  } catch (error) {
    console.warn('Could not snooze alarm', error);
  }
}

let queue: Promise<void> = Promise.resolve();

export function syncReminders(): Promise<void> {
  // one sync at a time only, if two run together they schedule same reminder two time
  queue = queue.then(runSync);
  return queue;
}
