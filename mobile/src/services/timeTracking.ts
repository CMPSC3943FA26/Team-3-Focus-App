import { dayKey, toLocalIso } from '../lib/dates';
import { minutesLeftToday } from '../lib/pace';
import { loggedMinutesByTask, tasksToPushBack } from '../lib/taskPlanning';
import { Task } from '../types/task';
import { TimeEntry } from '../types/timeEntry';
import { syncReminders } from './reminders';
import * as tasksStore from './tasksStore';
import * as store from './timeEntriesStore';

export const listTimeEntries = store.listTimeEntries;
export const listTimeEntriesOn = store.listTimeEntriesOn;
export const getRunningEntry = store.getRunningEntry;
export const createTimeEntry = store.createTimeEntry;
export const updateTimeEntry = store.updateTimeEntry;
export const deleteTimeEntry = store.deleteTimeEntry;

export interface ReplanOffer {
  task: Task | null;
  overMinutes: number;
  tasks: Task[];
}

async function endEntry(entry: TimeEntry): Promise<void> {
  const endedAt = toLocalIso(new Date());
  // stop inside same second it start, nothing to keep
  if (endedAt <= entry.started_at) await store.deleteTimeEntry(entry.id);
  else await store.updateTimeEntry(entry.id, { ended_at: endedAt });
}

export async function startTimer(taskId: number | null): Promise<TimeEntry> {
  const running = await store.getRunningEntry();
  if (running) await endEntry(running);
  return store.createTimeEntry({ task_id: taskId, started_at: toLocalIso(new Date()), ended_at: null, note: null });
}

export async function stopTimer(): Promise<ReplanOffer | null> {
  const running = await store.getRunningEntry();
  if (!running) return null;
  await endEntry(running);
  if (running.task_id === null) return null;
  const task = await tasksStore.getTask(running.task_id);
  if (!task?.estimated_minutes) return null;
  const now = new Date();
  const logged = loggedMinutesByTask(await store.listTimeEntries(), now);
  const overMinutes = (logged[task.id] ?? 0) - task.estimated_minutes;
  if (overMinutes <= 0) return null;
  const tasks = tasksToPushBack(await tasksStore.listTasks(), logged, dayKey(now), minutesLeftToday(now), null);
  return tasks.length ? { task, overMinutes, tasks } : null;
}

export async function replanToday(): Promise<Task[]> {
  const now = new Date();
  const running = await store.getRunningEntry();
  const logged = loggedMinutesByTask(await store.listTimeEntries(), now);
  return tasksToPushBack(
    await tasksStore.listTasks(),
    logged,
    dayKey(now),
    minutesLeftToday(now),
    running?.task_id ?? null,
  );
}

export async function moveTasks(
  tasks: Task[],
  day: string,
  includeLocked = false,
): Promise<{ moved: number; locked: number }> {
  let moved = 0;
  let locked = 0;
  for (const task of tasks) {
    if (task.is_locked && !includeLocked) {
      locked += 1;
      continue;
    }
    await tasksStore.updateTask(task.id, { scheduled_date: day });
    moved += 1;
  }
  await syncReminders();
  return { moved, locked };
}
