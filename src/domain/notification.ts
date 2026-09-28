import { USE_CASE_FIELDS, type UseCaseDraft } from './useCase';
import { REGISTRATION_KIND_LABELS, type PendingRegistration } from './registration';

/**
 * Builds the organiser's notification for each form: a recognisable subject and a plain-text
 * body with readable labels. Answers are copied in full with their line breaks; nothing is
 * summarised or cut. The body is plain text, so participant text is never interpreted as HTML.
 */

export interface Environment {
  /** "Production", "Deploy preview", "Branch deploy" or "Local development". */
  label: string;
  host: string;
}

export const NOT_PROVIDED = 'Not provided';

export const formatHandle = (xHandle?: string) => (xHandle ? `@${xHandle}` : NOT_PROVIDED);

/** One line, no control characters, bounded: safe for an email subject. */
export function subjectText(s: string, max = 140): string {
  const line = s.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(line).length > max ? `${Array.from(line).slice(0, max - 1).join('')}…` : line;
}

const prefix = (env: Environment) => (env.label === 'Production' ? '[BaranosAI Quest]' : `[BaranosAI Quest · ${env.label}]`);

export interface Notification {
  subject: string;
  /** Label/value pairs in reading order. */
  fields: [label: string, value: string][];
  /** The same content as one readable plain-text block. */
  text: string;
}

function render(fields: [string, string][], longFrom: number): string {
  const head = fields.slice(0, longFrom).map(([l, v]) => `${l}: ${v}`);
  const body = fields.slice(longFrom).map(([l, v]) => `${l}\n${v}`);
  return [head.join('\n'), ...body].join('\n\n');
}

function common(formType: string, name: string, xHandle: string | undefined, participantId: string, submissionId: string, submittedAt: string, env: Environment): [string, string][] {
  return [
    ['Form type', formType],
    ['Participant name', name],
    ['X handle', formatHandle(xHandle)],
    ['Participant ID', participantId],
    ['Submission ID', submissionId],
    ['Submitted at (UTC)', submittedAt],
    ['Environment', `${env.label} (${env.host})`],
  ];
}

export const REGISTRATION_FORM_TYPE = 'Registration (entry form)';
export const CASE_STUDY_FORM_TYPE = 'Final case study';

export function registrationNotification(entry: PendingRegistration, env: Environment): Notification {
  const fields: [string, string][] = [
    ...common(REGISTRATION_FORM_TYPE, entry.name, entry.xHandle, entry.participantId, entry.id, entry.submittedAt, env),
    ['Registration type', REGISTRATION_KIND_LABELS[entry.kind]],
  ];
  const what = entry.kind === 'update' ? 'Profile update' : 'Registration';
  return {
    subject: subjectText(`${prefix(env)} ${what}: ${entry.name} (${formatHandle(entry.xHandle)})`),
    fields,
    text: render(fields, fields.length),
  };
}

/** Label used in the email for each answer; the form's own questions, with the limitation made explicit. */
export const CASE_STUDY_LABELS: Record<keyof UseCaseDraft, string> = {
  title: 'Idea title',
  whoAndWhat: USE_CASE_FIELDS.find((f) => f.id === 'whoAndWhat')!.label,
  whyVerify: `${USE_CASE_FIELDS.find((f) => f.id === 'whyVerify')!.label} (what needs checking, and one limitation that would remain)`,
};

export interface CaseStudyInput {
  submissionId: string;
  participantId: string;
  name: string;
  xHandle?: string;
  answers: UseCaseDraft;
  curriculumVersion: string;
  submittedAt: string;
}

export function caseStudyNotification(input: CaseStudyInput, env: Environment): Notification {
  const head: [string, string][] = [
    ...common(CASE_STUDY_FORM_TYPE, input.name, input.xHandle, input.participantId, input.submissionId, input.submittedAt, env),
    ['Curriculum version', input.curriculumVersion],
  ];
  const answers: [string, string][] = (Object.keys(CASE_STUDY_LABELS) as (keyof UseCaseDraft)[]).map((k) => [CASE_STUDY_LABELS[k], input.answers[k]]);
  const fields = [...head, ...answers];
  return {
    subject: subjectText(`${prefix(env)} Case study: “${input.answers.title}” by ${input.name} (${formatHandle(input.xHandle)})`),
    fields,
    text: render(fields, head.length),
  };
}
