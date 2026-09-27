import { describe, expect, it, vi } from 'vitest';
import formsHtml from '../../public/__forms.html?raw';
import {
  FORM_ENDPOINT,
  FORM_FIELDS,
  FORM_NAME,
  RECEIVED_MARKER,
  REGISTRATION_FIELDS,
  REGISTRATION_FORM_NAME,
  REGISTRATION_RECEIVED_MARKER,
  encodeRegistration,
  encodeSubmission,
  submitRegistration,
  submitUseCase,
} from './submission';
import receivedHtml from '../../public/use-case-received.html?raw';
import registrationReceivedHtml from '../../public/registration-received.html?raw';
import { GOOD_DRAFT } from '../test/fixtures';
import { environmentFor } from './deployment';
import type { PendingRegistration } from '../domain/registration';

const PROD = environmentFor('production', 'baranosaieducationalquest.netlify.app');

/** The fields of one <form name="…"> block in the static declaration. */
function declaredFields(html: string, formName: string): string[] {
  const block = new RegExp(`<form name="${formName}"[\\s\\S]*?</form>`).exec(html)![0];
  return [...block.matchAll(/ name="([^"]+)"/g)].map((m) => m[1]).filter((n) => n !== formName);
}

const input = {
  submissionId: 'abc-12345678',
  participantId: 'participant-1234',
  displayName: 'Zoë 李',
  xHandle: 'zoe_1',
  answers: GOOD_DRAFT,
  curriculumVersion: '3',
  submittedAt: '2026-09-25T10:00:00.000Z',
};

describe('Netlify Forms submission', () => {
  it('declares a static form in public/__forms.html with exactly the fields the app sends', () => {
    const html = formsHtml;
    expect(html).toMatch(new RegExp(`<form name="${FORM_NAME}"[^>]*data-netlify="true"`));
    expect(html).toMatch(/netlify-honeypot="bot-field"/);
    expect(html).toMatch(/action="\/use-case-received.html"/);
    expect(receivedHtml).toContain(RECEIVED_MARKER);
    expect(html).not.toContain(RECEIVED_MARKER);
    expect(new Set(declaredFields(html, FORM_NAME))).toEqual(new Set(FORM_FIELDS));
  });

  it('declares the registration form with exactly the fields the app sends, and its own confirmation page', () => {
    expect(formsHtml).toMatch(new RegExp(`<form name="${REGISTRATION_FORM_NAME}"[^>]*action="/registration-received.html"[^>]*data-netlify="true"[^>]*netlify-honeypot="bot-field"`));
    expect(new Set(declaredFields(formsHtml, REGISTRATION_FORM_NAME))).toEqual(new Set(REGISTRATION_FIELDS));
    expect(registrationReceivedHtml).toContain(REGISTRATION_RECEIVED_MARKER);
    expect(registrationReceivedHtml).not.toContain(RECEIVED_MARKER);
    expect(receivedHtml).not.toContain(REGISTRATION_RECEIVED_MARKER);
    expect(formsHtml).not.toContain('data-quest-received');
  });

  it('URL-encodes form-name, the participant and every answer', () => {
    const body = new URLSearchParams(encodeSubmission(input, PROD));
    expect(body.get('form-name')).toBe('use-case');
    expect(body.get('bot-field')).toBe('');
    expect(body.get('displayName')).toBe('Zoë 李');
    expect(body.get('xHandle')).toBe('@zoe_1');
    expect(body.get('title')).toBe(GOOD_DRAFT.title);
    expect(body.get('whoAndWhat')).toBe(GOOD_DRAFT.whoAndWhat);
    expect(body.get('whyVerify')).toBe(GOOD_DRAFT.whyVerify);
    expect(body.get('curriculumVersion')).toBe('3');
    expect(body.get('submittedAt')).toBe(input.submittedAt);
    expect(body.get('participantId')).toBe('participant-1234');
    expect(body.get('submissionId')).toBe('abc-12345678');
    expect(body.get('formType')).toBe('Final case study');
    expect(body.get('environment')).toBe('Production');
    expect(body.get('siteHost')).toBe('baranosaieducationalquest.netlify.app');
    expect(body.get('subject')).toBe('[BaranosAI Quest] Case study: “Fair harbour berths” by Zoë 李 (@zoe_1)');
    expect(body.get('readableSubmission')).toContain(`Participant name: Zoë 李\nX handle: @zoe_1\nParticipant ID: participant-1234`);
    expect([...body.keys()].sort()).toEqual([...FORM_FIELDS].sort());
  });

  it('writes “Not provided” for a missing X handle and keeps multi-line answers intact', () => {
    const long = `${'Line one of a long answer. '.repeat(40)}\n\nSecond paragraph.\nThird line.`;
    const body = new URLSearchParams(encodeSubmission({ ...input, xHandle: undefined, answers: { ...GOOD_DRAFT, whyVerify: long } }, PROD));
    expect(body.get('xHandle')).toBe('Not provided');
    expect(body.get('whyVerify')).toBe(long);
    expect(body.get('readableSubmission')).toContain(long);
    expect(body.get('subject')).toMatch(/\(Not provided\)$/);
  });

  it('encodes a registration with its own form name, IDs and readable summary', () => {
    const entry: PendingRegistration = { id: 'reg-12345678', participantId: 'participant-1234', kind: 'new', name: 'Ada', submittedAt: '2026-09-25T10:00:00.000Z' };
    const body = new URLSearchParams(encodeRegistration(entry, environmentFor('deploy-preview', 'deploy-preview-4--baranosaieducationalquest.netlify.app')));
    expect([...body.keys()].sort()).toEqual([...REGISTRATION_FIELDS].sort());
    expect(body.get('form-name')).toBe('registration');
    expect(body.get('xHandle')).toBe('Not provided');
    expect(body.get('registrationType')).toBe('New participant');
    expect(body.get('environment')).toBe('Deploy preview');
    expect(body.get('subject')).toBe('[BaranosAI Quest · Deploy preview] Registration: Ada (Not provided)');
  });

  it('confirms a registration only with the registration page, not the use-case page', async () => {
    const entry: PendingRegistration = { id: 'reg-12345678', participantId: 'participant-1234', kind: 'new', name: 'Ada', submittedAt: '2026-09-25T10:00:00.000Z' };
    const ok = vi.fn().mockResolvedValue(new Response(registrationReceivedHtml, { status: 200 }));
    expect(await submitRegistration(entry, ok)).toEqual({ ok: true });
    const wrong = vi.fn().mockResolvedValue(new Response(receivedHtml, { status: 200 }));
    expect(await submitRegistration(entry, wrong)).toMatchObject({ ok: false, reason: 'not-set-up' });
    const spa = vi.fn().mockResolvedValue(new Response('<!doctype html><div id="root"></div>', { status: 200 }));
    expect(await submitRegistration(entry, spa)).toMatchObject({ ok: false, reason: 'not-set-up' });
    const offline = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await submitRegistration(entry, offline)).toEqual({ ok: false, reason: 'network' });
  });

  it('succeeds only when the server returns the form’s confirmation page', async () => {
    const ok = vi.fn().mockResolvedValue(new Response(receivedHtml, { status: 200 }));
    expect(await submitUseCase(input, ok)).toEqual({ ok: true });
    expect(ok).toHaveBeenCalledWith(FORM_ENDPOINT, expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }));

    for (const status of [404, 405]) {
      const bad = vi.fn().mockResolvedValue(new Response('Not Found', { status }));
      const r = await submitUseCase(input, bad);
      expect(r).toEqual({ ok: false, error: expect.stringMatching(/aren’t switched on for this site yet.*draft is saved in this browser, so nothing is lost/) });
      expect(!r.ok && r.error).not.toMatch(/try again in a moment/);
    }
    const server = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));
    expect(await submitUseCase(input, server)).toEqual({ ok: false, error: expect.stringMatching(/error 500.*nothing is lost/) });
  });

  it('does not trust a bare 200 (e.g. a static server echoing the form file)', async () => {
    const echo = vi.fn().mockResolvedValue(new Response(formsHtml, { status: 200 }));
    const r = await submitUseCase(input, echo);
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/aren’t switched on for this site yet/) });
  });

  it('reports network failures and timeouts without claiming success', async () => {
    const offline = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await submitUseCase(input, offline)).toEqual({ ok: false, error: expect.stringMatching(/couldn’t reach the server/) });
    const hanging = vi.fn((_: unknown, init: RequestInit) => new Promise<Response>((_, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))));
    expect(await submitUseCase(input, hanging as unknown as typeof fetch, 10)).toEqual({ ok: false, error: expect.stringMatching(/took too long/) });
  });
});
