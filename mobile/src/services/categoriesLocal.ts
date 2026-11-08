import { DEFAULT_EVENT_COLOR } from '../constants/events';
import { asRecord, createCollection } from '../lib/localCollection';
import { RuleError } from '../lib/rules';
import { FrequencyTier } from '../types/alarm';
import { Category, CategoryInput } from '../types/category';
import { detachCategory } from './tasksLocal';

const TIERS: FrequencyTier[] = ['few', 'some', 'many', 'custom'];

const collection = createCollection<Category>('timesight.categories.v1', (raw) => {
  const value = asRecord(raw);
  if (!value || typeof value.id !== 'number' || typeof value.name !== 'string') return null;
  const now = new Date().toISOString();
  return {
    id: value.id,
    name: value.name,
    color: typeof value.color === 'string' ? value.color : DEFAULT_EVENT_COLOR,
    reminder_tier: TIERS.includes(value.reminder_tier as FrequencyTier) ? (value.reminder_tier as FrequencyTier) : null,
    custom_offsets: Array.isArray(value.custom_offsets)
      ? value.custom_offsets.filter((n): n is number => Number.isInteger(n))
      : [],
    created_at: typeof value.created_at === 'string' ? value.created_at : now,
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : now,
  };
});

function toInput(category: Category): CategoryInput {
  return {
    name: category.name,
    color: category.color,
    reminder_tier: category.reminder_tier,
    custom_offsets: category.custom_offsets,
  };
}

function normalize(input: CategoryInput): CategoryInput {
  const customOffsets =
    input.reminder_tier === 'custom'
      ? Array.from(new Set(input.custom_offsets.filter((n) => Number.isInteger(n) && n >= 0 && n <= 1440))).sort(
          (a, b) => b - a,
        )
      : [];
  return { ...input, name: input.name.trim() || 'Task type', color: input.color.toUpperCase(), custom_offsets: customOffsets };
}

async function checkRules(input: CategoryInput, selfId: number | null): Promise<void> {
  if (input.reminder_tier === 'custom' && !input.custom_offsets.length) {
    throw new RuleError('custom_offsets needs at least one value when reminder_tier is custom');
  }
  const taken = (await collection.all()).some(
    (item) => item.id !== selfId && item.name.toLowerCase() === input.name.toLowerCase(),
  );
  if (taken) throw new RuleError('A task type with that name already exists');
}

export async function listCategories(): Promise<Category[]> {
  const categories = await collection.all();
  return categories.sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
}

export function getCategory(id: number): Promise<Category | null> {
  return collection.find(id);
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const clean = normalize(input);
  await checkRules(clean, null);
  return collection.insert((id, now) => ({ ...clean, id, created_at: now, updated_at: now }));
}

export async function updateCategory(id: number, patch: Partial<CategoryInput>): Promise<Category | null> {
  const existing = await collection.find(id);
  if (!existing) return null;
  const clean = normalize({ ...toInput(existing), ...patch });
  await checkRules(clean, id);
  return collection.update(id, (category) => ({ ...category, ...clean }));
}

export async function deleteCategory(id: number): Promise<void> {
  await collection.remove(id);
  await detachCategory(id);
}
