import { apiEnabled } from '../lib/api';
import * as local from './eventsLocal';
import * as remote from './eventsRemote';

const source = apiEnabled ? remote : local;

export const listEvents = source.listEvents;
export const listEventsBetween = source.listEventsBetween;
export const getEvent = source.getEvent;
export const createEvent = source.createEvent;
export const updateEvent = source.updateEvent;
export const deleteEvent = source.deleteEvent;
