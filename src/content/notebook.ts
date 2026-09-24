import type { CaseId } from '../domain/types';
import type { NotebookCategory, NotebookEntry } from './types';
import { CASE01_NOTEBOOK } from './case01';
import { CASE02 } from './case02';
import { CASE03 } from './case03';
import { CASE04 } from './case04';
import { CASE05 } from './case05';
import { CASE06 } from './case06';

export const NOTEBOOK_CATEGORIES: NotebookCategory[] = [
  'Model',
  'Evidence',
  'Execution rules',
  'Commitments',
  'Challenges',
  'Settlement',
  'Limitations',
];

const STAGED = [CASE02, CASE03, CASE04, CASE05, CASE06];

export const NOTEBOOK: NotebookEntry[] = [CASE01_NOTEBOOK, ...STAGED.flatMap((c) => c.notebook)];

export const CASE_NOTEBOOK_IDS = Object.fromEntries(
  (['01', '02', '03', '04', '05', '06'] as CaseId[]).map((id) => [id, NOTEBOOK.filter((e) => e.caseId === id).map((e) => e.id)]),
) as Record<CaseId, string[]>;
