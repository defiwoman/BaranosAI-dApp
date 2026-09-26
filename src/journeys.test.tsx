import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { renderApp } from './test/renderApp';
import { STORAGE_KEY } from './adapters/storage';
import { RECEIVED_MARKER } from './adapters/submission';
import { QUEST } from './content/quest';
import { CONSOLE } from './content/console';
import { CASE_IDS, type CaseId } from './domain/types';
import { DRAFT_FIELDS, type DraftField } from './domain/useCase';
import { GOOD_ANSWERS, GOOD_DRAFT, LEGACY_DRAFT, THREE_FIELD, v2FinishedSave, v3WithDraft, v4WithDraft, v5CasesDone, v5WithCases } from './test/fixtures';

afterEach(() => vi.unstubAllGlobals());

/** Stands in for the Netlify Forms endpoint. */
function mockServer(...statuses: (number | 'offline')[]) {
  const calls: URLSearchParams[] = [];
  let i = 0;
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    calls.push(new URLSearchParams(init.body as string));
    const s = statuses[Math.min(i++, statuses.length - 1)];
    if (s === 'offline') throw new TypeError('Failed to fetch');
    return new Response(s === 200 ? `<main ${RECEIVED_MARKER}>Received</main>` : 'error', { status: s });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!);

function reload(path: string) {
  const snapshot = localStorage.getItem(STORAGE_KEY);
  document.body.innerHTML = '';
  if (snapshot) localStorage.setItem(STORAGE_KEY, snapshot);
  return renderApp(path);
}

async function enterName(user: UserEvent, name: string, button = 'Start my quest') {
  await user.type(screen.getByLabelText('Name on your certificate'), name);
  await user.click(screen.getByRole('button', { name: button }));
}

// ---------------------------------------------------------------- the case console

const systemLog = () => within(screen.getByRole('list', { name: 'System log' }));
const objectCard = (kind: string) => screen.getByRole('button', { name: new RegExp(`^${kind}`) });

async function recordTrust(user: UserEvent, stage: 'initial' | 'final', value: number) {
  const question = stage === 'initial' ? 'WOULD YOU TRUST THIS AI DECISION?' : 'WOULD YOU TRUST THE DECISION NOW?';
  fireEvent.change(screen.getByLabelText(question), { target: { value: String(value) } });
  await user.click(screen.getByRole('button', { name: stage === 'initial' ? 'Record initial trust' : 'Record final trust' }));
}

async function solveCase01(user: UserEvent) {
  await user.click(screen.getByRole('radio', { name: /Step 2/ }));
  await user.click(screen.getByRole('button', { name: 'Flag this step' }));
  await user.click(screen.getByRole('button', { name: 'Replay this step' }));
}

/** Answers whichever questions the case shows, in order, optionally trying a wrong option first. */
async function answer(user: UserEvent, id: CaseId, tryWrong: boolean) {
  for (;;) {
    const q = QUEST[id].questions.find((x) => screen.queryByText(x.prompt) && screen.queryByRole('button', { name: 'Submit finding' }));
    if (!q) return;
    if (tryWrong) {
      const wrong = q.options.find((o) => !o.correct)!;
      await user.click(screen.getByRole('radio', { name: wrong.label }));
      await user.click(screen.getByRole('button', { name: 'Submit finding' }));
      expect(screen.getByText(wrong.feedback)).toBeInTheDocument();
      expect(screen.getByText(/try as many times as you like/)).toBeInTheDocument();
      expect(saved().passedChecks).not.toContain(q.id);
    }
    const right = q.options.find((o) => o.correct)!;
    await user.click(screen.getByRole('radio', { name: right.label }));
    await user.click(screen.getByRole('button', { name: 'Submit finding' }));
    expect(screen.getByText(right.feedback)).toBeInTheDocument();
    const next = screen.queryByRole('button', { name: 'Next question' });
    if (!next) return;
    await user.click(next);
  }
}

/** The verification step each case needs before a finding can be submitted. */
async function investigate(user: UserEvent, id: CaseId) {
  if (id === '02') {
    await user.click(screen.getByRole('button', { name: 'Swap model → r3' }));
    await user.click(screen.getByRole('button', { name: 'Swap evidence → v1' }));
    await user.click(screen.getByRole('button', { name: 'Randomness off' }));
    expect(screen.getByText('✓ Configuration matches commitment')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Run reviewer’s job' }));
  } else if (id !== '01') {
    await user.click(screen.getByRole('button', { name: 'Replay inference' }));
  }
  if (id !== '01') expect(await screen.findByText('✓ DETERMINISTIC REPLAY CONFIRMED')).toBeInTheDocument();
  if (id === '03') {
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Advance epoch' }));
    expect(screen.getAllByText('SETTLED').length).toBeGreaterThan(0);
  }
  if (id === '04') await user.click(screen.getByRole('button', { name: 'Cross-check evidence source' }));
}

/** Plays one case through the whole loop: trust → inspect → verify → finding → trust → resolution. */
async function playCase(user: UserEvent, id: CaseId, { tryWrong = false, before = 80, after = 30 } = {}) {
  expect(screen.getByText(CONSOLE[id].output.decision)).toBeInTheDocument();
  await recordTrust(user, 'initial', before);
  await user.click(objectCard('EVIDENCE'));
  await investigate(user, id);
  if (id === '01') await solveCase01(user);
  else await answer(user, id, tryWrong);
  await recordTrust(user, 'final', after);
  expectResolution(id, before, after);
}

function expectResolution(id: CaseId, before: number, after: number) {
  expect(screen.getByRole('heading', { name: `Case ${id} resolved` })).toBeInTheDocument();
  const resolution = screen.getByRole('heading', { name: `Case ${id} resolved` }).closest('section')!;
  expect(resolution).toHaveTextContent(new RegExp(`INITIAL TRUST ${before}%\\s*AFTER VERIFICATION ${after}%`));
  const debrief = screen.getByRole('region', { name: 'Debrief' });
  for (const h of ['Why this matters', 'How BaranosAI helps', 'Your takeaway']) {
    expect(within(debrief).getByRole('heading', { name: h })).toBeInTheDocument();
  }
  expect(within(debrief).getByText(QUEST[id].lesson.takeaway)).toBeInTheDocument();
  expect(screen.getByText(CONSOLE[id].verdict.title)).toBeInTheDocument();
}

// ---------------------------------------------------------------- the architect studio

const field = (id: DraftField) => screen.getByLabelText(DRAFT_FIELDS.find((f) => f.id === id)!.label);

async function designSystem(user: UserEvent) {
  await user.type(field('title'), GOOD_DRAFT.title);
  await user.type(field('who'), GOOD_DRAFT.who);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.type(field('decides'), GOOD_DRAFT.decides);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.type(field('verifiable'), GOOD_DRAFT.verifiable);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.type(field('risks'), GOOD_DRAFT.risks);
  await user.click(screen.getByRole('button', { name: 'Preview system' }));
  expect(screen.getByRole('heading', { name: /Your verifiable AI system/ })).toBeInTheDocument();
}

const CERT_HEADING = 'Quest complete. You’ve earned your certificate.';

describe('entry', () => {
  it('asks a new participant for a certificate name, validates it, and opens Case 01 as an incoming decision', async () => {
    const user = userEvent.setup();
    renderApp('/');
    expect(screen.getByText('BARANOS // VERIFICATION SYSTEM')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your quest starts here.' })).toBeInTheDocument();
    expect(screen.getAllByText('To earn your certificate, complete all six cases and submit one use case of your own.').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/email|password/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Name on your certificate'), '    ');
    await user.click(screen.getByRole('button', { name: 'Start my quest' }));
    expect(screen.getByText(/Please enter a name for your certificate/)).toBeInTheDocument();
    expect(screen.getByLabelText('Name on your certificate')).toHaveFocus();
    expect(saved().profile).toBeNull();

    await user.clear(screen.getByLabelText('Name on your certificate'));
    await user.type(screen.getByLabelText('Name on your certificate'), '  Zoë 李  ');
    await user.type(screen.getByLabelText(/X handle/), '@zoe_learns');
    await user.click(screen.getByRole('button', { name: 'Start my quest' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Can you check the answer?' })).toBeInTheDocument();
    expect(screen.getByText(/INCOMING AI DECISION/)).toBeInTheDocument();
    expect(screen.getByText('STATUS: UNVERIFIED')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Clearance: OBSERVER/ })).toBeInTheDocument();
    expect(saved().profile).toEqual({ name: 'Zoë 李', xHandle: 'zoe_learns' });
  });

  it('keeps the intended destination when a case link is opened first, and explains the clearance lock', async () => {
    const user = userEvent.setup();
    renderApp('/case/02');
    expect(screen.getByRole('heading', { name: 'Your quest starts here.' })).toBeInTheDocument();
    await enterName(user, 'Sam');
    expect(window.location.pathname).toBe('/case/02');
    expect(screen.getByRole('heading', { name: 'This case unlocks later' })).toBeInTheDocument();
    expect(screen.getByText(/Requires ANALYST clearance/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Case 1' })).toHaveAttribute('href', '/case/01');
  });

  it('shows a returning participant the system dashboard: status, active case and system map', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v5WithCases(['01', '02'])));
    renderApp('/');
    const status = screen.getByLabelText('System status');
    expect(within(status).getByText('VERIFIER')).toBeInTheDocument();
    expect(within(status).getByText('02 / 06')).toBeInTheDocument();
    expect(screen.getByText(CONSOLE['03'].output.decision)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open case' })).toHaveAttribute('href', '/case/03');
    expect(screen.getByRole('heading', { name: 'SYSTEM MAP' })).toBeInTheDocument();
  });
});

describe('case console', () => {
  it('runs the full loop for Case 01: trust, inspect, BARA, flag the step, replay, trust again, clearance upgrade', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v5WithCases([], 'Ada')));
    renderApp('/case/01');

    // Nothing to investigate until initial trust is recorded.
    expect(screen.queryByRole('button', { name: /^EVIDENCE/ })).not.toBeInTheDocument();
    await recordTrust(user, 'initial', 85);
    expect(screen.getByText('STATUS: UNDER REVIEW')).toBeInTheDocument();

    // Observer clearance: the model and rules are locked, evidence is open.
    expect(objectCard('MODEL')).toBeDisabled();
    expect(objectCard('MODEL')).toHaveTextContent('REQUIRES ANALYST CLEARANCE');
    expect(screen.queryByRole('button', { name: 'Replay inference' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ASK BARA FOR A HINT' }));
    expect(screen.getByText('Open the evidence: those are the committed inputs.')).toBeInTheDocument();
    await user.click(objectCard('EVIDENCE'));
    expect(objectCard('EVIDENCE')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Those inputs were committed. Now check what was done with them.')).toBeInTheDocument();
    expect(systemLog().getByText('Opening inference record…')).toBeInTheDocument();

    // A wrong flag teaches without completing the case.
    await user.click(screen.getByRole('radio', { name: /Step 3/ }));
    await user.click(screen.getByRole('button', { name: 'Flag this step' }));
    expect(screen.getByText(/The problem starts earlier/)).toBeInTheDocument();
    expect(screen.getByText('That step follows the rule. Blame the first step that breaks it.')).toBeInTheDocument();
    expect(saved().passedChecks).toEqual([]);

    await solveCase01(user);
    expect(screen.getByText(/so the score is/)).toHaveTextContent('so the score is 23, not 25');
    expect(screen.getByText('STATUS: DIVERGENCE DETECTED')).toBeInTheDocument();
    expect(systemLog().getByText('Disputed step isolated')).toBeInTheDocument();
    expect(saved().passedChecks).toEqual(['01-replay']);

    await recordTrust(user, 'final', 20);
    expectResolution('01', 85, 20);
    expect(screen.getByText(CONSOLE['01'].trustInsight.down)).toBeInTheDocument();
    expect(screen.getByText(CONSOLE['01'].verdict.limit!)).toBeInTheDocument();
    expect(screen.getByText('✕ DISPUTED STEP ISOLATED · STEP 02')).toBeInTheDocument();
    const upgrade = screen.getByRole('region', { name: 'Clearance upgrade' });
    expect(upgrade).toHaveTextContent('OBSERVER → to ANALYST');
    expect(within(upgrade).getByText('+ Inspect model')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Clearance: ANALYST/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Next case' })).toHaveAttribute('href', '/case/02');
  });

  it('Case 02: a swapped model or evidence breaks the match, visibly; the committed setup reproduces', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v5WithCases(['01'])));
    renderApp('/case/02');
    await recordTrust(user, 'initial', 60);
    expect(objectCard('MODEL')).toBeEnabled(); // Analyst can inspect the model
    await user.click(objectCard('MODEL'));
    expect(screen.queryByRole('button', { name: 'Replay inference' })).not.toBeInTheDocument();

    expect(screen.getByText('⚠ Not the committed job')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Run reviewer’s job' }));
    expect(systemLog().getByText('Verification divergence detected: different task')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Swap model → r3' }));
    expect(systemLog().getByText('Model hash confirmed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Swap model → r4' }));
    expect(systemLog().getByText('⚠ Model hash no longer matches')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Swap model → r3' }));
    await user.click(screen.getByRole('button', { name: 'Swap evidence → v1' }));
    await user.click(screen.getByRole('button', { name: 'Randomness off' }));
    expect(screen.getByText('✓ Configuration matches commitment')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Run reviewer’s job' }));
    expect(await screen.findByText('✓ DETERMINISTIC REPLAY CONFIRMED')).toBeInTheDocument();
    expect(systemLog().getByText('Deterministic replay confirmed')).toBeInTheDocument();

    await answer(user, '02', true);
    await recordTrust(user, 'final', 75);
    expectResolution('02', 60, 75);
    expect(screen.getByRole('region', { name: 'Clearance upgrade' })).toHaveTextContent('ANALYST → to VERIFIER');
  });

  it('Case 04: computation verified, but evidence quality stays disputed (verified ≠ correct)', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v5WithCases(['01', '02', '03'])));
    renderApp('/case/04');
    await recordTrust(user, 'initial', 50);
    await user.click(objectCard('EVIDENCE'));
    // The finding needs a replay and a source check first.
    expect(screen.getByText('Replay and cross-check the source to submit a finding.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cross-check evidence source' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Replay inference' }));
    expect(await screen.findByText('✓ DETERMINISTIC REPLAY CONFIRMED')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cross-check evidence source' }));
    expect(screen.getByText('households 9 · signed final · 15 Jun ⚠')).toBeInTheDocument();
    expect(screen.getByText('STATUS: CHALLENGED')).toBeInTheDocument();
    await answer(user, '04', false);
    await recordTrust(user, 'final', 50);
    expectResolution('04', 50, 50);
    expect(screen.getByText('COMPUTATION VERIFIED')).toBeInTheDocument();
    expect(screen.getByText(/Evidence quality remains disputed/)).toBeInTheDocument();
    expect(screen.getByText(CONSOLE['04'].trustInsight.same)).toBeInTheDocument();
  });

  it('opens more of the system when a case is revisited at a higher clearance', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v5CasesDone()));
    renderApp('/case/01');
    await recordTrust(user, 'initial', 50);
    expect(objectCard('MODEL')).toBeEnabled();
    expect(objectCard('RULES')).toBeEnabled();
  });

  it('takes a new participant through all six cases, keeps progress across a reload, then opens design mode', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await enterName(user, 'Maximiliana Alexandrina Konstantinopoulou-Vanderbilt');
    for (const id of CASE_IDS) {
      if (id === '04') {
        // Reload mid-quest: progress is kept and the dashboard points at the next case.
        reload('/');
        expect(within(screen.getByLabelText('System status')).getByText('03 / 06')).toBeInTheDocument();
        await user.click(screen.getByRole('link', { name: 'Open case' }));
      } else if (id !== '01') await user.click(screen.getByRole('link', { name: 'Next case' }));
      expect(window.location.pathname).toBe(`/case/${id}`);
      await playCase(user, id, { tryWrong: id === '06' });
    }
    expect(saved().passedChecks.length).toBeGreaterThan(6);
    const pending = screen.getByRole('region', { name: 'Clearance upgrade' });
    expect(pending).toHaveTextContent('Access pending');
    expect(pending).toHaveTextContent('CHALLENGER → to PROTOCOL ARCHITECT');
    expect(screen.getByText('You’ve inspected, verified and challenged AI decisions. Now design one.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'See my certificate' })).not.toBeInTheDocument();
    expect(saved().certificate).toBeNull();

    const server = mockServer(200);
    await user.click(screen.getByRole('link', { name: 'Create my use case' }));
    expect(screen.getByText('PROTOCOL ARCHITECT // DESIGN MODE')).toBeInTheDocument();
    await designSystem(user);
    await user.click(screen.getByRole('button', { name: 'Submit use case' }));

    expect(await screen.findByRole('heading', { name: CERT_HEADING })).toBeInTheDocument();
    expect(screen.getByText(/PROTOCOL ARCHITECT CLEARANCE GRANTED/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Clearance: PROTOCOL ARCHITECT/ })).toBeInTheDocument();
    expect(server.calls).toHaveLength(1);
    const sent = server.calls[0];
    expect(sent.get('form-name')).toBe('use-case');
    expect(sent.get('displayName')).toBe('Maximiliana Alexandrina Konstantinopoulou-Vanderbilt');
    expect(sent.get('whoAndWhat')).toBe(GOOD_ANSWERS.whoAndWhat);
    expect(sent.get('whyVerify')).toBe(GOOD_ANSWERS.whyVerify);
    expect(sent.get('curriculumVersion')).toBe('3.2');
    for (const control of ['Download certificate — PDF', 'Download certificate — PNG', 'Share achievement on X']) {
      expect(screen.getByRole('button', { name: control })).toBeInTheDocument();
    }
    reload('/certificate');
    expect(screen.getByRole('heading', { name: CERT_HEADING })).toBeInTheDocument();
    expect(server.fetchMock).toHaveBeenCalledTimes(1);
  }, 60000);

  it('resumes Case 06 at the next unanswered question for an older save', async () => {
    const user = userEvent.setup();
    const checks = ['01-replay', '02-same-task', '03-settled', '04-evidence', '05-injection'];
    const at = new Date().toISOString();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        profile: { name: 'Rin' },
        passedChecks: [...checks, '06-review-reproduce'],
        cases: Object.fromEntries(['01', '02', '03', '04', '05'].map((id) => [id, { completedAt: at }])),
        certificate: null,
      }),
    );
    renderApp('/case/06');
    await recordTrust(user, 'initial', 50);
    await user.click(objectCard('EVIDENCE'));
    await investigate(user, '06');
    expect(screen.getByText(/already covers 1 of these 3 questions/)).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
    await answer(user, '06', false);
    await recordTrust(user, 'final', 50);
    expectResolution('06', 50, 50);
  });
});

describe('certificate access', () => {
  it('does not unlock an unearned certificate from a direct link', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, profile: { name: 'Kai' }, passedChecks: ['01-replay'], cases: { '01': { completedAt: new Date().toISOString() } }, certificate: { completedAt: new Date().toISOString() } }),
    );
    renderApp('/certificate');
    expect(screen.getByRole('heading', { name: 'Your certificate isn’t ready yet' })).toBeInTheDocument();
    expect(screen.getByText('Case 6: Your final investigation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue quest' })).toHaveAttribute('href', '/case/02');
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument();
  });

  it('asks for a name before showing the certificate route', () => {
    renderApp('/certificate');
    expect(screen.getByRole('heading', { name: 'Your quest starts here.' })).toBeInTheDocument();
  });
});

describe('existing participants', () => {
  it('provide a name once, keep their progress and answer only the new final-review question', async () => {
    const user = userEvent.setup();
    const at = (d: number) => new Date(Date.UTC(2026, 8, d)).toISOString();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        cases: Object.fromEntries(CASE_IDS.map((id, i) => [id, { completedAt: at(20 + i), justified: 1, decisions: 2 }])),
        notebook: [],
        achievements: [],
      }),
    );
    renderApp('/');
    expect(screen.getByRole('heading', { name: 'Welcome back to your quest.' })).toBeInTheDocument();
    expect(screen.getByText(/5 cases completed/)).toBeInTheDocument();
    await enterName(user, 'Lee', 'Continue my quest');

    expect(window.location.pathname).toBe('/case/06');
    await recordTrust(user, 'initial', 50);
    await user.click(objectCard('EVIDENCE'));
    await investigate(user, '06');
    expect(screen.getByText(/already covers 2 of these 3 questions, so there is just 1 new question/)).toBeInTheDocument();
    await answer(user, '06', true);
    await recordTrust(user, 'final', 50);
    expect(saved().cases['01'].completedAt).toBe(at(20));
    await user.click(screen.getByRole('link', { name: 'Create my use case' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Your idea for verifiable AI' })).toBeInTheDocument();
  });
});

describe('protocol architect studio', () => {
  const ready = (draft = GOOD_DRAFT) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v5CasesDone(draft)));
  const submit = (user: UserEvent) => user.click(screen.getByRole('button', { name: 'Submit use case' }));

  it('is only open after the six cases', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v5WithCases(['01'])));
    renderApp('/use-case');
    expect(screen.getByRole('heading', { name: 'Solve the six cases first' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
  });

  it('asks four short questions one at a time, validates each step and keeps the draft across reloads', async () => {
    const user = userEvent.setup();
    const server = mockServer(200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v5CasesDone()));
    renderApp('/use-case');
    expect(screen.getByText('You’ve inspected, verified and challenged AI decisions. Now design one.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Who needs the AI\?/ })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
    expect(screen.queryByLabelText(/Name on your certificate|X handle/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getAllByText('Please add a short answer in your own words.')).toHaveLength(2);
    await waitFor(() => expect(field('title')).toHaveFocus());

    await user.type(field('title'), 'Honest harbour');
    await user.type(field('who'), DRAFT_FIELDS[1].example);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('That’s the example. Please describe your own idea.')).toBeInTheDocument();
    await user.clear(field('who'));
    await user.type(field('who'), 'Boat owners.');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { level: 2, name: /What does the AI decide\?/ })).toHaveFocus();
    await user.type(field('decides'), 'It ranks berth requests.');

    // Reload: the draft is kept and the studio resumes at the first unfinished step.
    reload('/use-case');
    expect(screen.getByRole('heading', { level: 2, name: /What should be verifiable\?/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(field('decides')).toHaveValue('It ranks berth requests.');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(field('title')).toHaveValue('Honest harbour');
    expect(server.fetchMock).not.toHaveBeenCalled();
  });

  it('previews the design as a system card with edit links', async () => {
    const user = userEvent.setup();
    ready();
    renderApp('/use-case');
    expect(screen.getByRole('heading', { name: /Your verifiable AI system/ })).toBeInTheDocument();
    expect(screen.getByText('✓ COMMITTED & VERIFIABLE')).toBeInTheDocument();
    expect(screen.getByText('⚠ STILL AT RISK')).toBeInTheDocument();
    expect(screen.getByText(GOOD_DRAFT.risks)).toBeInTheDocument();
    expect(screen.getByText(/Submitting as/)).toHaveTextContent('Submitting as Rin, from your certificate details.');
    expect(screen.getByText(/Submitting sends your certificate name/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit: What could still go wrong?' }));
    expect(field('risks')).toHaveValue(GOOD_DRAFT.risks);
  });

  it('splits a three-field draft into the four steps, keeps a backup and submits the same text', async () => {
    const user = userEvent.setup();
    const server = mockServer(200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v4WithDraft()));
    renderApp('/use-case');
    expect(screen.getByText(/Your earlier answers have been placed into these steps/)).toBeInTheDocument();
    expect(saved().useCase.threeFieldDraft).toEqual(THREE_FIELD);
    await submit(user);
    expect(await screen.findByRole('heading', { name: CERT_HEADING })).toBeInTheDocument();
    expect(server.calls[0].get('whoAndWhat')).toBe(THREE_FIELD.whoAndWhat);
    expect(server.calls[0].get('whyVerify')).toBe(THREE_FIELD.whyVerify);
  });

  it('migrates a five-step draft, keeps a backup, and submits the combined text', async () => {
    const user = userEvent.setup();
    const server = mockServer(200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v3WithDraft()));
    renderApp('/use-case');
    expect(screen.getByText(/Your earlier answers have been placed into these steps/)).toBeInTheDocument();
    expect(saved().useCase.legacyDraft).toEqual(LEGACY_DRAFT);
    expect(saved().profile).toEqual({ name: 'Rin' });
    await submit(user);
    expect(await screen.findByRole('heading', { name: CERT_HEADING })).toBeInTheDocument();
    const sent = server.calls[0];
    expect(sent.get('title')).toBe(LEGACY_DRAFT.title);
    expect(sent.get('whoAndWhat')).toBe(`${LEGACY_DRAFT.problem}\n\n${LEGACY_DRAFT.aiRole}`);
    expect(sent.get('whyVerify')).toBe(`${LEGACY_DRAFT.whyVerify}\n\n${LEGACY_DRAFT.agreedRules}\n\n${LEGACY_DRAFT.risks}`);
    expect(sent.has('problem')).toBe(false);
    expect(sent.has('concepts')).toBe(false);
  });

  it('explains a 404 as submissions not being set up, keeps answers and the lock, then succeeds on retry with the same ID', async () => {
    const user = userEvent.setup();
    ready();
    const server = mockServer(404, 500, 'offline', 200);
    renderApp('/use-case');

    await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Use-case submissions aren’t switched on for this site yet, so your certificate stays locked for now. Your draft is saved in this browser, so nothing is lost.',
    );
    expect(saved().useCase.submission).toBeNull();
    expect(saved().certificate).toBeNull();
    expect(saved().useCase.draft).toEqual(GOOD_DRAFT);

    await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t save your use case \(error 500\).*nothing is lost/);
    await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t reach the server/);
    reload('/certificate');
    expect(screen.getByRole('heading', { name: 'One final step: submit your own use case to earn your certificate.' })).toBeInTheDocument();
    expect(screen.queryByText(/PROTOCOL ARCHITECT CLEARANCE GRANTED/)).not.toBeInTheDocument();

    reload('/use-case');
    await submit(user);
    expect(await screen.findByRole('heading', { name: CERT_HEADING })).toBeInTheDocument();
    const ids = server.calls.map((c) => c.get('submissionId'));
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(1);
    expect(saved().useCase.submission.id).toBe(ids[0]);
  });

  it('shows “Submitting…” and ignores repeated clicks while a submission is in progress', async () => {
    const user = userEvent.setup();
    ready();
    let release!: (r: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => (release = resolve)));
    vi.stubGlobal('fetch', fetchMock);
    renderApp('/use-case');
    await submit(user);
    const busy = screen.getByRole('button', { name: 'Submitting…' });
    expect(busy).toBeDisabled();
    await user.click(busy);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    release(new Response(`<main ${RECEIVED_MARKER}></main>`, { status: 200 }));
    expect(await screen.findByRole('heading', { name: CERT_HEADING })).toBeInTheDocument();
  });

  it('shows the submitted case study and makes sharing optional and editable', async () => {
    const user = userEvent.setup();
    mockServer(200);
    ready();
    renderApp('/use-case');
    await submit(user);
    await screen.findByRole('heading', { name: CERT_HEADING });

    expect(screen.queryByRole('textbox', { name: 'Your post' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Share achievement on X' }));
    const post = screen.getByRole('textbox', { name: 'Your post' });
    expect(post).toHaveValue(
      `I completed the BaranosAI Educational Quest and explored how verifiable AI could help with ${GOOD_DRAFT.title}.\nSix cases, a use case of my own, and a better understanding of why checking AI computation matters.\nTry the quest: https://baranosaieducationalquest.netlify.app/`,
    );
    await user.clear(post);
    await user.type(post, 'My own words');
    expect(screen.getByRole('link', { name: /Open X with this text/ })).toHaveAttribute('href', 'https://x.com/intent/post?text=My%20own%20words');

    await user.click(screen.getByRole('link', { name: 'View my submitted case study' }));
    expect(screen.getByRole('heading', { name: 'Your submitted case study' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: GOOD_DRAFT.title })).toBeInTheDocument();
    expect(screen.getByText(GOOD_DRAFT.risks, { exact: false })).toBeInTheDocument();
  });

  it('keeps an earlier six-case certificate and asks existing finishers only for the use case', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v2FinishedSave('Lee')));
    renderApp('/certificate');
    expect(screen.getByRole('heading', { name: 'One final step: submit your own use case to earn your certificate.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your earlier certificate' })).toBeInTheDocument();
    expect(screen.getByText(/You earned this on 24 September 2026/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download earlier certificate — PNG' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Create my use case' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Your idea for verifiable AI' })).toBeInTheDocument();
  });
});

describe('reset', () => {
  it('needs confirmation and keeps the certificate name', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, profile: { name: 'Noor' }, passedChecks: ['01-replay'], cases: { '01': { completedAt: new Date().toISOString() } }, certificate: null }),
    );
    renderApp('/summary');
    await user.click(screen.getByRole('button', { name: 'Reset progress…' }));
    expect(saved().passedChecks).toEqual(['01-replay']);
    await user.click(screen.getByRole('button', { name: 'Yes, remove my progress' }));
    expect(saved()).toMatchObject({ profile: { name: 'Noor' }, passedChecks: [], cases: {} });
  });
});
