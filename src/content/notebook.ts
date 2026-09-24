import type { CaseId } from '../domain/types';
import type { NotebookCategory, NotebookEntry } from './types';
import { CASE01_NOTEBOOK } from './case01';

export const NOTEBOOK_CATEGORIES: NotebookCategory[] = [
  'Model',
  'Evidence',
  'Execution rules',
  'Commitments',
  'Challenges',
  'Settlement',
  'Limitations',
];

export const NOTEBOOK: NotebookEntry[] = [CASE01_NOTEBOOK];

export const CASE_NOTEBOOK_IDS: Record<CaseId, string[]> = {
  '01': ['execution-mismatch'],
  '02': [],
  '03': [],
  '04': [],
  '05': [],
  '06': [],
};
