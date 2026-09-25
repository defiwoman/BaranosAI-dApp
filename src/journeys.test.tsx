import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { renderApp } from './test/renderApp';
import { STORAGE_KEY } from './adapters/storage';
import { RECEIVED_MARKER } from './adapters/submission';
import { QUEST } from './content/quest';
import { CASE_IDS, type CaseId } from './domain/types';
import { USE_CASE_FIELDS } from './domain/useCase';
import { GOOD_DRAFT, v2FinishedSave, v3CasesDone } from './test/fixtures';

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

async function fillUseCase(user: UserEvent) {
  const byId = (id: string) => USE_CASE_FIELDS.find((f) => f.id === id)!.label;
  await user.type(screen.getByLabelText(byId('title')), GOOD_DRAFT.title);
  await user.type(screen.getByLabelText(byId('problem')), GOOD_DRAFT.problem);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.type(screen.getByLabelText(byId('aiRole')), GOOD_DRAFT.aiRole);
  await user.type(screen.getByLabelText(byId('whyVerify')), GOOD_DRAFT.whyVerify);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.type(screen.getByLabelText(byId('agreedRules')), GOOD_DRAFT.agreedRules);
  await user.type(screen.getByLabelText(byId('risks')), GOOD_DRAFT.risks);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('checkbox', { name: /Challenging and replaying a disputed step/ }));
  await user.click(screen.getByRole('checkbox', { name: /Verified execution is not verified truth/ }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
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

async function solveCase01(user: UserEvent) {
  await user.click(screen.getByRole('radio', { name: /Step 2/ }));
  await user.click(screen.getByRole('button', { name: 'Challenge this step' }));
  await user.click(screen.getByRole('button', { name: 'Replay this step' }));
}

/** Answers whichever questions the case shows, in order, optionally trying a wrong option first. */
async function answer(user: UserEvent, id: CaseId, tryWrong: boolean) {
  for (;;) {
    const q = QUEST[id].questions.find((x) => screen.queryByText(x.prompt) && screen.queryByRole('button', { name: 'Check my answer' }));
    if (!q) return;
    if (tryWrong) {
      const wrong = q.options.find((o) => !o.correct)!;
      await user.click(screen.getByRole('radio', { name: wrong.label }));
      await user.click(screen.getByRole('button', { name: 'Check my answer' }));
      expect(screen.getByText(wrong.feedback)).toBeInTheDocument();
      expect(screen.getByText(/try as many times as you like/)).toBeInTheDocument();
      expect(saved().passedChecks).not.toContain(q.id);
    }
    const right = q.options.find((o) => o.correct)!;
    await user.click(screen.getByRole('radio', { name: right.label }));
    await user.click(screen.getByRole('button', { name: 'Check my answer' }));
    expect(screen.getByText(right.feedback)).toBeInTheDocument();
    const next = screen.queryByRole('button', { name: 'Next question' });
    if (!next) return;
    await user.click(next);
  }
}

function expectLesson(id: CaseId) {
  const lesson = screen.getByRole('region', { name: /Case solved/ });
  for (const h of ['Why this matters', 'How BaranosAI helps', 'Your takeaway']) {
    expect(within(lesson).getByRole('heading', { name: h })).toBeInTheDocument();
  }
  expect(within(lesson).getByText(QUEST[id].lesson.takeaway)).toBeInTheDocument();
  expect(within(lesson).getByText('Explore further')).toBeInTheDocument();
}

describe('entry form', () => {
  it('asks a new participant for a certificate name, validates it, and starts Case 1', async () => {
    const user = userEvent.setup();
    renderApp('/');
    expect(screen.getByRole('heading', { name: 'Your quest starts here.' })).toBeInTheDocument();
    expect(screen.getByText('Your name and progress are saved in this browser so you can return to your quest.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/email|password/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Name on your certificate'), '    ');
    await user.click(screen.getByRole('button', { name: 'Start my quest' }));
    expect(screen.getByText(/Please enter a name for your certificate/)).toBeInTheDocument();
    expect(screen.getByLabelText('Name on your certificate')).toHaveFocus();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(saved()));
    expect(saved().profile).toBeNull();

    await user.clear(screen.getByLabelText('Name on your certificate'));
    await user.type(screen.getByLabelText('Name on your certificate'), '  Zoë 李  ');
    await user.type(screen.getByLabelText(/X handle/), '@zoe_learns');
    await user.click(screen.getByRole('button', { name: 'Start my quest' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Can you check the answer?' })).toBeInTheDocument();
    expect(screen.getByText('Case 1 of 6')).toBeInTheDocument();
    expect(saved().profile).toEqual({ name: 'Zoë 李', xHandle: 'zoe_learns' });
  });

  it('keeps the intended destination when a case link is opened first', async () => {
    const user = userEvent.setup();
    renderApp('/case/02');
    expect(screen.getByRole('heading', { name: 'Your quest starts here.' })).toBeInTheDocument();
    await enterName(user, 'Sam');
    expect(window.location.pathname).toBe('/case/02');
    expect(screen.getByRole('heading', { level: 1, name: 'Are we checking the same task?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'This case unlocks later' })).toBeInTheDocument();
  });
});

describe('cases', () => {
  it('teaches through wrong answers without completing the case', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await enterName(user, 'Ada');
    await user.click(screen.getByRole('button', { name: /Accept the score of/ }));
    expect(screen.getByText(/Check each step against the agreed rule/)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Step 3/ }));
    await user.click(screen.getByRole('button', { name: 'Challenge this step' }));
    expect(screen.getByText(/The problem starts earlier/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show a hint' }));
    expect(screen.getByText('Check the two multiplications first.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Case solved/ })).not.toBeInTheDocument();
    expect(saved().passedChecks).toEqual([]);

    await solveCase01(user);
    expect(screen.getByText(/so the score is/)).toHaveTextContent('so the score is 23, not 25');
    expectLesson('01');
    expect(saved().passedChecks).toEqual(['01-replay']);
  });

  it('takes a new participant through all six cases to the certificate, and survives a reload', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await enterName(user, 'Maximiliana Alexandrina Konstantinopoulou-Vanderbilt');
    await solveCase01(user);
    expectLesson('01');

    for (const id of CASE_IDS.slice(1)) {
      await user.click(screen.getByRole('link', { name: 'Next case' }));
      expect(screen.getByText(`Case ${Number(id)} of 6`)).toBeInTheDocument();
      expect(screen.getByText(QUEST[id].task)).toBeInTheDocument();
      await answer(user, id, id === '02' || id === '06');
      expectLesson(id);
      if (id === '03') {
        // Reload mid-quest: progress is kept.
        reload('/case/03');
        expect(screen.getByText('3 cases completed')).toBeInTheDocument();
        expectLesson('03');
      }
    }

    // Six cases alone do not earn the certificate.
    expect(screen.getByText('You’ve solved the cases. Now it’s your turn to imagine what BaranosAI could make possible.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'See my certificate' })).not.toBeInTheDocument();
    expect(saved().certificate).toBeNull();
    reload('/certificate');
    expect(screen.getByRole('heading', { name: 'One final step: submit your own use case to earn your certificate.' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument();

    const server = mockServer(200);
    await user.click(screen.getByRole('link', { name: 'Create my use case' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Your idea for verifiable AI' })).toBeInTheDocument();
    await fillUseCase(user);
    expect(screen.getByText(/Submitting sends your certificate name/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit and unlock my certificate' }));

    expect(await screen.findByRole('heading', { name: 'Quest complete. You’ve earned your certificate.' })).toBeInTheDocument();
    expect(screen.getByText('You explored verifiable AI, solved all six cases, and developed a use case of your own.')).toBeInTheDocument();
    expect(server.calls).toHaveLength(1);
    expect(server.calls[0].get('form-name')).toBe('use-case');
    expect(server.calls[0].get('displayName')).toBe('Maximiliana Alexandrina Konstantinopoulou-Vanderbilt');
    expect(server.calls[0].get('curriculumVersion')).toBe('3');
    for (const control of ['Download certificate — PDF', 'Download certificate — PNG', 'Share achievement on X']) {
      expect(screen.getByRole('button', { name: control })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'View my submitted case study' })).toBeInTheDocument();
    const completedAt = saved().certificate.completedAt;
    expect(saved().useCase.submission.answers.title).toBe(GOOD_DRAFT.title);

    // Correct the name: the completion date stays the same.
    await user.click(screen.getByRole('button', { name: 'Correct the name' }));
    const field = screen.getByLabelText('Name on your certificate');
    await user.clear(field);
    await user.type(field, 'Max K.');
    await user.click(screen.getByRole('button', { name: 'Update certificate' }));
    expect(saved().profile.name).toBe('Max K.');
    expect(saved().certificate.completedAt).toBe(completedAt);

    // Reloading keeps the certificate without another submission.
    reload('/certificate');
    expect(screen.getByRole('heading', { name: 'Quest complete. You’ve earned your certificate.' })).toBeInTheDocument();
    expect(server.fetchMock).toHaveBeenCalledTimes(1);
    reload('/summary');
    expect(screen.getByRole('link', { name: 'View my certificate' })).toBeInTheDocument();
  }, 30000);

  it('resumes the final review at the next unanswered question after a reload', async () => {
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
    expect(screen.getByText(/already covers 1 of these 3 questions/)).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
    expect(screen.queryByText(QUEST['06'].questions[0].prompt)).not.toBeInTheDocument();
    await answer(user, '06', false);
    expectLesson('06');
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
    expect(screen.getByText(/already covers 2 of these 3 questions, so there is just 1 new question/)).toBeInTheDocument();
    await answer(user, '06', true);
    expectLesson('06');
    expect(saved().cases['01'].completedAt).toBe(at(20));
    await user.click(screen.getByRole('link', { name: 'Create my use case' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Your idea for verifiable AI' })).toBeInTheDocument();
  });
});

describe('use case', () => {
  it('explains the requirement before the quest starts', () => {
    renderApp('/');
    expect(screen.getByText('To earn your certificate, complete all six cases and submit one use case of your own.')).toBeInTheDocument();
  });

  it('is only open after the six cases', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...v3CasesDone(), passedChecks: ['01-replay'], cases: { '01': { completedAt: new Date().toISOString() } } }));
    renderApp('/use-case');
    expect(screen.getByRole('heading', { name: 'Solve the six cases first' })).toBeInTheDocument();
  });

  it('rejects empty, whitespace-only and example answers, and keeps the draft across reloads and navigation', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v3CasesDone()));
    renderApp('/use-case');
    const title = USE_CASE_FIELDS[0];
    const problem = USE_CASE_FIELDS[1];

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getAllByText('Please add a short answer in your own words.')).toHaveLength(2);
    await waitFor(() => expect(screen.getByLabelText(title.label)).toHaveFocus());

    await user.type(screen.getByLabelText(title.label), '    ');
    await user.type(screen.getByLabelText(problem.label), problem.example);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Please add a short answer in your own words.')).toBeInTheDocument();
    expect(screen.getByText('That’s the example. Please describe your own idea.')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();

    await user.clear(screen.getByLabelText(title.label));
    await user.type(screen.getByLabelText(title.label), 'Honest harbour');
    await user.clear(screen.getByLabelText(problem.label));
    await user.type(screen.getByLabelText(problem.label), 'Boat owners who need fair berths.');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByLabelText(USE_CASE_FIELDS[2].label), 'Ranks berth requests by rules.');

    // Reload: the draft and the step survive.
    reload('/use-case');
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
    expect(screen.getByLabelText(USE_CASE_FIELDS[2].label)).toHaveValue('Ranks berth requests by rules.');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText(title.label)).toHaveValue('Honest harbour');

    // Navigate away (to a lesson) and back: still there.
    await user.click(screen.getByRole('link', { name: 'Cases' }));
    await user.click(screen.getByRole('link', { name: 'Progress' }));
    await user.click(screen.getByRole('link', { name: 'Create my use case' }));
    expect(screen.getByLabelText(title.label)).toHaveValue('Honest harbour');
  });

  it('keeps answers and the lock when submission fails, then succeeds on retry without a new ID', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...v3CasesDone(), useCase: { draft: GOOD_DRAFT, step: 4, submissionId: null, submission: null } }));
    const server = mockServer(500, 'offline', 200);
    renderApp('/use-case');
    expect(screen.getByText(GOOD_DRAFT.risks)).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: 'Submit and unlock my certificate' });
    await user.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent(/error 500.*answers are saved/);
    expect(saved().useCase.submission).toBeNull();
    expect(saved().certificate).toBeNull();
    expect(saved().useCase.draft).toEqual(GOOD_DRAFT);

    await user.click(screen.getByRole('button', { name: 'Submit and unlock my certificate' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t reach the server/);
    reload('/certificate');
    expect(screen.getByRole('heading', { name: 'One final step: submit your own use case to earn your certificate.' })).toBeInTheDocument();

    reload('/use-case');
    await user.click(screen.getByRole('button', { name: 'Submit and unlock my certificate' }));
    expect(await screen.findByRole('heading', { name: 'Quest complete. You’ve earned your certificate.' })).toBeInTheDocument();
    const ids = server.calls.map((c) => c.get('submissionId'));
    expect(new Set(ids).size).toBe(1);
    expect(saved().useCase.submission.id).toBe(ids[0]);
  });

  it('ignores repeated clicks while a submission is in progress', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...v3CasesDone(), useCase: { draft: GOOD_DRAFT, step: 4, submissionId: null, submission: null } }));
    let release!: (r: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => (release = resolve)));
    vi.stubGlobal('fetch', fetchMock);
    renderApp('/use-case');
    await user.click(screen.getByRole('button', { name: 'Submit and unlock my certificate' }));
    const busy = screen.getByRole('button', { name: 'Submitting…' });
    expect(busy).toBeDisabled();
    await user.click(busy);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    release(new Response(`<main ${RECEIVED_MARKER}></main>`, { status: 200 }));
    expect(await screen.findByRole('heading', { name: 'Quest complete. You’ve earned your certificate.' })).toBeInTheDocument();
  });

  it('lets the participant edit from the preview', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...v3CasesDone(), useCase: { draft: GOOD_DRAFT, step: 4, submissionId: null, submission: null } }));
    renderApp('/use-case');
    await user.click(screen.getByRole('button', { name: `Edit: ${USE_CASE_FIELDS[0].label}` }));
    const title = screen.getByLabelText(USE_CASE_FIELDS[0].label);
    await user.clear(title);
    await user.type(title, 'Clearer berths');
    await user.click(screen.getByRole('button', { name: 'Save and return to review' }));
    expect(screen.getByText('Step 5 of 5')).toBeInTheDocument();
    expect(screen.getByText('Clearer berths')).toBeInTheDocument();
  });

  it('shows the submitted case study and makes sharing optional and editable', async () => {
    const user = userEvent.setup();
    mockServer(200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...v3CasesDone(), useCase: { draft: GOOD_DRAFT, step: 4, submissionId: null, submission: null } }));
    renderApp('/use-case');
    await user.click(screen.getByRole('button', { name: 'Submit and unlock my certificate' }));
    await screen.findByRole('heading', { name: 'Quest complete. You’ve earned your certificate.' });

    expect(screen.queryByRole('textbox', { name: 'Your post' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Share achievement on X' }));
    const post = screen.getByRole('textbox', { name: 'Your post' });
    expect(post).toHaveValue(
      `I completed the BaranosAI Educational Quest and explored how verifiable AI could help with ${GOOD_DRAFT.title}.\nSix cases, a use case of my own, and a better understanding of why checking AI computation matters.\nTry the quest: https://baranosaieducationalquest.netlify.app/`,
    );
    await user.clear(post);
    await user.type(post, 'My own words');
    expect(screen.getByRole('link', { name: /Open X with this text/ })).toHaveAttribute('href', 'https://x.com/intent/post?text=My%20own%20words');
    expect(screen.getByText(/download the certificate PNG above, then attach it/)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'View my submitted case study' }));
    expect(screen.getByRole('heading', { name: 'Your submitted case study' })).toBeInTheDocument();
    expect(screen.getByText(GOOD_DRAFT.whyVerify)).toBeInTheDocument();
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
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
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
