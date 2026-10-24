import { api, isNotFound, withUtcStamps } from '../lib/api';
import { Alarm, AlarmInput } from '../types/alarm';

function byTime(a: Alarm, b: Alarm): number {
  return a.time.localeCompare(b.time) || a.id - b.id;
}

export async function listAlarms(): Promise<Alarm[]> {
  const { data } = await api.get<Alarm[]>('/alarms');
  return data.map(withUtcStamps).sort(byTime);
}

export async function getAlarm(id: number): Promise<Alarm | null> {
  try {
    const { data } = await api.get<Alarm>(`/alarms/${id}`);
    return withUtcStamps(data);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function createAlarm(input: AlarmInput): Promise<Alarm> {
  const { data } = await api.post<Alarm>('/alarms', input);
  return withUtcStamps(data);
}

export async function updateAlarm(id: number, patch: Partial<AlarmInput>): Promise<Alarm | null> {
  try {
    const { data } = await api.patch<Alarm>(`/alarms/${id}`, patch);
    return withUtcStamps(data);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function toggleAlarm(id: number): Promise<Alarm | null> {
  const existing = await getAlarm(id);
  if (!existing) return null;
  return updateAlarm(id, { is_active: !existing.is_active });
}

export async function deleteAlarm(id: number): Promise<void> {
  try {
    await api.delete(`/alarms/${id}`);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}
