import type { ComponentType } from 'react';
import type { CaseId } from '../domain/types';
import type { CaseProps } from './types';
import { Case01 } from './Case01';

export const CASE_COMPONENTS: Partial<Record<CaseId, ComponentType<CaseProps>>> = {
  '01': Case01,
};

export const CASE_ACHIEVEMENTS: Record<CaseId, string> = {
  '01': 'Upheld a step challenge',
  '02': 'Recognised insufficient evidence',
  '03': 'Waited for settlement',
  '04': 'Separated execution from truth',
  '05': 'Kept evidence apart from policy',
  '06': 'Completed the final review',
};
