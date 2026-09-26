import { isCaseId, type CaseId } from './types';

/** The participant's own BaranosAI use case: the final requirement for the certificate. */

export type UseCaseField = 'title' | 'whoAndWhat' | 'whyVerify';

/** Three short answers. The name and X handle come from the participant's profile. */
export interface UseCaseDraft {
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

export interface FieldSpec {
  id: UseCaseField;
  label: string;
  help: string;
  /** A brief illustration shown as helper text, never inserted into the answer. */
  example: string;
  multiline: boolean;
  max: number;
}

export const USE_CASE_FIELDS: FieldSpec[] = [
  {
    id: 'title',
    label: 'Name your idea',
    help: 'A short title.',
    example: 'e.g. “Fair grant checker”',
    multiline: false,
    max: 80,
  },
  {
    id: 'whoAndWhat',
    label: 'Who would it help, and what would the AI do?',
    help: 'Two or three sentences covering the problem and the AI’s task.',
    example: 'e.g. A local council scores grant applications. The AI would rate each one against a published checklist.',
    multiline: true,
    max: 1500,
  },
  {
    id: 'whyVerify',
    label: 'Why does verification matter?',
    help: 'One or two sentences explaining what needs checking and one limitation that would remain.',
    example: 'e.g. Applicants could challenge a score step by step. The checklist itself could still be unfair.',
    multiline: true,
    max: 2500,
  },
];

export function emptyDraft(): UseCaseDraft {
  return { title: '', whoAndWhat: '', whyVerify: '' };
}

const normaliseText = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();
const stripExample = (s: string) => normaliseText(s.replace(/^e\.g\.\s*/i, '').replace(/[“”"]/g, '')).toLowerCase();

/**
 * Basic completeness checks, not scoring: an answer must not be empty or whitespace-only,
 * must not just repeat the example or the question, and must contain words. No minimum essay length.
 */
export function validateField(spec: FieldSpec, raw: string): string | null {
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

export type DraftErrors = Partial<Record<UseCaseField, string>>;

export function validateDraft(draft: UseCaseDraft): DraftErrors {
  const errors: DraftErrors = {};
  for (const spec of USE_CASE_FIELDS) {
    const e = validateField(spec, draft[spec.id]);
    if (e) errors[spec.id] = e;
  }
  return errors;
}

export function isDraftComplete(draft: UseCaseDraft): boolean {
  return Object.keys(validateDraft(draft)).length === 0;
}

export function cleanDraft(draft: UseCaseDraft): UseCaseDraft {
  return { title: normaliseText(draft.title), whoAndWhat: draft.whoAndWhat.trim(), whyVerify: draft.whyVerify.trim() };
}

const joinParagraphs = (...parts: string[]) =>
  parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n\n');

/**
 * Folds the five-step draft into the three fields without losing any text: the title stays,
 * problem + AI task become field 2, and verification + agreed rules + limitations become field 3,
 * separated by blank lines so they stay readable and editable.
 */
export function migrateLegacyDraft(legacy: LegacyDraft): UseCaseDraft {
  return {
    title: legacy.title.trim(),
    whoAndWhat: joinParagraphs(legacy.problem, legacy.aiRole),
    whyVerify: joinParagraphs(legacy.whyVerify, legacy.agreedRules, legacy.risks),
  };
}

export function legacyHasContent(legacy: LegacyDraft): boolean {
  return [legacy.title, legacy.problem, legacy.aiRole, legacy.whyVerify, legacy.agreedRules, legacy.risks].some((v) => v.trim() !== '') || legacy.concepts.length > 0;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Parses a stored three-field draft. */
export function parseDraft(value: unknown): UseCaseDraft | null {
  if (!isObject(value)) return null;
  const fields: UseCaseField[] = ['title', 'whoAndWhat', 'whyVerify'];
  if (!fields.every((f) => typeof value[f] === 'string' && (value[f] as string).length <= 6000)) return null;
  return { title: value.title as string, whoAndWhat: value.whoAndWhat as string, whyVerify: value.whyVerify as string };
}

/** Parses a stored five-step draft from curriculum 3.0. */
export function parseLegacyDraft(value: unknown): LegacyDraft | null {
  if (!isObject(value)) return null;
  const fields = ['title', 'problem', 'aiRole', 'whyVerify', 'agreedRules', 'risks'] as const;
  if (!fields.every((f) => typeof value[f] === 'string' && (value[f] as string).length <= 2000)) return null;
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
