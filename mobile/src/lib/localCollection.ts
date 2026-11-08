import AsyncStorage from '@react-native-async-storage/async-storage';

type Row = { id: number; created_at: string; updated_at: string };
type State<T> = { nextId: number; items: T[] };

export function createCollection<T extends Row>(key: string, revive: (raw: unknown) => T | null) {
  let state: State<T> | null = null;

  async function load(): Promise<State<T>> {
    if (state) return state;
    try {
      const raw = await AsyncStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      const items: T[] = Array.isArray(parsed?.items)
        ? parsed.items.map(revive).filter((item: T | null): item is T => item !== null)
        : [];
      const highestId = items.reduce((max, item) => Math.max(max, item.id), 0);
      state = { nextId: Math.max(Number(parsed?.nextId) || 1, highestId + 1), items };
    } catch {
      state = { nextId: 1, items: [] };
    }
    return state;
  }

  async function persist(next: State<T>): Promise<void> {
    state = next;
    await AsyncStorage.setItem(key, JSON.stringify(next));
  }

  return {
    async all(): Promise<T[]> {
      return [...(await load()).items];
    },
    async find(id: number): Promise<T | null> {
      return (await load()).items.find((item) => item.id === id) ?? null;
    },
    async insert(build: (id: number, now: string) => T): Promise<T> {
      const current = await load();
      const item = build(current.nextId, new Date().toISOString());
      await persist({ nextId: current.nextId + 1, items: [...current.items, item] });
      return item;
    },
    async update(id: number, change: (item: T) => T): Promise<T | null> {
      const current = await load();
      const existing = current.items.find((item) => item.id === id);
      if (!existing) return null;
      const updated = { ...change(existing), updated_at: new Date().toISOString() };
      await persist({ ...current, items: current.items.map((item) => (item.id === id ? updated : item)) });
      return updated;
    },
    async updateWhere(match: (item: T) => boolean, change: (item: T) => T): Promise<void> {
      const current = await load();
      if (!current.items.some(match)) return;
      const now = new Date().toISOString();
      await persist({
        ...current,
        items: current.items.map((item) => (match(item) ? { ...change(item), updated_at: now } : item)),
      });
    },
    async remove(id: number): Promise<void> {
      const current = await load();
      await persist({ ...current, items: current.items.filter((item) => item.id !== id) });
    },
  };
}

export function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
}
