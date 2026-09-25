import type { CaseId } from './types';
import { CASE_IDS, isCaseId } from './types';

/** The participant's own BaranosAI use case: the final requirement for the certificate. */

export type UseCaseField = 'title' | 'problem' | 'aiRole' | 'whyVerify' | 'agreedRules' | 'risks';

export interface UseCaseDraft {
  title: string;
  problem: string;
  aiRole: string;
  whyVerify: string;
  agreedRules: string;
  risks: string;
  /** Lessons the participant links their idea to. */
  concepts: CaseId[];
}

export interface FieldSpec {
  id: UseCaseField;
  label: string;
  help: string;
  /** A short illustration shown as helper text, never inserted into the answer. */
  example: string;
  multiline: boolean;
  min: number;
  max: number;
}

export const USE_CASE_FIELDS: FieldSpec[] = [
  {
    id: 'title',
    label: 'Give your idea a name.',
    help: 'A few words is plenty.',
    example: 'e.g. “Fair grant checker”',
    multiline: false,
    min: 3,
    max: 80,
  },
  {
    id: 'problem',
    label: 'Who would it help, and what problem would it solve?',
    help: 'One or two sentences in your own words.',
    example: 'e.g. a local council that needs applicants to trust how their applications were scored.',
    multiline: true,
    min: 15,
    max: 600,
  },
  {
    id: 'aiRole',
    label: 'What would the AI do?',
    help: 'Describe the AI’s job simply. No technical detail needed.',
    example: 'e.g. read each application and score it against a published checklist.',
    multiline: true,
    min: 15,
    max: 600,
  },
  {
    id: 'whyVerify',
    label: 'Why would verifying its computation matter?',
    help: 'Think about Case 01: who would want to check the work, and what happens if a step goes wrong?',
    example: 'e.g. a rejected applicant could challenge a score instead of just trusting it.',
    multiline: true,
    min: 15,
    max: 600,
  },
  {
    id: 'agreedRules',
    label: 'What evidence and rules would need to be agreed beforehand?',
    help: 'Think about Case 02: the model, the evidence and the settings.',
    example: 'e.g. which model version, the application documents, and the scoring checklist.',
    multiline: true,
    min: 15,
    max: 600,
  },
  {
    id: 'risks',
    label: 'What could still go wrong, even if the computation is verified?',
    help: 'Think about Cases 04 and 05: evidence quality, the model’s judgement, hidden instructions.',
    example: 'e.g. an applicant could upload misleading documents, or the checklist itself could be unfair.',
    multiline: true,
    min: 15,
    max: 600,
  },
];

/** Form steps: a couple of questions each, then concepts, then the editable preview. */
export const USE_CASE_STEPS: { id: string; title: string; fields: UseCaseField[] }[] = [
  { id: 'idea', title: 'Your idea', fields: ['title', 'problem'] },
  { id: 'ai', title: 'The AI and why checking matters', fields: ['aiRole', 'whyVerify'] },
  { id: 'rules', title: 'Rules and limits', fields: ['agreedRules', 'risks'] },
  { id: 'concepts', title: 'What you learned', fields: [] },
  { id: 'preview', title: 'Review and submit', fields: [] },
];

export function emptyDraft(): UseCaseDraft {
  return { title: '', problem: '', aiRole: '', whyVerify: '', agreedRules: '', risks: '', concepts: [] };
}

const normaliseText = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();
const stripExample = (s: string) => normaliseText(s.replace(/^e\.g\.\s*/i, '').replace(/[“”"]/g, '')).toLowerCase();

/**
 * Basic completeness checks, not scoring. Rejects empty and whitespace-only answers,
 * answers that just repeat the example or the question, and text too short to carry an idea.
 */
export function validateField(spec: FieldSpec, raw: string): string | null {
  const value = normaliseText(raw);
  if (value === '') return 'Please add a short answer in your own words.';
  const lower = value.toLowerCase().replace(/[“”"]/g, '');
  if (stripExample(value) === stripExample(spec.example)) {
    return 'That’s the example. Please describe your own idea.';
  }
  if (lower === normaliseText(spec.label).toLowerCase() || lower === normaliseText(spec.help).toLowerCase()) {
    return 'Please answer the question rather than repeating it.';
  }
  if (Array.from(value).length < spec.min) {
    return spec.min <= 3 ? 'Please give your idea a name of at least 3 characters.' : 'Please add a little more, one short sentence is enough.';
  }
  if ((value.match(/\p{L}/gu) ?? []).length < Math.min(3, spec.min)) return 'Please use words to describe your idea.';
  if (Array.from(value).length > spec.max) return `Please keep this under ${spec.max} characters.`;
  return null;
}

export function validateConcepts(concepts: CaseId[]): string | null {
  return concepts.length === 0 ? 'Choose at least one lesson that connects to your idea.' : null;
}

export type DraftErrors = Partial<Record<UseCaseField | 'concepts', string>>;

export function validateStep(stepIndex: number, draft: UseCaseDraft): DraftErrors {
  const step = USE_CASE_STEPS[stepIndex];
  const errors: DraftErrors = {};
  for (const id of step.fields) {
    const spec = USE_CASE_FIELDS.find((f) => f.id === id)!;
    const e = validateField(spec, draft[id]);
    if (e) errors[id] = e;
  }
  if (step.id === 'concepts') {
    const e = validateConcepts(draft.concepts);
    if (e) errors.concepts = e;
  }
  return errors;
}

export function validateDraft(draft: UseCaseDraft): DraftErrors {
  return USE_CASE_STEPS.reduce<DraftErrors>((acc, _, i) => ({ ...acc, ...validateStep(i, draft) }), {});
}

export function isDraftComplete(draft: UseCaseDraft): boolean {
  return Object.keys(validateDraft(draft)).length === 0;
}

/** The first step with a problem, so the preview can send the participant straight there. */
export function firstInvalidStep(draft: UseCaseDraft): number | null {
  const i = USE_CASE_STEPS.findIndex((_, idx) => Object.keys(validateStep(idx, draft)).length > 0);
  return i < 0 ? null : i;
}

export function cleanDraft(draft: UseCaseDraft): UseCaseDraft {
  return {
    title: normaliseText(draft.title),
    problem: draft.problem.trim(),
    aiRole: draft.aiRole.trim(),
    whyVerify: draft.whyVerify.trim(),
    agreedRules: draft.agreedRules.trim(),
    risks: draft.risks.trim(),
    concepts: CASE_IDS.filter((id) => draft.concepts.includes(id)),
  };
}

/** Parses a stored draft; returns null if it is not a valid draft shape. */
export function parseDraft(value: unknown): UseCaseDraft | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const fields: UseCaseField[] = ['title', 'problem', 'aiRole', 'whyVerify', 'agreedRules', 'risks'];
  if (!fields.every((f) => typeof v[f] === 'string' && (v[f] as string).length <= 2000)) return null;
  if (!Array.isArray(v.concepts) || !v.concepts.every(isCaseId)) return null;
  const draft = emptyDraft();
  for (const f of fields) draft[f] = v[f] as string;
  draft.concepts = [...new Set(v.concepts as CaseId[])];
  return draft;
}
