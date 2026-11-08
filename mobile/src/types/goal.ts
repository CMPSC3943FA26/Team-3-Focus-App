export type GoalUrgency = 'low' | 'medium' | 'high';

export const URGENCY_LEVELS: GoalUrgency[] = ['low', 'medium', 'high'];

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  target_date: string | null;
  urgency: GoalUrgency;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type GoalInput = Omit<Goal, 'id' | 'created_at' | 'updated_at'>;
