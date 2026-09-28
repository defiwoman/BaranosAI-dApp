import type { UseCaseDraft } from '../domain/useCase';
import type { PendingRegistration } from '../domain/registration';
import { caseStudyNotification, formatHandle, registrationNotification, type Environment, type Notification } from '../domain/notification';
import { newId } from '../domain/ids';
import { currentEnvironment } from './deployment';

/**
 * Sends forms to the quest organiser through Netlify Forms.
 *
 * Netlify detects forms at deploy time from static HTML, so `public/__forms.html` declares a
 * hidden form for each one with exactly these field names. The app posts URL-encoded data,
 * including `form-name`, to that static file. Netlify stores each submission privately in the
 * site's Forms dashboard before it serves the form's action page, and then sends any form
 * notifications configured in the dashboard. The recipient address lives only in that
 * dashboard setting; the browser never supplies it.
 */
export const FORM_ENDPOINT = '/__forms.html';

export const FORM_NAME = 'use-case';
/** Present only in public/use-case-received.html, the use-case form's action page. */
export const RECEIVED_MARKER = 'data-quest-received="use-case"';

export const REGISTRATION_FORM_NAME = 'registration';
/** Present only in public/registration-received.html, the registration form's action page. */
export const REGISTRATION_RECEIVED_MARKER = 'data-quest-received="registration"';

/** Sent with every form. `subject` sets the notification email's subject line in Netlify. */
const COMMON_FIELDS = ['form-name', 'bot-field', 'subject', 'formType', 'submissionId', 'participantId', 'displayName', 'xHandle'] as const;
const TRAILING_FIELDS = ['submittedAt', 'environment', 'siteHost', 'readableSubmission'] as const;

/** Every field the use-case form sends. Must match public/__forms.html (a test checks this). */
export const FORM_FIELDS = [...COMMON_FIELDS, 'title', 'whoAndWhat', 'whyVerify', 'curriculumVersion', ...TRAILING_FIELDS] as const;

/** Every field the registration form sends. Must match public/__forms.html (a test checks this). */
export const REGISTRATION_FIELDS = [...COMMON_FIELDS, 'registrationType', ...TRAILING_FIELDS] as const;

type Fields<T extends readonly string[]> = Record<T[number], string>;

function base(formName: string, n: Notification, submissionId: string, participantId: string, name: string, xHandle: string | undefined) {
  return {
    'form-name': formName,
    'bot-field': '',
    subject: n.subject,
    formType: n.fields[0][1],
    submissionId,
    participantId,
    displayName: name,
    xHandle: formatHandle(xHandle),
  };
}

function trailing(submittedAt: string, env: Environment, n: Notification) {
  return { submittedAt, environment: env.label, siteHost: env.host, readableSubmission: n.text };
}

export interface SubmissionInput {
  submissionId: string;
  participantId: string;
  displayName: string;
  xHandle?: string;
  answers: UseCaseDraft;
  curriculumVersion: string;
  submittedAt: string;
}

export function encodeSubmission(input: SubmissionInput, env: Environment = currentEnvironment()): string {
  const n = caseStudyNotification({ ...input, name: input.displayName }, env);
  const fields: Fields<typeof FORM_FIELDS> = {
    ...base(FORM_NAME, n, input.submissionId, input.participantId, input.displayName, input.xHandle),
    title: input.answers.title,
    whoAndWhat: input.answers.whoAndWhat,
    whyVerify: input.answers.whyVerify,
    curriculumVersion: input.curriculumVersion,
    ...trailing(input.submittedAt, env, n),
  };
  return new URLSearchParams(fields).toString();
}

export function encodeRegistration(entry: PendingRegistration, env: Environment = currentEnvironment()): string {
  const n = registrationNotification(entry, env);
  const fields: Fields<typeof REGISTRATION_FIELDS> = {
    ...base(REGISTRATION_FORM_NAME, n, entry.id, entry.participantId, entry.name, entry.xHandle),
    registrationType: n.fields.find(([l]) => l === 'Registration type')![1],
    ...trailing(entry.submittedAt, env, n),
  };
  return new URLSearchParams(fields).toString();
}

type PostResult = { ok: true } | { ok: false; reason: 'not-set-up' | 'server' | 'network' | 'timeout'; status?: number };

/**
 * A submission counts as stored only when the response is 2xx AND is that form's action page
 * (which carries its marker). Netlify serves that page after it stores a submission. A plain
 * static server, the SPA fallback, or a site where Netlify form detection is off would not
 * return it, so a bare "200 OK" is not trusted.
 */
async function postForm(body: string, marker: string, fetchImpl: typeof fetch, timeoutMs: number): Promise<PostResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
    if (res.ok) {
      const text = await res.text();
      return text.includes(marker) ? { ok: true } : { ok: false, reason: 'not-set-up', status: res.status };
    }
    // 404/405: the host has no form handler for this address, i.e. submissions are not set up.
    if (res.status === 404 || res.status === 405) return { ok: false, reason: 'not-set-up', status: res.status };
    return { ok: false, reason: 'server', status: res.status };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === 'AbortError';
    return { ok: false, reason: aborted ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

export type SubmitResult = { ok: true } | { ok: false; error: string };

const DRAFT_KEPT = 'Your draft is saved in this browser, so nothing is lost.';

/** Shown when the site isn't accepting submissions (e.g. Netlify form detection is off). */
export const NOTICE_NOT_SET_UP = 'Use-case submissions aren’t switched on for this site yet, so your certificate stays locked for now.';
const NOT_SET_UP = `${NOTICE_NOT_SET_UP} ${DRAFT_KEPT} Please let the quest organiser know; once they’ve enabled submissions you can submit again from this page.`;

/** Anything but a confirmed store, including a network error or a timeout, is a failure: the draft is kept and the certificate stays locked. */
export async function submitUseCase(input: SubmissionInput, fetchImpl: typeof fetch = fetch, timeoutMs = 20_000): Promise<SubmitResult> {
  const r = await postForm(encodeSubmission(input), RECEIVED_MARKER, fetchImpl, timeoutMs);
  if (r.ok) return r;
  switch (r.reason) {
    case 'not-set-up':
      return { ok: false, error: NOT_SET_UP };
    case 'server':
      return { ok: false, error: `The quest organiser’s server couldn’t save your use case (error ${r.status}). ${DRAFT_KEPT} Please try again.` };
    case 'timeout':
      return { ok: false, error: `The submission took too long. ${DRAFT_KEPT} Please check your connection and try again.` };
    case 'network':
      return { ok: false, error: `We couldn’t reach the server. ${DRAFT_KEPT} Please check your connection and try again.` };
  }
}

/** Sends one queued entry-form submission. The caller keeps it queued unless this returns ok. */
export async function submitRegistration(entry: PendingRegistration, fetchImpl: typeof fetch = fetch, timeoutMs = 20_000): Promise<PostResult> {
  return postForm(encodeRegistration(entry), REGISTRATION_RECEIVED_MARKER, fetchImpl, timeoutMs);
}

export const newSubmissionId = (): string => newId('uc');
