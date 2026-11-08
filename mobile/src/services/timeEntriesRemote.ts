import { api, isNotFound, withUtcStamps } from '../lib/api';
import { TimeEntry, TimeEntryInput } from '../types/timeEntry';

function byStart(a: TimeEntry, b: TimeEntry): number {
  return a.started_at.localeCompare(b.started_at) || a.id - b.id;
}

export async function listTimeEntries(): Promise<TimeEntry[]> {
  const { data } = await api.get<TimeEntry[]>('/time-entries');
  return data.map(withUtcStamps).sort(byStart);
}

export async function listTimeEntriesOn(day: string): Promise<TimeEntry[]> {
  const { data } = await api.get<TimeEntry[]>('/time-entries', { params: { date: day } });
  return data.map(withUtcStamps).sort(byStart);
}

export async function getRunningEntry(): Promise<TimeEntry | null> {
  const entries = await listTimeEntries();
  return entries.find((entry) => entry.ended_at === null) ?? null;
}

export async function createTimeEntry(input: TimeEntryInput): Promise<TimeEntry> {
  const { data } = await api.post<TimeEntry>('/time-entries', input);
  return withUtcStamps(data);
}

export async function updateTimeEntry(id: number, patch: Partial<TimeEntryInput>): Promise<TimeEntry | null> {
  try {
    const { data } = await api.patch<TimeEntry>(`/time-entries/${id}`, patch);
    return withUtcStamps(data);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function deleteTimeEntry(id: number): Promise<void> {
  try {
    await api.delete(`/time-entries/${id}`);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}
