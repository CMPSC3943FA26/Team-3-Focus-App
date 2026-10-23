import { offsetsFor, TIER_OFFSETS } from '../constants/reminders';
import { parseLocal } from '../lib/dates';
import { Alarm } from '../types/alarm';
import { CalendarEvent } from '../types/event';
import * as alarmsStore from './alarmsStore';
import * as eventsStore from './eventsStore';
import { applyReminderPlan, nextOccurrence, PlannedReminder } from './notifications';
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
    const plan = planReminders(await alarmsStore.listAlarms(), await eventsStore.listEvents(), eventOffsets, now);
    await applyReminderPlan(plan);
  } catch (error) {
    console.warn('Could not sync reminders', error);
  }
}

let queue: Promise<void> = Promise.resolve();

export function syncReminders(): Promise<void> {
  // one sync at a time only, if two run together they schedule same reminder two time
  queue = queue.then(runSync);
  return queue;
}
