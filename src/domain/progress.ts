import { CASE_IDS, isCaseId, type CaseId } from './types';
import { REQUIRED_CHECKS, V1_COMPLETION_GRANTS } from './curriculum';
import { validateName, validateXHandle, type Profile } from './profile';

export const PROGRESS_VERSION = 2;

export interface CaseRecord {
  /** When the case first became complete under the current curriculum. */
  completedAt: string;
}

export interface Progress {
  version: typeof PROGRESS_VERSION;
  profile: Profile | null;
  /** Learning checks passed, see REQUIRED_CHECKS. */
  passedChecks: string[];
  cases: Partial<Record<CaseId, CaseRecord>>;
  /** Set once, when every case is first complete. Re-downloads reuse this date. */
  certificate: { completedAt: string } | null;
}

export type Rank = 'Observer' | 'Investigator' | 'Challenger';

export function emptyProgress(): Progress {
  return { version: PROGRESS_VERSION, profile: null, passedChecks: [], cases: {}, certificate: null };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isDate = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

export type ParseResult =
  | { ok: true; progress: Progress; migratedFrom?: number }
  | { ok: false; reason: 'empty' | 'malformed' | 'unsupported_version' };

/** Validates stored progress, migrating older versions. Anything unexpected is rejected, not partially trusted. */
export function parseProgress(raw: string | null): ParseResult {
  if (raw === null || raw === '') return { ok: false, reason: 'empty' };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!isObject(data)) return { ok: false, reason: 'malformed' };
  if (data.version === 1) {
    const migrated = migrateV1(data);
    return migrated ? { ok: true, progress: migrated, migratedFrom: 1 } : { ok: false, reason: 'malformed' };
  }
  if (data.version !== PROGRESS_VERSION) {
    return { ok: false, reason: typeof data.version === 'number' ? 'unsupported_version' : 'malformed' };
  }
  const progress = parseV2(data);
  return progress ? { ok: true, progress } : { ok: false, reason: 'malformed' };
}

function parseProfile(value: unknown): Profile | null | undefined {
  if (value === null) return null;
  if (!isObject(value) || typeof value.name !== 'string') return undefined;
  const name = validateName(value.name);
  if (!name.ok) return undefined;
  if (value.xHandle === undefined) return { name: name.value };
  if (typeof value.xHandle !== 'string') return undefined;
  const x = validateXHandle(value.xHandle);
  if (!x.ok) return undefined;
  return x.value ? { name: name.value, xHandle: x.value } : { name: name.value };
}

function parseV2(d: Record<string, unknown>): Progress | null {
  const profile = parseProfile(d.profile);
  if (profile === undefined || !isStringArray(d.passedChecks) || !isObject(d.cases)) return null;
  const cases: Progress['cases'] = {};
  for (const [key, value] of Object.entries(d.cases)) {
    if (!isCaseId(key) || !isObject(value) || !isDate(value.completedAt)) return null;
    cases[key] = { completedAt: value.completedAt };
  }
  let certificate: Progress['certificate'] = null;
  if (d.certificate !== null) {
    if (!isObject(d.certificate) || !isDate(d.certificate.completedAt)) return null;
    certificate = { completedAt: d.certificate.completedAt };
  }
  return normalise({ version: PROGRESS_VERSION, profile, passedChecks: [...new Set(d.passedChecks)], cases, certificate });
}

/**
 * v1 (the first release) recorded whole-case completions and had no profile.
 * Each completed case keeps its date and is granted the checks it demonstrated;
 * anything newly required is asked for on the next visit.
 */
function migrateV1(d: Record<string, unknown>): Progress | null {
  if (!isObject(d.cases)) return null;
  const passed = new Set<string>();
  const completedAt: Partial<Record<CaseId, string>> = {};
  for (const [key, value] of Object.entries(d.cases)) {
    if (!isCaseId(key) || !isObject(value) || !isDate(value.completedAt)) return null;
    V1_COMPLETION_GRANTS[key].forEach((c) => passed.add(c));
    completedAt[key] = value.completedAt;
  }
  const cases: Progress['cases'] = {};
  for (const id of CASE_IDS) {
    const at = completedAt[id];
    if (at && REQUIRED_CHECKS[id].every((c) => passed.has(c))) cases[id] = { completedAt: at };
  }
  return normalise({ version: PROGRESS_VERSION, profile: null, passedChecks: [...passed], cases, certificate: null });
}

/** Keeps derived fields consistent: complete cases have records, and a full set has a certificate date. */
function normalise(p: Progress, now?: Date): Progress {
  const cases = { ...p.cases };
  for (const id of CASE_IDS) {
    if (!cases[id] && checksComplete(p.passedChecks, id) && now) cases[id] = { completedAt: now.toISOString() };
  }
  let certificate = p.certificate;
  if (!certificate && CASE_IDS.every((id) => cases[id] && checksComplete(p.passedChecks, id))) {
    const latest = CASE_IDS.map((id) => cases[id]!.completedAt).sort().at(-1)!;
    certificate = { completedAt: now ? now.toISOString() : latest };
  }
  return { ...p, cases, certificate };
}

function checksComplete(passed: string[], id: CaseId): boolean {
  return REQUIRED_CHECKS[id].every((c) => passed.includes(c));
}

/** Records a passed check. Idempotent; repeating a case never changes existing dates. */
export function passCheck(progress: Progress, check: string, now: Date = new Date()): Progress {
  if (progress.passedChecks.includes(check)) return progress;
  return normalise({ ...progress, passedChecks: [...progress.passedChecks, check] }, now);
}

export function setProfile(progress: Progress, profile: Profile): Progress {
  return { ...progress, profile };
}

/** Clears learning progress. The profile is kept so the participant need not re-enter their name. */
export function resetProgress(progress: Progress): Progress {
  return { ...emptyProgress(), profile: progress.profile };
}

export function isCompleted(progress: Progress, id: CaseId): boolean {
  return progress.cases[id] !== undefined && checksComplete(progress.passedChecks, id);
}

export function missingChecks(progress: Progress, id: CaseId): string[] {
  return REQUIRED_CHECKS[id].filter((c) => !progress.passedChecks.includes(c));
}

export function completedCases(progress: Progress): CaseId[] {
  return CASE_IDS.filter((id) => isCompleted(progress, id));
}

/** A case is unlocked when every earlier case is complete. */
export function isUnlocked(progress: Progress, id: CaseId): boolean {
  return CASE_IDS.slice(0, CASE_IDS.indexOf(id)).every((prev) => isCompleted(progress, prev));
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

export type Eligibility =
  | { eligible: true; name: string; completedAt: string }
  | { eligible: false; remaining: CaseId[]; needsName: boolean };

/**
 * The single certificate rule, shared by the summary, the reward screen and every download:
 * all six cases complete under the current curriculum, plus a name for the certificate.
 */
export function certificateEligibility(progress: Progress): Eligibility {
  const remaining = CASE_IDS.filter((id) => !isCompleted(progress, id));
  const name = progress.profile?.name;
  if (remaining.length === 0 && name && progress.certificate) {
    return { eligible: true, name, completedAt: progress.certificate.completedAt };
  }
  return { eligible: false, remaining, needsName: !name };
}
