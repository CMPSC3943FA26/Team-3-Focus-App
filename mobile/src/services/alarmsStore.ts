import { apiEnabled } from '../lib/api';
import * as local from './alarmsLocal';
import * as remote from './alarmsRemote';

const source = apiEnabled ? remote : local;

export const listAlarms = source.listAlarms;
export const getAlarm = source.getAlarm;
export const createAlarm = source.createAlarm;
export const updateAlarm = source.updateAlarm;
export const toggleAlarm = source.toggleAlarm;
export const deleteAlarm = source.deleteAlarm;
