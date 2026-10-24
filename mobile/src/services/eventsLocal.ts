import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_EVENT_COLOR } from '../constants/events';
import { CalendarEvent, EventInput } from '../types/event';

const STORAGE_KEY = 'timesight.events.v1';
const LOCAL_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

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
  };
}

function normalize(input: EventInput): EventInput {
  const travel =
    input.travel_minutes && input.travel_minutes > 0 ? Math.min(600, Math.round(input.travel_minutes)) : null;
  return {
    ...input,
    title: input.title.trim() || 'Event',
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
    const events: CalendarEvent[] = Array.isArray(parsed?.events) ? parsed.events.filter(isEvent) : [];
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
