export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  category_id: number | null;
  location: string | null;
  travel_minutes: number | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export type EventInput = Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>;
