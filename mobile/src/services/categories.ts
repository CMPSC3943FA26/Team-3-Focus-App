import { DEFAULT_EVENT_COLOR, EVENT_COLORS } from '../constants/events';
import { Category, CategoryInput } from '../types/category';
import * as store from './categoriesStore';
import { syncReminders } from './reminders';

export const listCategories = store.listCategories;
export const getCategory = store.getCategory;

export async function createCategory(input: CategoryInput): Promise<Category> {
  const category = await store.createCategory(input);
  await syncReminders();
  return category;
}

export async function updateCategory(id: number, patch: Partial<CategoryInput>): Promise<Category | null> {
  const category = await store.updateCategory(id, patch);
  await syncReminders();
  return category;
}

export async function deleteCategory(id: number): Promise<void> {
  await store.deleteCategory(id);
  await syncReminders();
}

const USUAL = ['Class', 'Homework', 'Study', 'Work'];

export async function addUsualCategories(): Promise<void> {
  const existing = new Set((await store.listCategories()).map((category) => category.name.toLowerCase()));
  for (const [index, name] of USUAL.entries()) {
    if (existing.has(name.toLowerCase())) continue;
    await store.createCategory({
      name,
      color: EVENT_COLORS[index] ?? DEFAULT_EVENT_COLOR,
      reminder_tier: null,
      custom_offsets: [],
    });
  }
}
