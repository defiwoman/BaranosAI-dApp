import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { renderApp } from './test/renderApp';
import { STORAGE_KEY } from './adapters/storage';
import { QUEST } from './content/quest';
import { CASE_IDS, type CaseId } from './domain/types';

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

    await user.click(screen.getByRole('link', { name: 'See my certificate' }));
    expect(screen.getByRole('heading', { name: 'Quest complete. Your certificate is ready.' })).toBeInTheDocument();
    expect(screen.getByText('You followed the evidence, challenged the results, and completed all six cases.')).toBeInTheDocument();
    for (const control of ['Download PDF', 'Download PNG', 'Print', 'Copy message for X']) {
      expect(screen.getByRole('button', { name: control })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Revisit the lessons' })).toBeInTheDocument();
    const completedAt = saved().certificate.completedAt;

    // Correct the name: the completion date stays the same.
    await user.click(screen.getByRole('button', { name: 'Correct the name' }));
    const field = screen.getByLabelText('Name on your certificate');
    await user.clear(field);
    await user.type(field, 'Max K.');
    await user.click(screen.getByRole('button', { name: 'Update certificate' }));
    expect(saved().profile.name).toBe('Max K.');
    expect(saved().certificate.completedAt).toBe(completedAt);

    reload('/certificate');
    expect(screen.getByRole('heading', { name: 'Quest complete. Your certificate is ready.' })).toBeInTheDocument();
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

describe('existing participants (saved by the first release)', () => {
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
    await user.click(screen.getByRole('link', { name: 'See my certificate' }));
    expect(screen.getByRole('heading', { name: 'Quest complete. Your certificate is ready.' })).toBeInTheDocument();
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
