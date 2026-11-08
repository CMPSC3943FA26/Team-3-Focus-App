import { apiEnabled } from '../lib/api';
import * as local from './goalsLocal';
import * as remote from './goalsRemote';

const source = apiEnabled ? remote : local;

export const listGoals = source.listGoals;
export const getGoal = source.getGoal;
export const createGoal = source.createGoal;
export const updateGoal = source.updateGoal;
export const deleteGoal = source.deleteGoal;
