export type AlarmSound = { file: string; label: string };

// to add a sound put the .wav in assets/sounds, add it here and to the expo-notifications sounds list in app.json
export const ALARM_SOUNDS: AlarmSound[] = [
  { file: 'gentle_reminder.wav', label: 'Gentle' },
  { file: 'reminder_nudge.wav', label: 'Nudge' },
  { file: 'important_reminder.wav', label: 'Important' },
  { file: 'spoken_reminder.wav', label: 'Spoken' },
];

export const DEFAULT_SOUND = 'default';

export function knownSound(file: string | null | undefined): string | null {
  if (!file) return null;
  return ALARM_SOUNDS.some((sound) => sound.file === file) ? file : null;
}
