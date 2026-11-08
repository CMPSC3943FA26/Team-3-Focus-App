import { Task } from '../types/task';
import { TimeEntry } from '../types/timeEntry';
import { dayKey, parseLocal } from './dates';

const PRIORITY_RANK: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 };

function dueValue(task: Task): number {
  return task.due_date ? parseLocal(task.due_date).getTime() : Number.MAX_SAFE_INTEGER;
}

export function loggedMinutesByTask(entries: TimeEntry[], now: Date = new Date()): Record<number, number> {
  const totals: Record<number, number> = {};
  for (const entry of entries) {
    if (entry.task_id === null) continue;
    const end = entry.ended_at ? parseLocal(entry.ended_at).getTime() : now.getTime();
    const minutes = Math.max(0, Math.floor((end - parseLocal(entry.started_at).getTime()) / 60_000));
    totals[entry.task_id] = (totals[entry.task_id] ?? 0) + minutes;
  }
  return totals;
}

export function suggestNextTask(tasks: Task[], now: Date = new Date()): Task | null {
  const today = dayKey(now);
  const nowMs = now.getTime();
  const candidates = tasks.filter(
    (task) => !task.is_completed && (!task.scheduled_date || task.scheduled_date <= today),
  );
  const rank = (task: Task) => [
    dueValue(task) < nowMs ? 0 : 1,
    dueValue(task),
    PRIORITY_RANK[task.priority] ?? 1,
    task.id,
  ];
  return (
    [...candidates].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      for (let i = 0; i < ra.length; i += 1) {
        if (ra[i] !== rb[i]) return ra[i] - rb[i];
      }
      return 0;
    })[0] ?? null
  );
}

export function tasksToPushBack(
  tasks: Task[],
  loggedByTask: Record<number, number>,
  today: string,
  minutesLeft: number,
  runningTaskId: number | null,
): Task[] {
  const open = tasks.filter((task) => !task.is_completed && task.scheduled_date === today);
  const remaining = (task: Task) => Math.max(0, (task.estimated_minutes ?? 0) - (loggedByTask[task.id] ?? 0));
  let needed = open.reduce((sum, task) => sum + remaining(task), 0);
  if (needed <= minutesLeft) return [];
  // least important go first, locked one and the running one never move
  const movable = open
    .filter((task) => !task.is_locked && task.id !== runningTaskId && remaining(task) > 0)
    .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || dueValue(b) - dueValue(a));
  const chosen: Task[] = [];
  for (const task of movable) {
    if (needed <= minutesLeft) break;
    chosen.push(task);
    needed -= remaining(task);
  }
  return chosen;
}

export function remainingMinutes(task: Task, loggedByTask: Record<number, number>): number {
  return Math.max(0, (task.estimated_minutes ?? 0) - (loggedByTask[task.id] ?? 0));
}

export function todaysTasks(tasks: Task[], now: Date = new Date()): Task[] {
  const today = dayKey(now);
  const shown = tasks.filter((task) => {
    if (task.scheduled_date === today) return true;
    if (task.is_completed) return false;
    return (
      (task.scheduled_date !== null && task.scheduled_date < today) ||
      (task.due_date !== null && task.due_date.slice(0, 10) < today)
    );
  });
  const order = (task: Task) => [
    task.is_completed ? 1 : 0,
    dueValue(task),
    PRIORITY_RANK[task.priority] ?? 1,
    task.id,
  ];
  return shown.sort((a, b) => {
    const ra = order(a);
    const rb = order(b);
    for (let i = 0; i < ra.length; i += 1) {
      if (ra[i] !== rb[i]) return ra[i] - rb[i];
    }
    return 0;
  });
}
