import { FrequencyTier } from './alarm';

export interface Category {
  id: number;
  name: string;
  color: string;
  reminder_tier: FrequencyTier | null;
  custom_offsets: number[];
  created_at: string;
  updated_at: string;
}

export type CategoryInput = Omit<Category, 'id' | 'created_at' | 'updated_at'>;
