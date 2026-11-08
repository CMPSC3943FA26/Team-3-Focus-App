import { apiEnabled } from '../lib/api';
import * as local from './categoriesLocal';
import * as remote from './categoriesRemote';

const source = apiEnabled ? remote : local;

export const listCategories = source.listCategories;
export const getCategory = source.getCategory;
export const createCategory = source.createCategory;
export const updateCategory = source.updateCategory;
export const deleteCategory = source.deleteCategory;
