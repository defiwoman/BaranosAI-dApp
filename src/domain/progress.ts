import { CASE_IDS, isCaseId, type CaseId } from './types';

export const PROGRESS_VERSION = 1;

export interface CaseRecord {
  /** ISO timestamp of the first completion. Replays never change it. */
  completedAt: string;
  /** Decision points answered correctly on the first try during the first completion. */
  justified: number;
  decisions: number;
}

/** Where an unfinished case was left, so a refresh resumes at the same stage. */
export interface Checkpoint {
  stage: number;
  wrong: string[];
}

export interface Progress {
  version: typeof PROGRESS_VERSION;
  cases: Partial<Record<CaseId, CaseRecord>>;
  notebook: string[];
  achievements: string[];
  checkpoints: Partial<Record<CaseId, Checkpoint>>;
}

export type Rank = 'Observer' | 'Investigator' | 'Challenger';

export function emptyProgress(): Progress {
  return { version: PROGRESS_VERSION, cases: {}, notebook: [], achievements: [], checkpoints: {} };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isCaseRecord(value: unknown): value is CaseRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.completedAt === 'string' &&
    !Number.isNaN(Date.parse(r.completedAt)) &&
    Number.isInteger(r.justified) &&
    Number.isInteger(r.decisions) &&
    (r.justified as number) >= 0 &&
    (r.justified as number) <= (r.decisions as number)
  );
}

function isCheckpoint(value: unknown): value is Checkpoint {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return Number.isInteger(r.stage) && (r.stage as number) >= 0 && (r.stage as number) < 50 && isStringArray(r.wrong);
}

export type ParseResult = { ok: true; progress: Progress } | { ok: false; reason: 'empty' | 'malformed' | 'unsupported_version' };

/** Validates stored progress. Anything unexpected is rejected rather than partially trusted. */
export function parseProgress(raw: string | null): ParseResult {
  if (raw === null || raw === '') return { ok: false, reason: 'empty' };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof data !== 'object' || data === null) return { ok: false, reason: 'malformed' };
  const d = data as Record<string, unknown>;
  if (d.version !== PROGRESS_VERSION) {
    return { ok: false, reason: typeof d.version === 'number' ? 'unsupported_version' : 'malformed' };
  }
  if (typeof d.cases !== 'object' || d.cases === null || Array.isArray(d.cases)) return { ok: false, reason: 'malformed' };
  if (!isStringArray(d.notebook) || !isStringArray(d.achievements)) return { ok: false, reason: 'malformed' };

  const cases: Progress['cases'] = {};
  for (const [key, value] of Object.entries(d.cases as Record<string, unknown>)) {
    if (!isCaseId(key) || !isCaseRecord(value)) return { ok: false, reason: 'malformed' };
    cases[key] = { completedAt: value.completedAt, justified: value.justified, decisions: value.decisions };
  }
  // `checkpoints` was added after the first playable build; a missing field means none.
  const checkpoints: Progress['checkpoints'] = {};
  if (d.checkpoints !== undefined) {
    if (typeof d.checkpoints !== 'object' || d.checkpoints === null || Array.isArray(d.checkpoints)) {
      return { ok: false, reason: 'malformed' };
    }
    for (const [key, value] of Object.entries(d.checkpoints as Record<string, unknown>)) {
      if (!isCaseId(key) || !isCheckpoint(value)) return { ok: false, reason: 'malformed' };
      checkpoints[key] = { stage: value.stage, wrong: [...new Set(value.wrong)] };
    }
  }
  return {
    ok: true,
    progress: {
      version: PROGRESS_VERSION,
      cases,
      notebook: [...new Set(d.notebook)],
      achievements: [...new Set(d.achievements)],
      checkpoints,
    },
  };
}

export interface Completion {
  caseId: CaseId;
  decisions: number;
  wrongDecisions: number;
  notebook: string[];
  achievements: string[];
  at: Date;
}

/**
 * Records a case completion. Idempotent: replaying a case never duplicates
 * achievements or notebook entries and never overwrites the first record.
 */
export function recordCompletion(progress: Progress, c: Completion): Progress {
  const existing = progress.cases[c.caseId];
  const justified = Math.max(0, c.decisions - c.wrongDecisions);
  const checkpoints = { ...progress.checkpoints };
  delete checkpoints[c.caseId];
  return {
    ...progress,
    checkpoints,
    cases: existing
      ? progress.cases
      : { ...progress.cases, [c.caseId]: { completedAt: c.at.toISOString(), justified, decisions: c.decisions } },
    notebook: [...new Set([...progress.notebook, ...c.notebook])],
    achievements: [...new Set([...progress.achievements, ...c.achievements])],
  };
}

export function saveCheckpoint(progress: Progress, caseId: CaseId, checkpoint: Checkpoint | null): Progress {
  const checkpoints = { ...progress.checkpoints };
  if (checkpoint === null || checkpoint.stage === 0) delete checkpoints[caseId];
  else checkpoints[caseId] = { stage: checkpoint.stage, wrong: [...checkpoint.wrong] };
  return { ...progress, checkpoints };
}

export function completedCases(progress: Progress): CaseId[] {
  return CASE_IDS.filter((id) => progress.cases[id] !== undefined);
}

export function isCompleted(progress: Progress, id: CaseId): boolean {
  return progress.cases[id] !== undefined;
}

/** A case is unlocked when every earlier case is complete. */
export function isUnlocked(progress: Progress, id: CaseId): boolean {
  const index = CASE_IDS.indexOf(id);
  return CASE_IDS.slice(0, index).every((prev) => isCompleted(progress, prev));
}

export function nextCase(progress: Progress): CaseId | null {
  return CASE_IDS.find((id) => !isCompleted(progress, id)) ?? null;
}

export function rankFor(progress: Progress): Rank {
  const n = completedCases(progress).length;
  if (n >= CASE_IDS.length) return 'Challenger';
  if (n >= 2) return 'Investigator';
  return 'Observer';
}

export function justifiedTotals(progress: Progress): { justified: number; decisions: number } {
  return Object.values(progress.cases).reduce(
    (acc, r) => ({ justified: acc.justified + (r?.justified ?? 0), decisions: acc.decisions + (r?.decisions ?? 0) }),
    { justified: 0, decisions: 0 },
  );
}
