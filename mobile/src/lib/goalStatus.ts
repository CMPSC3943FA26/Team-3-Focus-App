import { Goal } from '../types/goal';
import { Task } from '../types/task';
import { parseLocal } from './dates';
import type { Urgency } from './urgency';

export type GoalStatus = 'done' | 'on_pace' | 'behind' | 'overdue';

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  done: 'Done',
  on_pace: 'On pace',
  behind: 'Behind',
  overdue: 'Overdue',
};

export const GOAL_STATUS_URGENCY: Record<GoalStatus, Urgency> = {
  done: 'calm',
  on_pace: 'calm',
  behind: 'warning',
  overdue: 'urgent',
};

export function targetEnd(goal: Goal): Date | null {
  if (!goal.target_date) return null;
  const end = parseLocal(`${goal.target_date}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return end;
}

export function goalStatus(goal: Goal, tasks: Task[], now: Date = new Date()): GoalStatus {
  if (goal.is_completed) return 'done';
  const end = targetEnd(goal);
  if (!end) return 'on_pace';
  if (now.getTime() >= end.getTime()) return 'overdue';
  const created = new Date(goal.created_at).getTime();
  const span = end.getTime() - created;
  const timeShare = span > 0 ? Math.min(1, Math.max(0, (now.getTime() - created) / span)) : 1;
  const doneShare = tasks.length ? tasks.filter((task) => task.is_completed).length / tasks.length : 0;
  return timeShare > doneShare ? 'behind' : 'on_pace';
}

const URGENCY_RANK: Record<Goal['urgency'], number> = { high: 0, medium: 1, low: 2 };

export function byMostUrgent(a: Goal, b: Goal): number {
  const aEnd = targetEnd(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bEnd = targetEnd(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return aEnd - bEnd || URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.id - b.id;
}
