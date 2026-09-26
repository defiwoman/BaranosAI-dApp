import { CASE_IDS, type CaseId } from './types';
import { certificateEligibility, completedCases, type Progress } from './progress';

/**
 * Clearance replaces levels. It is derived from saved progress (never stored separately),
 * so it can't drift out of sync, and each tier unlocks console capabilities.
 */
export type Clearance = 'OBSERVER' | 'ANALYST' | 'VERIFIER' | 'CHALLENGER' | 'PROTOCOL ARCHITECT';

export const CLEARANCES: Clearance[] = ['OBSERVER', 'ANALYST', 'VERIFIER', 'CHALLENGER', 'PROTOCOL ARCHITECT'];

export interface ClearanceInfo {
  id: Clearance;
  /** What this tier can do, shown as capabilities (short, system-style). */
  capabilities: string[];
  /** Cases played at this tier. */
  cases: CaseId[];
}

export const CLEARANCE_INFO: Record<Clearance, ClearanceInfo> = {
  OBSERVER: { id: 'OBSERVER', capabilities: ['View AI output', 'View confidence', 'View basic evidence'], cases: ['01'] },
  ANALYST: { id: 'ANALYST', capabilities: ['Inspect model', 'Inspect inputs & evidence', 'Inspect rules'], cases: ['02'] },
  VERIFIER: { id: 'VERIFIER', capabilities: ['Replay inference', 'Compare original vs replay', 'Read settlement state'], cases: ['03', '04'] },
  CHALLENGER: { id: 'CHALLENGER', capabilities: ['Challenge a decision', 'Flag suspicious elements', 'Isolate mismatches'], cases: ['05', '06'] },
  'PROTOCOL ARCHITECT': {
    id: 'PROTOCOL ARCHITECT',
    capabilities: ['Design a verifiable AI system', 'Decide what gets committed', 'Name what can still go wrong'],
    cases: [],
  },
};

export type Capability = 'inspectModel' | 'inspectRules' | 'replay' | 'challenge' | 'design';

const CAPABILITY_TIER: Record<Capability, Clearance> = {
  inspectModel: 'ANALYST',
  inspectRules: 'ANALYST',
  replay: 'VERIFIER',
  challenge: 'CHALLENGER',
  design: 'PROTOCOL ARCHITECT',
};

/** The tier a case is played at: the tier whose case list contains it. */
export function tierForCase(id: CaseId): Clearance {
  return CLEARANCES.find((c) => CLEARANCE_INFO[c].cases.includes(id))!;
}

/**
 * Current clearance: the tier of the first unfinished case. After all six cases the learner
 * is Challenger with architect access pending; submitting a use case grants Protocol Architect.
 */
export function clearanceFor(progress: Progress): Clearance {
  if (progress.useCase.submission && certificateEligibility(progress).eligible) return 'PROTOCOL ARCHITECT';
  const done = new Set(completedCases(progress));
  const next = CASE_IDS.find((id) => !done.has(id));
  return next ? tierForCase(next) : 'CHALLENGER';
}

/** True once all six cases are done: the architect studio is open. */
export function architectAccess(progress: Progress): boolean {
  return completedCases(progress).length === CASE_IDS.length;
}

export function hasCapability(clearance: Clearance, capability: Capability): boolean {
  return CLEARANCES.indexOf(clearance) >= CLEARANCES.indexOf(CAPABILITY_TIER[capability]);
}

/** A case may use the capabilities of its own tier, even when replayed later with more access. */
export function effectiveClearance(current: Clearance, caseId: CaseId): Clearance {
  const tier = tierForCase(caseId);
  return CLEARANCES.indexOf(current) >= CLEARANCES.indexOf(tier) ? current : tier;
}

/** Progress within the whole ladder, 0–1, for the header bar. */
export function clearanceProgress(progress: Progress): number {
  const steps = CASE_IDS.length + 1; // six cases + the architect submission
  const done = completedCases(progress).length + (progress.useCase.submission ? 1 : 0);
  return Math.min(1, done / steps);
}

/** The clearance change caused by completing a case, if any. */
export function upgradeAfter(caseId: CaseId): { from: Clearance; to: Clearance } | null {
  const index = CASE_IDS.indexOf(caseId);
  const next = CASE_IDS[index + 1];
  const from = tierForCase(caseId);
  if (!next) return { from, to: 'PROTOCOL ARCHITECT' };
  const to = tierForCase(next);
  return from === to ? null : { from, to };
}
