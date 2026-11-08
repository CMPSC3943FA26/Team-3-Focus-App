import { api, isNotFound, withUtcStamps } from '../lib/api';
import { Task, TaskInput } from '../types/task';

function byCreated(a: Task, b: Task): number {
  return a.created_at.localeCompare(b.created_at) || a.id - b.id;
}

export async function listTasks(): Promise<Task[]> {
  const { data } = await api.get<Task[]>('/tasks');
  return data.map(withUtcStamps).sort(byCreated);
}

export async function getTask(id: number): Promise<Task | null> {
  try {
    const { data } = await api.get<Task>(`/tasks/${id}`);
    return withUtcStamps(data);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function createTask(input: TaskInput): Promise<Task> {
  const { data } = await api.post<Task>('/tasks', input);
  return withUtcStamps(data);
}

export async function updateTask(id: number, patch: Partial<TaskInput>): Promise<Task | null> {
  try {
    const { data } = await api.patch<Task>(`/tasks/${id}`, patch);
    return withUtcStamps(data);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function deleteTask(id: number): Promise<void> {
  try {
    await api.delete(`/tasks/${id}`);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}
