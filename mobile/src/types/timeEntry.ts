export interface TimeEntry {
  id: number;
  task_id: number | null;
  started_at: string;
  ended_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type TimeEntryInput = Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>;
