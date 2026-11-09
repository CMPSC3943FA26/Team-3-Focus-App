import { addDays, startOfDay } from 'date-fns';

import { DayCode } from '../types/alarm';
import { CalendarEvent } from '../types/event';
import { dayKey, parseLocal } from './dates';

const DAY_INDEX: Record<DayCode, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const MAX_DAYS = 400;

export interface Occurrence {
  key: string;
  event: CalendarEvent;
  start: Date;
  end: Date;
}

export function expandOccurrences(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const baseStart = parseLocal(event.start_time);
  const baseEnd = parseLocal(event.end_time);
  const duration = baseEnd.getTime() - baseStart.getTime();
  const repeat = event.repeat_days ?? [];
  if (!repeat.length) {
    return baseStart < rangeEnd && baseEnd > rangeStart
      ? [{ key: String(event.id), event, start: baseStart, end: baseEnd }]
      : [];
  }
  const allowed = new Set(repeat.map((day) => DAY_INDEX[day]));
  const until = event.repeat_until ? addDays(startOfDay(parseLocal(event.repeat_until)), 1) : null;
  // start little before the range, so one that began yesterday and still going is not lost
  let day = startOfDay(new Date(Math.max(baseStart.getTime(), rangeStart.getTime() - duration)));
  const out: Occurrence[] = [];
  for (let i = 0; i < MAX_DAYS && day < rangeEnd; i += 1, day = addDays(day, 1)) {
    if (until && day >= until) break;
    if (!allowed.has(day.getDay())) continue;
    const start = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      baseStart.getHours(),
      baseStart.getMinutes(),
      baseStart.getSeconds(),
    );
    if (start < baseStart) continue;
    const end = new Date(start.getTime() + duration);
    if (start < rangeEnd && end > rangeStart) out.push({ key: `${event.id}:${dayKey(start)}`, event, start, end });
  }
  return out;
}

export function occurrencesBetween(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date): Occurrence[] {
  return events
    .flatMap((event) => expandOccurrences(event, rangeStart, rangeEnd))
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.event.id - b.event.id);
}
