import { describe, expect, it } from 'vitest';
import { caseStudyNotification, registrationNotification, subjectText } from './notification';
import { environmentFor } from '../adapters/deployment';

const prod = environmentFor('production', 'baranosaieducationalquest.netlify.app');

describe('organiser notifications', () => {
  it('registration: every required item with readable labels, with and without an X handle', () => {
    const base = { id: 'reg-12345678', participantId: 'p-12345678', name: 'Zoë 李', submittedAt: '2026-09-25T10:00:00.000Z' } as const;
    const withX = registrationNotification({ ...base, kind: 'new', xHandle: 'zoe_1' }, prod);
    expect(withX.subject).toBe('[BaranosAI Quest] Registration: Zoë 李 (@zoe_1)');
    expect(withX.text).toBe(
      [
        'Form type: Registration (entry form)',
        'Participant name: Zoë 李',
        'X handle: @zoe_1',
        'Participant ID: p-12345678',
        'Submission ID: reg-12345678',
        'Submitted at (UTC): 2026-09-25T10:00:00.000Z',
        'Environment: Production (baranosaieducationalquest.netlify.app)',
        'Registration type: New participant',
      ].join('\n'),
    );
    const noX = registrationNotification({ ...base, kind: 'update' }, prod);
    expect(noX.text).toContain('X handle: Not provided');
    expect(noX.subject).toBe('[BaranosAI Quest] Profile update: Zoë 李 (Not provided)');
  });

  it('case study: identity plus every answer, in full, line breaks kept', () => {
    const whoAndWhat = 'Line one.\nLine two.\n\nNew paragraph with <b>tags</b> & “quotes”.';
    const whyVerify = `${'Verification lets people check each step. '.repeat(50)}\n\nLimitation: the rules could still be unfair.`;
    const n = caseStudyNotification(
      {
        submissionId: 'uc-12345678',
        participantId: 'p-12345678',
        name: 'Ada',
        answers: { title: 'Fair grants', whoAndWhat, whyVerify },
        curriculumVersion: '3.1',
        submittedAt: '2026-09-26T08:00:00.000Z',
      },
      environmentFor('deploy-preview', 'deploy-preview-7--baranosaieducationalquest.netlify.app'),
    );
    expect(n.subject).toBe('[BaranosAI Quest · Deploy preview] Case study: “Fair grants” by Ada (Not provided)');
    expect(n.text).toContain('Form type: Final case study\nParticipant name: Ada\nX handle: Not provided\nParticipant ID: p-12345678\nSubmission ID: uc-12345678');
    expect(n.text).toContain('Environment: Deploy preview (deploy-preview-7--baranosaieducationalquest.netlify.app)');
    expect(n.text).toContain('Idea title\nFair grants');
    expect(n.text).toContain(`Who would it help, and what would the AI do?\n${whoAndWhat}`);
    expect(n.text).toContain(`Why does verification matter? (what needs checking, and one limitation that would remain)\n${whyVerify}`);
  });

  it('keeps subjects to one safe line', () => {
    expect(subjectText('a\r\nBcc: x@example.com\tb')).toBe('a Bcc: x@example.com b');
    expect(Array.from(subjectText('é'.repeat(300)))).toHaveLength(140);
  });

  it('labels the environment from the build context and the host', () => {
    expect(environmentFor('production', 'a.netlify.app').label).toBe('Production');
    expect(environmentFor('production', 'deploy-preview-3--a.netlify.app').label).toBe('Deploy preview');
    expect(environmentFor('branch-deploy', 'x--a.netlify.app').label).toBe('Branch deploy');
    expect(environmentFor('local', 'localhost:5173').label).toBe('Local development');
  });
});
