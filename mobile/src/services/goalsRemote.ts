import { api, isNotFound, withUtcStamps } from '../lib/api';
import { Goal, GoalInput } from '../types/goal';

function byCreated(a: Goal, b: Goal): number {
  return a.created_at.localeCompare(b.created_at) || a.id - b.id;
}

export async function listGoals(): Promise<Goal[]> {
  const { data } = await api.get<Goal[]>('/goals');
  return data.map(withUtcStamps).sort(byCreated);
}

export async function getGoal(id: number): Promise<Goal | null> {
  try {
    const { data } = await api.get<Goal>(`/goals/${id}`);
    return withUtcStamps(data);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  const { data } = await api.post<Goal>('/goals', input);
  return withUtcStamps(data);
}

export async function updateGoal(id: number, patch: Partial<GoalInput>): Promise<Goal | null> {
  try {
    const { data } = await api.patch<Goal>(`/goals/${id}`, patch);
    return withUtcStamps(data);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function deleteGoal(id: number): Promise<void> {
  try {
    await api.delete(`/goals/${id}`);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}
