import { api, isNotFound, withUtcStamps } from '../lib/api';
import { CalendarEvent, EventInput } from '../types/event';

function byStart(a: CalendarEvent, b: CalendarEvent): number {
  return a.start_time.localeCompare(b.start_time) || a.id - b.id;
}

export async function listEvents(): Promise<CalendarEvent[]> {
  const { data } = await api.get<CalendarEvent[]>('/events');
  return data.map(withUtcStamps).sort(byStart);
}

export async function listEventsBetween(startIso: string, endIso: string): Promise<CalendarEvent[]> {
  // server filter by whole days, so we ask little wider and then cut exact here, same like local store do
  const { data } = await api.get<CalendarEvent[]>('/events', {
    params: { start: startIso.slice(0, 10), end: endIso.slice(0, 10) },
  });
  return data
    .map(withUtcStamps)
    .filter((event) => event.start_time < endIso && event.end_time > startIso)
    .sort(byStart);
}

export async function getEvent(id: number): Promise<CalendarEvent | null> {
  try {
    const { data } = await api.get<CalendarEvent>(`/events/${id}`);
    return withUtcStamps(data);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function createEvent(input: EventInput): Promise<CalendarEvent> {
  const { data } = await api.post<CalendarEvent>('/events', input);
  return withUtcStamps(data);
}

export async function updateEvent(id: number, patch: Partial<EventInput>): Promise<CalendarEvent | null> {
  try {
    const { data } = await api.patch<CalendarEvent>(`/events/${id}`, patch);
    return withUtcStamps(data);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function deleteEvent(id: number): Promise<void> {
  try {
    await api.delete(`/events/${id}`);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}
