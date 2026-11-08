import { Task, TaskInput } from '../types/task';
import * as goalsStore from './goalsStore';
import { askNotificationPermission } from './notifications';
import { syncReminders } from './reminders';
import * as store from './tasksStore';

export const listTasks = store.listTasks;
export const getTask = store.getTask;

async function syncGoal(goalId: number | null): Promise<void> {
  if (goalId === null) return;
  const goal = await goalsStore.getGoal(goalId);
  if (!goal) return;
  const tasks = (await store.listTasks()).filter((task) => task.goal_id === goalId);
  const finished = tasks.length > 0 && tasks.every((task) => task.is_completed);
  if (finished !== goal.is_completed) await goalsStore.updateGoal(goalId, { is_completed: finished });
}

async function afterSave(task: Task | null, previousGoalId: number | null): Promise<void> {
  if (task?.due_date) await askNotificationPermission().catch(() => false);
  await syncReminders();
  await syncGoal(previousGoalId);
  if (task && task.goal_id !== previousGoalId) await syncGoal(task.goal_id);
}

export async function createTask(input: TaskInput): Promise<Task> {
  const task = await store.createTask(input);
  await afterSave(task, task.goal_id);
  return task;
}

export async function updateTask(id: number, patch: Partial<TaskInput>): Promise<Task | null> {
  const before = await store.getTask(id);
  const task = await store.updateTask(id, patch);
  await afterSave(task, before?.goal_id ?? null);
  return task;
}

export async function toggleTask(id: number): Promise<Task | null> {
  const existing = await store.getTask(id);
  if (!existing) return null;
  return updateTask(id, { is_completed: !existing.is_completed });
}

export async function deleteTask(id: number): Promise<void> {
  const before = await store.getTask(id);
  await store.deleteTask(id);
  await syncReminders();
  await syncGoal(before?.goal_id ?? null);
}
