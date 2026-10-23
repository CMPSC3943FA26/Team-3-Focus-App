import { CalendarEvent, EventInput } from '../types/event';
import * as store from './eventsStore';
import { askNotificationPermission } from './notifications';
import { leaveTime, syncReminders } from './reminders';

export const listEvents = store.listEvents;
export const listEventsBetween = store.listEventsBetween;
export const getEvent = store.getEvent;

async function afterSave(): Promise<void> {
  await askNotificationPermission().catch(() => false);
  await syncReminders();
}

export async function createEvent(input: EventInput): Promise<CalendarEvent> {
  const event = await store.createEvent(input);
  await afterSave();
  return event;
}

export async function updateEvent(id: number, patch: Partial<EventInput>): Promise<CalendarEvent | null> {
  const event = await store.updateEvent(id, patch);
  await afterSave();
  return event;
}

export async function deleteEvent(id: number): Promise<void> {
  await store.deleteEvent(id);
  await syncReminders();
}

export function nextDeparture(
  events: CalendarEvent[],
  now: Date = new Date(),
): { event: CalendarEvent; leaveAt: Date; travels: boolean } | null {
  const upcoming = events
    .map((event) => ({ event, leaveAt: leaveTime(event), travels: (event.travel_minutes ?? 0) > 0 }))
    .filter((item) => item.leaveAt.getTime() > now.getTime())
    .sort((a, b) => a.leaveAt.getTime() - b.leaveAt.getTime());
  return upcoming[0] ?? null;
}
