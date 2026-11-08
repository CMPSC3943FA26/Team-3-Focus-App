import { apiEnabled } from '../lib/api';
import * as local from './tasksLocal';
import * as remote from './tasksRemote';

const source = apiEnabled ? remote : local;

export const listTasks = source.listTasks;
export const getTask = source.getTask;
export const createTask = source.createTask;
export const updateTask = source.updateTask;
export const deleteTask = source.deleteTask;
