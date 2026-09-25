import { describe, expect, it, vi } from 'vitest';
import formsHtml from '../../public/__forms.html?raw';
import { FORM_ENDPOINT, FORM_FIELDS, FORM_NAME, RECEIVED_MARKER, encodeSubmission, submitUseCase } from './submission';
import receivedHtml from '../../public/use-case-received.html?raw';
import { GOOD_DRAFT } from '../test/fixtures';

const input = {
  submissionId: 'abc-12345678',
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
    const declared = [...html.matchAll(/ name="([^"]+)"/g)].map((m) => m[1]).filter((n) => n !== FORM_NAME && n !== 'robots');
    expect(new Set(declared)).toEqual(new Set(FORM_FIELDS));
  });

  it('URL-encodes form-name, the participant and every answer', () => {
    const body = new URLSearchParams(encodeSubmission(input));
    expect(body.get('form-name')).toBe('use-case');
    expect(body.get('bot-field')).toBe('');
    expect(body.get('displayName')).toBe('Zoë 李');
    expect(body.get('xHandle')).toBe('@zoe_1');
    expect(body.get('title')).toBe(GOOD_DRAFT.title);
    expect(body.get('whoAndWhat')).toBe(GOOD_DRAFT.whoAndWhat);
    expect(body.get('whyVerify')).toBe(GOOD_DRAFT.whyVerify);
    expect(body.get('curriculumVersion')).toBe('3');
    expect(body.get('submittedAt')).toBe(input.submittedAt);
    expect([...body.keys()].sort()).toEqual([...FORM_FIELDS].sort());
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
