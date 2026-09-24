import type { CaseSummary } from '../content/types';
import { isCompleted, isUnlocked, type Progress } from '../domain/progress';
import { CASE_COMPONENTS } from '../cases/registry';

export type CaseAvailability = 'complete' | 'available' | 'locked' | 'preview';

export function availability(progress: Progress, c: CaseSummary): CaseAvailability {
  if (isCompleted(progress, c.id)) return 'complete';
  if (!c.playable || !CASE_COMPONENTS[c.id]) return 'preview';
  return isUnlocked(progress, c.id) ? 'available' : 'locked';
}

export const AVAILABILITY_LABEL: Record<CaseAvailability, string> = {
  complete: '✓ Complete',
  available: '→ Open',
  locked: '🔒 Complete earlier cases',
  preview: 'Preview · in development',
};
