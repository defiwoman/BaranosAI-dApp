import { CASE_IDS, isCaseId, type CaseId } from './types';
import { CURRICULUM_VERSION, REQUIRED_CHECKS, V1_COMPLETION_GRANTS } from './curriculum';
import { validateName, validateXHandle, type Profile } from './profile';
import { emptyDraft, isDraftComplete, parseDraft, USE_CASE_STEPS, type UseCaseDraft } from './useCase';

export const PROGRESS_VERSION = 3;

export interface CaseRecord {
  /** When the case first became complete. */
  completedAt: string;
}

/** A use case the organiser's server confirmed it received. */
export interface Submission {
  id: string;
  submittedAt: string;
  curriculumVersion: string;
  answers: UseCaseDraft;
}

export interface UseCaseState {
  /** Autosaved as the participant types, and kept if a submission fails. */
  draft: UseCaseDraft;
  step: number;
  /** Generated on the first attempt and reused on retries, so the organiser can spot duplicates. */
  submissionId: string | null;
  submission: Submission | null;
}

export interface Progress {
  version: typeof PROGRESS_VERSION;
  profile: Profile | null;
  /** Learning checks passed, see REQUIRED_CHECKS. */
  passedChecks: string[];
  cases: Partial<Record<CaseId, CaseRecord>>;
  useCase: UseCaseState;
  /** Set once, when all requirements are first met. Re-downloads reuse this date. */
  certificate: { completedAt: string; curriculumVersion: string } | null;
  /** A certificate earned under curriculum 2 (six cases, no use case). Kept and still downloadable. */
  earlierCertificate: { completedAt: string; curriculumVersion: string } | null;
}

export type Rank = 'Observer' | 'Investigator' | 'Challenger';

export function emptyUseCase(): UseCaseState {
  return { draft: emptyDraft(), step: 0, submissionId: null, submission: null };
}

export function emptyProgress(): Progress {
  return {
    version: PROGRESS_VERSION,
    profile: null,
    passedChecks: [],
    cases: {},
    useCase: emptyUseCase(),
    certificate: null,
    earlierCertificate: null,
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isDate = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const isId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(v);

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
  let progress: Progress | null;
  if (data.version === 1) progress = migrateV1(data);
  else if (data.version === 2) progress = migrateV2(data);
  else if (data.version === PROGRESS_VERSION) progress = parseV3(data);
  else return { ok: false, reason: typeof data.version === 'number' ? 'unsupported_version' : 'malformed' };
  if (!progress) return { ok: false, reason: 'malformed' };
  return data.version === PROGRESS_VERSION ? { ok: true, progress } : { ok: true, progress, migratedFrom: data.version as number };
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

function parseCases(value: unknown): Progress['cases'] | null {
  if (!isObject(value)) return null;
  const cases: Progress['cases'] = {};
  for (const [key, v] of Object.entries(value)) {
    if (!isCaseId(key) || !isObject(v) || !isDate(v.completedAt)) return null;
    cases[key] = { completedAt: v.completedAt };
  }
  return cases;
}

function parseCertificate(value: unknown, fallbackVersion: string): Progress['certificate'] | undefined {
  if (value === null || value === undefined) return null;
  if (!isObject(value) || !isDate(value.completedAt)) return undefined;
  const version = value.curriculumVersion === undefined ? fallbackVersion : value.curriculumVersion;
  if (typeof version !== 'string') return undefined;
  return { completedAt: value.completedAt, curriculumVersion: version };
}

function parseUseCase(value: unknown): UseCaseState | null {
  if (!isObject(value)) return null;
  const draft = parseDraft(value.draft);
  if (!draft || !Number.isInteger(value.step)) return null;
  const step = Math.min(Math.max(value.step as number, 0), USE_CASE_STEPS.length - 1);
  if (value.submissionId !== null && !isId(value.submissionId)) return null;
  let submission: Submission | null = null;
  if (value.submission !== null) {
    const s = value.submission;
    if (!isObject(s) || !isId(s.id) || !isDate(s.submittedAt) || typeof s.curriculumVersion !== 'string') return null;
    const answers = parseDraft(s.answers);
    if (!answers || !isDraftComplete(answers)) return null;
    submission = { id: s.id, submittedAt: s.submittedAt, curriculumVersion: s.curriculumVersion, answers };
  }
  return { draft, step, submissionId: value.submissionId as string | null, submission };
}

function parseV3(d: Record<string, unknown>): Progress | null {
  const profile = parseProfile(d.profile);
  const cases = parseCases(d.cases);
  const useCase = parseUseCase(d.useCase);
  const certificate = parseCertificate(d.certificate, CURRICULUM_VERSION);
  const earlierCertificate = parseCertificate(d.earlierCertificate, '2');
  if (profile === undefined || !cases || !useCase || certificate === undefined || earlierCertificate === undefined) return null;
  if (!isStringArray(d.passedChecks)) return null;
  return normalise({
    version: PROGRESS_VERSION,
    profile,
    passedChecks: [...new Set(d.passedChecks)],
    cases,
    useCase,
    certificate,
    earlierCertificate,
  });
}

/**
 * v2 (six simplified cases) issued its certificate after Case 06. That certificate is kept as
 * `earlierCertificate`; the current certificate additionally needs a submitted use case.
 */
function migrateV2(d: Record<string, unknown>): Progress | null {
  const profile = parseProfile(d.profile);
  const cases = parseCases(d.cases);
  const earlier = parseCertificate(d.certificate, '2');
  if (profile === undefined || !cases || earlier === undefined || !isStringArray(d.passedChecks)) return null;
  return normalise({
    ...emptyProgress(),
    profile,
    passedChecks: [...new Set(d.passedChecks)],
    cases,
    earlierCertificate: earlier ? { completedAt: earlier.completedAt, curriculumVersion: '2' } : null,
  });
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
  return normalise({ ...emptyProgress(), passedChecks: [...passed], cases });
}

function allCasesComplete(p: Pick<Progress, 'cases' | 'passedChecks'>): boolean {
  return CASE_IDS.every((id) => p.cases[id] && checksComplete(p.passedChecks, id));
}

/**
 * Keeps derived fields consistent: complete cases have records, and the certificate date is set
 * the first time every case is complete and a use case has been received.
 */
function normalise(p: Progress, now?: Date): Progress {
  const cases = { ...p.cases };
  for (const id of CASE_IDS) {
    if (!cases[id] && checksComplete(p.passedChecks, id) && now) cases[id] = { completedAt: now.toISOString() };
  }
  let certificate = p.certificate;
  // An earlier (curriculum 2) certificate is only honoured if every case really is complete.
  const earlierCertificate = allCasesComplete({ cases, passedChecks: p.passedChecks }) ? p.earlierCertificate : null;
  const submission = p.useCase.submission;
  if (!certificate && submission && allCasesComplete({ cases, passedChecks: p.passedChecks })) {
    certificate = { completedAt: now ? now.toISOString() : submission.submittedAt, curriculumVersion: CURRICULUM_VERSION };
  }
  return { ...p, cases, certificate, earlierCertificate };
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

/** Autosaves the use-case draft and the step the participant is on. */
export function saveDraft(progress: Progress, draft: UseCaseDraft, step: number): Progress {
  const clamped = Math.min(Math.max(step, 0), USE_CASE_STEPS.length - 1);
  return { ...progress, useCase: { ...progress.useCase, draft, step: clamped } };
}

/** Reuses the pending submission ID, or stores the new one. */
export function withSubmissionId(progress: Progress, id: string): Progress {
  if (progress.useCase.submissionId) return progress;
  return { ...progress, useCase: { ...progress.useCase, submissionId: id } };
}

/**
 * Records a submission only after the server confirmed it received it. The first confirmed
 * submission is kept; the certificate date is set at that moment if every case is complete.
 */
export function recordSubmission(progress: Progress, submission: Submission, now: Date = new Date()): Progress {
  if (progress.useCase.submission) return progress;
  if (!isDraftComplete(submission.answers)) throw new Error('Incomplete use case cannot be recorded');
  return normalise({ ...progress, useCase: { ...progress.useCase, submission } }, now);
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
  | { eligible: true; name: string; completedAt: string; useCaseTitle: string }
  | { eligible: false; remaining: CaseId[]; needsUseCase: boolean; needsName: boolean };

/**
 * The single certificate rule, shared by the summary, the reward screen and every download:
 * all six cases complete with their understanding checks passed, a use case the server
 * confirmed it received, and a name for the certificate.
 */
export function certificateEligibility(progress: Progress): Eligibility {
  const remaining = CASE_IDS.filter((id) => !isCompleted(progress, id));
  const name = progress.profile?.name;
  const submission = progress.useCase.submission;
  if (remaining.length === 0 && submission && name && progress.certificate) {
    return { eligible: true, name, completedAt: progress.certificate.completedAt, useCaseTitle: submission.answers.title };
  }
  return { eligible: false, remaining, needsUseCase: !submission, needsName: !name };
}

/** Whether the participant may start or edit their use case: after all six cases. */
export function canWriteUseCase(progress: Progress): boolean {
  return CASE_IDS.every((id) => isCompleted(progress, id));
}
