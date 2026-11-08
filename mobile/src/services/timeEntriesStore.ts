import { apiEnabled } from '../lib/api';
import * as local from './timeEntriesLocal';
import * as remote from './timeEntriesRemote';

const source = apiEnabled ? remote : local;

export const listTimeEntries = source.listTimeEntries;
export const listTimeEntriesOn = source.listTimeEntriesOn;
export const getRunningEntry = source.getRunningEntry;
export const createTimeEntry = source.createTimeEntry;
export const updateTimeEntry = source.updateTimeEntry;
export const deleteTimeEntry = source.deleteTimeEntry;
