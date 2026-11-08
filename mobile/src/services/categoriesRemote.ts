import { api, isNotFound, withUtcStamps } from '../lib/api';
import { Category, CategoryInput } from '../types/category';

function byName(a: Category, b: Category): number {
  return a.name.localeCompare(b.name) || a.id - b.id;
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/categories');
  return data.map(withUtcStamps).sort(byName);
}

export async function getCategory(id: number): Promise<Category | null> {
  try {
    const { data } = await api.get<Category>(`/categories/${id}`);
    return withUtcStamps(data);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data } = await api.post<Category>('/categories', input);
  return withUtcStamps(data);
}

export async function updateCategory(id: number, patch: Partial<CategoryInput>): Promise<Category | null> {
  try {
    const { data } = await api.patch<Category>(`/categories/${id}`, patch);
    return withUtcStamps(data);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function deleteCategory(id: number): Promise<void> {
  try {
    await api.delete(`/categories/${id}`);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}
