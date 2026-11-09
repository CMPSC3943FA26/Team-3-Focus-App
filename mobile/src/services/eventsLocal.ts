import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_EVENT_COLOR } from '../constants/events';
import { DAY_CODES, DayCode, FrequencyTier } from '../types/alarm';
import { CalendarEvent, EventInput } from '../types/event';

const STORAGE_KEY = 'timesight.events.v1';
const LOCAL_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const TIERS: FrequencyTier[] = ['few', 'some', 'many', 'custom'];

type StoreState = { nextId: number; events: CalendarEvent[] };

let state: StoreState | null = null;

function isEvent(value: unknown): value is CalendarEvent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.title === 'string' &&
    typeof candidate.start_time === 'string' &&
    LOCAL_ISO.test(candidate.start_time) &&
    typeof candidate.end_time === 'string' &&
    LOCAL_ISO.test(candidate.end_time)
  );
}

function fillDefaults(event: CalendarEvent): CalendarEvent {
  const value = event as Partial<CalendarEvent>;
  return {
    ...event,
    repeat_days: Array.isArray(value.repeat_days)
      ? value.repeat_days.filter((day) => DAY_CODES.includes(day as DayCode))
      : [],
    repeat_until: typeof value.repeat_until === 'string' ? value.repeat_until : null,
    reminders_enabled: value.reminders_enabled !== false,
    reminder_tier: TIERS.includes(value.reminder_tier as FrequencyTier) ? (value.reminder_tier as FrequencyTier) : null,
    custom_offsets: Array.isArray(value.custom_offsets)
      ? value.custom_offsets.filter((n) => Number.isInteger(n))
      : [],
  };
}

function toInput(event: CalendarEvent): EventInput {
  return {
    title: event.title,
    description: event.description,
    start_time: event.start_time,
    end_time: event.end_time,
    category_id: event.category_id,
    location: event.location,
    travel_minutes: event.travel_minutes,
    color: event.color,
    repeat_days: event.repeat_days,
    repeat_until: event.repeat_until,
    reminders_enabled: event.reminders_enabled,
    reminder_tier: event.reminder_tier,
    custom_offsets: event.custom_offsets,
  };
}

function normalize(input: EventInput): EventInput {
  const travel =
    input.travel_minutes && input.travel_minutes > 0 ? Math.min(600, Math.round(input.travel_minutes)) : null;
  const customOffsets =
    input.reminder_tier === 'custom'
      ? Array.from(new Set(input.custom_offsets.filter((n) => Number.isInteger(n) && n >= 0 && n <= 1440))).sort(
          (a, b) => b - a,
        )
      : [];
  return {
    ...input,
    title: input.title.trim() || 'Event',
    repeat_days: DAY_CODES.filter((day) => input.repeat_days.includes(day)),
    repeat_until: input.repeat_days.length ? input.repeat_until || null : null,
    custom_offsets: customOffsets,
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    travel_minutes: travel,
    color: input.color || DEFAULT_EVENT_COLOR,
  };
}

async function load(): Promise<StoreState> {
  if (state) return state;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const events: CalendarEvent[] = Array.isArray(parsed?.events) ? parsed.events.filter(isEvent).map(fillDefaults) : [];
    const highestId = events.reduce((max, event) => Math.max(max, event.id), 0);
    state = { nextId: Math.max(Number(parsed?.nextId) || 1, highestId + 1), events };
  } catch {
    state = { nextId: 1, events: [] };
  }
  return state;
}

async function persist(next: StoreState): Promise<void> {
  state = next;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function listEvents(): Promise<CalendarEvent[]> {
  const { events } = await load();
  return [...events].sort((a, b) => a.start_time.localeCompare(b.start_time) || a.id - b.id);
}

export async function listEventsBetween(startIso: string, endIso: string): Promise<CalendarEvent[]> {
  const events = await listEvents();
  return events.filter((event) => event.start_time < endIso && event.end_time > startIso);
}

export async function getEvent(id: number): Promise<CalendarEvent | null> {
  const { events } = await load();
  return events.find((event) => event.id === id) ?? null;
}

export async function createEvent(input: EventInput): Promise<CalendarEvent> {
  const current = await load();
  const now = new Date().toISOString();
  const event: CalendarEvent = { ...normalize(input), id: current.nextId, created_at: now, updated_at: now };
  await persist({ nextId: current.nextId + 1, events: [...current.events, event] });
  return event;
}

export async function updateEvent(id: number, patch: Partial<EventInput>): Promise<CalendarEvent | null> {
  const current = await load();
  const existing = current.events.find((event) => event.id === id);
  if (!existing) return null;
  const updated: CalendarEvent = {
    ...existing,
    ...normalize({ ...toInput(existing), ...patch }),
    updated_at: new Date().toISOString(),
  };
  await persist({ ...current, events: current.events.map((event) => (event.id === id ? updated : event)) });
  return updated;
}

export async function deleteEvent(id: number): Promise<void> {
  const current = await load();
  await persist({ ...current, events: current.events.filter((event) => event.id !== id) });
}
