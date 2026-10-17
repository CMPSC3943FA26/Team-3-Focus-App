export type FrequencyTier = 'few' | 'some' | 'many' | 'custom';

export type DayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const DAY_CODES: DayCode[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export interface Alarm {
  id: number;
  time: string;
  label: string;
  is_active: boolean;
  repeat_days: DayCode[];
  sound_file: string | null;
  snooze_duration: number;
  frequency_tier: FrequencyTier;
  custom_offsets: number[];
  event_id: number | null;
  created_at: string;
  updated_at: string;
}

export type AlarmInput = Omit<Alarm, 'id' | 'created_at' | 'updated_at'>;
