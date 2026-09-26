import { isCaseId, type CaseId } from './types';

/**
 * The participant's own BaranosAI use case: the final requirement for the certificate.
 *
 * The participant designs it in four steps (plus a name). What is sent to the organiser, and
 * stored as the submission, keeps the existing three-field shape, so the Netlify form and
 * submission history are unchanged:
 *   whoAndWhat = who + decides,  whyVerify = verifiable + risks  (as separate paragraphs).
 */

export type DraftField = 'title' | 'who' | 'decides' | 'verifiable' | 'risks';

/** The four-step design (curriculum 3.2). */
export interface UseCaseDraft {
  title: string;
  who: string;
  decides: string;
  verifiable: string;
  risks: string;
}

/** The shape sent to the organiser and stored as the submission (curriculum 3.1+). */
export interface UseCaseAnswers {
  title: string;
  whoAndWhat: string;
  whyVerify: string;
}

/** The earlier five-step draft (curriculum 3.0), kept as a backup after migration. */
export interface LegacyDraft {
  title: string;
  problem: string;
  aiRole: string;
  whyVerify: string;
  agreedRules: string;
  risks: string;
  concepts: CaseId[];
}

export interface FieldSpec<F extends string = DraftField> {
  id: F;
  /** Step number shown as "01 //". Empty for the name. */
  step: string;
  label: string;
  help: string;
  /** A brief illustration shown as helper text, never inserted into the answer. */
  example: string;
  multiline: boolean;
  max: number;
}

export const DRAFT_FIELDS: FieldSpec[] = [
  { id: 'title', step: '', label: 'Name your system', help: 'A short title.', example: 'e.g. “Fair grant checker”', multiline: false, max: 80 },
  {
    id: 'who',
    step: '01',
    label: 'Who needs the AI?',
    help: 'Who would use it, and what problem do they have?',
    example: 'e.g. A local council that scores community grant applications.',
    multiline: true,
    max: 1200,
  },
  {
    id: 'decides',
    step: '02',
    label: 'What does the AI decide?',
    help: 'The AI’s task in a sentence or two.',
    example: 'e.g. It rates each application against a published checklist.',
    multiline: true,
    max: 1200,
  },
  {
    id: 'verifiable',
    step: '03',
    label: 'What should be verifiable?',
    help: 'What would be committed and checked: the model, the evidence, the rules?',
    example: 'e.g. The model version, each application file and the checklist, so a rejected applicant can challenge a score.',
    multiline: true,
    max: 1500,
  },
  {
    id: 'risks',
    step: '04',
    label: 'What could still go wrong?',
    help: 'One thing verification wouldn’t fix.',
    example: 'e.g. The checklist itself could be unfair.',
    multiline: true,
    max: 1000,
  },
];

/** The steps of the studio: one question each, then a preview. */
export const STUDIO_STEPS: { id: string; fields: DraftField[] }[] = [
  { id: 'who', fields: ['title', 'who'] },
  { id: 'decides', fields: ['decides'] },
  { id: 'verifiable', fields: ['verifiable'] },
  { id: 'risks', fields: ['risks'] },
  { id: 'preview', fields: [] },
];

/** Labels for the stored three-field answers (used when showing a submitted case study). */
export const ANSWER_FIELDS: { id: keyof UseCaseAnswers; label: string }[] = [
  { id: 'title', label: 'System' },
  { id: 'whoAndWhat', label: 'Who needs it, and what the AI decides' },
  { id: 'whyVerify', label: 'What should be verifiable, and what could still go wrong' },
];

export function emptyDraft(): UseCaseDraft {
  return { title: '', who: '', decides: '', verifiable: '', risks: '' };
}

const normaliseText = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();
const stripExample = (s: string) => normaliseText(s.replace(/^e\.g\.\s*/i, '').replace(/[“”"]/g, '')).toLowerCase();

/**
 * Basic completeness checks, not scoring: an answer must not be empty or whitespace-only,
 * must not just repeat the example or the question, and must contain words. No minimum length.
 */
export function validateField(spec: Pick<FieldSpec<string>, 'label' | 'help' | 'example' | 'max'>, raw: string): string | null {
  const value = normaliseText(raw);
  if (value === '') return 'Please add a short answer in your own words.';
  if (stripExample(value) === stripExample(spec.example)) return 'That’s the example. Please describe your own idea.';
  const lower = value.toLowerCase();
  if (lower === normaliseText(spec.label).toLowerCase() || lower === normaliseText(spec.help).toLowerCase()) {
    return 'Please answer the question rather than repeating it.';
  }
  if (!/\p{L}/u.test(value)) return 'Please use words to describe your idea.';
  if (Array.from(raw.trim()).length > spec.max) return `Please keep this under ${spec.max} characters.`;
  return null;
}

export type DraftErrors = Partial<Record<DraftField, string>>;

export function validateStep(stepIndex: number, draft: UseCaseDraft): DraftErrors {
  const errors: DraftErrors = {};
  for (const id of STUDIO_STEPS[stepIndex].fields) {
    const spec = DRAFT_FIELDS.find((f) => f.id === id)!;
    const e = validateField(spec, draft[id]);
    if (e) errors[id] = e;
  }
  return errors;
}

export function validateDraft(draft: UseCaseDraft): DraftErrors {
  return STUDIO_STEPS.reduce<DraftErrors>((acc, _, i) => ({ ...acc, ...validateStep(i, draft) }), {});
}

export function isDraftComplete(draft: UseCaseDraft): boolean {
  return Object.keys(validateDraft(draft)).length === 0;
}

/** The first step with a missing or invalid answer, or the preview if everything is ready. */
export function firstOpenStep(draft: UseCaseDraft): number {
  const i = STUDIO_STEPS.findIndex((_, idx) => Object.keys(validateStep(idx, draft)).length > 0);
  return i < 0 ? STUDIO_STEPS.length - 1 : i;
}

const joinParagraphs = (...parts: string[]) =>
  parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n\n');

/** The three-field shape sent to the organiser. */
export function composeAnswers(draft: UseCaseDraft): UseCaseAnswers {
  return {
    title: normaliseText(draft.title),
    whoAndWhat: joinParagraphs(draft.who, draft.decides),
    whyVerify: joinParagraphs(draft.verifiable, draft.risks),
  };
}

/** Stored answers are complete when each of the three fields has real content. */
export function isAnswersComplete(a: UseCaseAnswers): boolean {
  const spec = { label: '', help: '', example: '', max: 6000 };
  return [a.title, a.whoAndWhat, a.whyVerify].every((v) => validateField(spec, v) === null);
}

const paragraphs = (s: string) =>
  s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/**
 * Splits a three-field draft (curriculum 3.1) into the four steps without losing text:
 * the first paragraph of "who and what" is who, the rest is what the AI decides; the last
 * paragraph of "why verify" (if there are several) is what could still go wrong.
 */
export function splitAnswers(a: UseCaseAnswers): UseCaseDraft {
  const ww = paragraphs(a.whoAndWhat);
  const wv = paragraphs(a.whyVerify);
  return {
    title: a.title,
    who: ww[0] ?? '',
    decides: ww.slice(1).join('\n\n'),
    verifiable: (wv.length > 1 ? wv.slice(0, -1) : wv).join('\n\n'),
    risks: wv.length > 1 ? wv[wv.length - 1] : '',
  };
}

/** Folds the five-step draft (curriculum 3.0) into the four steps without losing any text. */
export function migrateLegacyDraft(legacy: LegacyDraft): UseCaseDraft {
  return {
    title: legacy.title.trim(),
    who: legacy.problem.trim(),
    decides: legacy.aiRole.trim(),
    verifiable: joinParagraphs(legacy.whyVerify, legacy.agreedRules),
    risks: legacy.risks.trim(),
  };
}

/** The five-step draft as it would have been submitted in three fields. */
export function legacyAnswers(legacy: LegacyDraft): UseCaseAnswers {
  return composeAnswers(migrateLegacyDraft(legacy));
}

export function legacyHasContent(legacy: LegacyDraft): boolean {
  return [legacy.title, legacy.problem, legacy.aiRole, legacy.whyVerify, legacy.agreedRules, legacy.risks].some((v) => v.trim() !== '') || legacy.concepts.length > 0;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const strings = (v: Record<string, unknown>, keys: readonly string[], max: number) => keys.every((k) => typeof v[k] === 'string' && (v[k] as string).length <= max);

export function parseDraft(value: unknown): UseCaseDraft | null {
  const keys = ['title', 'who', 'decides', 'verifiable', 'risks'] as const;
  if (!isObject(value) || !strings(value, keys, 6000)) return null;
  return { title: value.title as string, who: value.who as string, decides: value.decides as string, verifiable: value.verifiable as string, risks: value.risks as string };
}

export function parseAnswers(value: unknown): UseCaseAnswers | null {
  const keys = ['title', 'whoAndWhat', 'whyVerify'] as const;
  if (!isObject(value) || !strings(value, keys, 6000)) return null;
  return { title: value.title as string, whoAndWhat: value.whoAndWhat as string, whyVerify: value.whyVerify as string };
}

export function parseLegacyDraft(value: unknown): LegacyDraft | null {
  if (!isObject(value)) return null;
  const fields = ['title', 'problem', 'aiRole', 'whyVerify', 'agreedRules', 'risks'] as const;
  if (!strings(value, fields, 2000)) return null;
  if (!Array.isArray(value.concepts) || !value.concepts.every(isCaseId)) return null;
  return {
    title: value.title as string,
    problem: value.problem as string,
    aiRole: value.aiRole as string,
    whyVerify: value.whyVerify as string,
    agreedRules: value.agreedRules as string,
    risks: value.risks as string,
    concepts: [...new Set(value.concepts as CaseId[])],
  };
}
