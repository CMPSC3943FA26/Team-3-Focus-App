export type TaskPriority = 'low' | 'medium' | 'high';

export const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

export interface Task {
  id: number;
  title: string;
  goal_id: number | null;
  category_id: number | null;
  due_date: string | null;
  is_completed: boolean;
  is_locked: boolean;
  scheduled_date: string | null;
  estimated_minutes: number | null;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
}

export type TaskInput = Omit<Task, 'id' | 'created_at' | 'updated_at'>;
