import { asRecord, createCollection } from '../lib/localCollection';
import { Goal, GoalInput, URGENCY_LEVELS } from '../types/goal';
import { detachGoal } from './tasksLocal';

const collection = createCollection<Goal>('timesight.goals.v1', (raw) => {
  const value = asRecord(raw);
  if (!value || typeof value.id !== 'number' || typeof value.title !== 'string') return null;
  const now = new Date().toISOString();
  return {
    id: value.id,
    title: value.title,
    description: typeof value.description === 'string' ? value.description : null,
    target_date: typeof value.target_date === 'string' ? value.target_date : null,
    urgency: URGENCY_LEVELS.includes(value.urgency as Goal['urgency']) ? (value.urgency as Goal['urgency']) : 'medium',
    is_completed: value.is_completed === true,
    created_at: typeof value.created_at === 'string' ? value.created_at : now,
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : now,
  };
});

function toInput(goal: Goal): GoalInput {
  return {
    title: goal.title,
    description: goal.description,
    target_date: goal.target_date,
    urgency: goal.urgency,
    is_completed: goal.is_completed,
  };
}

function normalize(input: GoalInput): GoalInput {
  return {
    ...input,
    title: input.title.trim() || 'Goal',
    description: input.description?.trim() || null,
    target_date: input.target_date || null,
  };
}

export async function listGoals(): Promise<Goal[]> {
  const goals = await collection.all();
  return goals.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
}

export function getGoal(id: number): Promise<Goal | null> {
  return collection.find(id);
}

export function createGoal(input: GoalInput): Promise<Goal> {
  return collection.insert((id, now) => ({ ...normalize(input), id, created_at: now, updated_at: now }));
}

export function updateGoal(id: number, patch: Partial<GoalInput>): Promise<Goal | null> {
  return collection.update(id, (goal) => ({ ...goal, ...normalize({ ...toInput(goal), ...patch }) }));
}

export async function deleteGoal(id: number): Promise<void> {
  await collection.remove(id);
  await detachGoal(id);
}
