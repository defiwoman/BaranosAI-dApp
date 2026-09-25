import type { UseCaseDraft } from '../domain/useCase';
import { CASES } from '../content/quest';

/**
 * Sends a use case to the quest organiser through Netlify Forms.
 *
 * Netlify detects forms at deploy time from static HTML, so `public/__forms.html` declares a
 * hidden form with exactly these field names. The app posts URL-encoded data, including
 * `form-name`, to that static file. Submissions are stored privately in the site's Netlify
 * Forms dashboard; nothing is published.
 */
export const FORM_NAME = 'use-case';
export const FORM_ENDPOINT = '/__forms.html';
/** Present only in public/use-case-received.html, the form's action page. */
export const RECEIVED_MARKER = 'data-quest-received="use-case"';

/** Every field the form sends. Must match public/__forms.html (a test checks this). */
export const FORM_FIELDS = [
  'form-name',
  'bot-field',
  'submissionId',
  'displayName',
  'xHandle',
  'title',
  'problem',
  'aiRole',
  'whyVerify',
  'agreedRules',
  'risks',
  'concepts',
  'curriculumVersion',
  'submittedAt',
] as const;

export interface SubmissionInput {
  submissionId: string;
  displayName: string;
  xHandle?: string;
  answers: UseCaseDraft;
  curriculumVersion: string;
  submittedAt: string;
}

export function encodeSubmission(input: SubmissionInput): string {
  const concepts = input.answers.concepts.map((id) => `${id} ${CASES.find((c) => c.id === id)?.title ?? ''}`.trim());
  const fields: Record<(typeof FORM_FIELDS)[number], string> = {
    'form-name': FORM_NAME,
    'bot-field': '',
    submissionId: input.submissionId,
    displayName: input.displayName,
    xHandle: input.xHandle ? `@${input.xHandle}` : '',
    title: input.answers.title,
    problem: input.answers.problem,
    aiRole: input.answers.aiRole,
    whyVerify: input.answers.whyVerify,
    agreedRules: input.answers.agreedRules,
    risks: input.answers.risks,
    concepts: concepts.join('; '),
    curriculumVersion: input.curriculumVersion,
    submittedAt: input.submittedAt,
  };
  return new URLSearchParams(fields).toString();
}

export type SubmitResult = { ok: true } | { ok: false; error: string };

/**
 * A submission counts as received only when the response is 2xx AND is the form's action page
 * (which carries RECEIVED_MARKER). Netlify serves that page after it stores a submission. A plain
 * static server, or a site where Netlify form detection is off, would not return it, so a bare
 * "200 OK" is not trusted. Anything else, including a network error or a timeout, is a failure:
 * the draft is kept and the certificate stays locked.
 */
export async function submitUseCase(
  input: SubmissionInput,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 20_000,
): Promise<SubmitResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encodeSubmission(input),
      signal: controller.signal,
    });
    if (res.ok) {
      const text = await res.text();
      if (text.includes(RECEIVED_MARKER)) return { ok: true };
      return {
        ok: false,
        error:
          'The server answered but didn’t confirm it saved your use case, so your certificate stays locked. Your answers are saved; please try again later.',
      };
    }
    return {
      ok: false,
      error: `The quest organiser’s server didn’t accept the submission (error ${res.status}). Your answers are saved, so please try again in a moment.`,
    };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === 'AbortError';
    return {
      ok: false,
      error: aborted
        ? 'The submission took too long. Your answers are saved; please check your connection and try again.'
        : 'We couldn’t reach the server. Your answers are saved; please check your connection and try again.',
    };
  } finally {
    clearTimeout(timer);
  }
}

export function newSubmissionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `uc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
