import { asRecord, createCollection } from '../lib/localCollection';
import { PRIORITIES, Task, TaskInput } from '../types/task';
import { detachTask } from './timeEntriesLocal';

const collection = createCollection<Task>('timesight.tasks.v1', (raw) => {
  const value = asRecord(raw);
  if (!value || typeof value.id !== 'number' || typeof value.title !== 'string') return null;
  const now = new Date().toISOString();
  return {
    id: value.id,
    title: value.title,
    goal_id: typeof value.goal_id === 'number' ? value.goal_id : null,
    category_id: typeof value.category_id === 'number' ? value.category_id : null,
    due_date: typeof value.due_date === 'string' ? value.due_date : null,
    is_completed: value.is_completed === true,
    is_locked: value.is_locked === true,
    scheduled_date: typeof value.scheduled_date === 'string' ? value.scheduled_date : null,
    estimated_minutes: typeof value.estimated_minutes === 'number' ? value.estimated_minutes : null,
    priority: PRIORITIES.includes(value.priority as Task['priority']) ? (value.priority as Task['priority']) : 'medium',
    created_at: typeof value.created_at === 'string' ? value.created_at : now,
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : now,
  };
});

function toInput(task: Task): TaskInput {
  return {
    title: task.title,
    goal_id: task.goal_id,
    category_id: task.category_id,
    due_date: task.due_date,
    is_completed: task.is_completed,
    is_locked: task.is_locked,
    scheduled_date: task.scheduled_date,
    estimated_minutes: task.estimated_minutes,
    priority: task.priority,
  };
}

function normalize(input: TaskInput): TaskInput {
  const estimate =
    input.estimated_minutes && input.estimated_minutes > 0
      ? Math.min(1440, Math.round(input.estimated_minutes))
      : null;
  return {
    ...input,
    title: input.title.trim() || 'Task',
    due_date: input.due_date || null,
    scheduled_date: input.scheduled_date || null,
    estimated_minutes: estimate,
  };
}

export async function listTasks(): Promise<Task[]> {
  const tasks = await collection.all();
  return tasks.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
}

export function getTask(id: number): Promise<Task | null> {
  return collection.find(id);
}

export function createTask(input: TaskInput): Promise<Task> {
  return collection.insert((id, now) => ({ ...normalize(input), id, created_at: now, updated_at: now }));
}

export function updateTask(id: number, patch: Partial<TaskInput>): Promise<Task | null> {
  return collection.update(id, (task) => ({ ...task, ...normalize({ ...toInput(task), ...patch }) }));
}

export async function deleteTask(id: number): Promise<void> {
  await collection.remove(id);
  await detachTask(id);
}

export function detachGoal(goalId: number): Promise<void> {
  return collection.updateWhere(
    (task) => task.goal_id === goalId,
    (task) => ({ ...task, goal_id: null }),
  );
}

export function detachCategory(categoryId: number): Promise<void> {
  return collection.updateWhere(
    (task) => task.category_id === categoryId,
    (task) => ({ ...task, category_id: null }),
  );
}
