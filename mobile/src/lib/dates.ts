import { addDays, differenceInMinutes, format, parseISO, startOfDay, startOfWeek } from 'date-fns';

export { addDays, startOfDay };

export function toLocalIso(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

export function parseLocal(value: string): Date {
  return parseISO(value);
}

export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatClock(date: Date): string {
  return format(date, 'h:mm a');
}

// "22:00" -> "10:00 PM". Alarm and quiet hours times are stored as HH:MM.
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return formatClock(date);
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function describeWait(target: Date, now: Date = new Date()): string {
  const minutes = Math.max(0, differenceInMinutes(target, now));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}
