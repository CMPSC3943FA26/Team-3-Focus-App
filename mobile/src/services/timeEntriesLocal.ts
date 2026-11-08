import { asRecord, createCollection } from '../lib/localCollection';
import { RuleError } from '../lib/rules';
import { TimeEntry, TimeEntryInput } from '../types/timeEntry';

const collection = createCollection<TimeEntry>('timesight.timeEntries.v1', (raw) => {
  const value = asRecord(raw);
  if (!value || typeof value.id !== 'number' || typeof value.started_at !== 'string') return null;
  const now = new Date().toISOString();
  return {
    id: value.id,
    task_id: typeof value.task_id === 'number' ? value.task_id : null,
    started_at: value.started_at,
    ended_at: typeof value.ended_at === 'string' ? value.ended_at : null,
    note: typeof value.note === 'string' ? value.note : null,
    created_at: typeof value.created_at === 'string' ? value.created_at : now,
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : now,
  };
});

function toInput(entry: TimeEntry): TimeEntryInput {
  return { task_id: entry.task_id, started_at: entry.started_at, ended_at: entry.ended_at, note: entry.note };
}

function normalize(input: TimeEntryInput): TimeEntryInput {
  return { ...input, note: input.note?.trim() || null };
}

async function checkRules(input: TimeEntryInput, selfId: number | null): Promise<void> {
  if (input.ended_at !== null && input.ended_at <= input.started_at) {
    throw new RuleError('ended_at must be after started_at');
  }
  if (input.ended_at === null) {
    const running = (await collection.all()).find((entry) => entry.ended_at === null && entry.id !== selfId);
    if (running) throw new RuleError('Another timer is already running');
  }
}

export async function listTimeEntries(): Promise<TimeEntry[]> {
  const entries = await collection.all();
  return entries.sort((a, b) => a.started_at.localeCompare(b.started_at) || a.id - b.id);
}

export async function listTimeEntriesOn(day: string): Promise<TimeEntry[]> {
  const start = `${day}T00:00:00`;
  const next = new Date(`${day}T00:00:00`);
  next.setDate(next.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const end = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T00:00:00`;
  const entries = await listTimeEntries();
  return entries.filter((entry) => entry.started_at < end && (entry.ended_at === null || entry.ended_at > start));
}

export async function getRunningEntry(): Promise<TimeEntry | null> {
  const entries = await collection.all();
  return entries.find((entry) => entry.ended_at === null) ?? null;
}

export async function createTimeEntry(input: TimeEntryInput): Promise<TimeEntry> {
  const clean = normalize(input);
  await checkRules(clean, null);
  return collection.insert((id, now) => ({ ...clean, id, created_at: now, updated_at: now }));
}

export async function updateTimeEntry(id: number, patch: Partial<TimeEntryInput>): Promise<TimeEntry | null> {
  const existing = await collection.find(id);
  if (!existing) return null;
  const clean = normalize({ ...toInput(existing), ...patch });
  await checkRules(clean, id);
  return collection.update(id, (entry) => ({ ...entry, ...clean }));
}

export function deleteTimeEntry(id: number): Promise<void> {
  return collection.remove(id);
}

export function detachTask(taskId: number): Promise<void> {
  return collection.updateWhere(
    (entry) => entry.task_id === taskId,
    (entry) => ({ ...entry, task_id: null }),
  );
}
