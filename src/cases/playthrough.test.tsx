import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { renderApp } from '../test/renderApp';
import { STORAGE_KEY } from '../adapters/storage';
import { CASE02 } from '../content/case02';
import { CASE03 } from '../content/case03';
import { CASE04 } from '../content/case04';
import { CASE05 } from '../content/case05';
import { CASE06 } from '../content/case06';
import type { StagedCaseContent } from '../content/types';

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!);

async function solveCase01(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Inspect the submitted work' }));
  await user.click(screen.getByRole('radio', { name: /Step 2/ }));
  await user.click(screen.getByRole('button', { name: 'Challenge this step' }));
  await user.click(screen.getByRole('button', { name: 'Replay selected step' }));
}

/** Solves the current stage; optionally tries a wrong answer first and checks its specific feedback. */
async function solveStage(user: UserEvent, content: StagedCaseContent, index: number, tryWrong: boolean) {
  const task = content.stages[index].task;
  if (task.kind === 'choice') {
    if (tryWrong) {
      const wrong = task.options.find((o) => !o.correct)!;
      await user.click(screen.getByRole('radio', { name: wrong.label }));
      await user.click(screen.getByRole('button', { name: 'Submit decision' }));
      expect(screen.getByText(wrong.feedback)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
    }
    const right = task.options.find((o) => o.correct)!;
    await user.click(screen.getByRole('radio', { name: right.label }));
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));
    expect(screen.getByText(right.feedback)).toBeInTheDocument();
  } else {
    const groups = screen.getAllByRole('group');
    expect(groups).toHaveLength(task.items.length);
    if (tryWrong) {
      const item = task.items[0];
      const wrongCat = task.categories.find((c) => c.id !== item.answer)!;
      await user.click(within(groups[0]).getByRole('radio', { name: wrongCat.label }));
    }
    for (const [i, item] of task.items.entries()) {
      if (tryWrong && i === 0) continue;
      const cat = task.categories.find((c) => c.id === item.answer)!;
      await user.click(within(groups[i]).getByRole('radio', { name: cat.label }));
    }
    await user.click(screen.getByRole('button', { name: 'Check placement' }));
    if (tryWrong) {
      const item = task.items[0];
      const wrongCat = task.categories.find((c) => c.id !== item.answer)!;
      expect(screen.getByText(item.feedback[wrongCat.id])).toBeInTheDocument();
      const cat = task.categories.find((c) => c.id === item.answer)!;
      await user.click(within(screen.getAllByRole('group')[0]).getByRole('radio', { name: cat.label }));
      await user.click(screen.getByRole('button', { name: 'Check placement' }));
    }
    expect(screen.getByText(task.success)).toBeInTheDocument();
  }
  await user.click(screen.getByRole('button', { name: 'Continue' }));
}

async function solveStaged(user: UserEvent, content: StagedCaseContent, tryWrong = false) {
  for (let i = 0; i < content.stages.length; i++) await solveStage(user, content, i, tryWrong);
  expect(within(screen.getByRole('region', { name: 'Resolution' })).getByText(content.resolution.verdict.label)).toBeInTheDocument();
}

describe('the full adventure', () => {
  it('lets a new player finish all six cases in order, then review and replay without duplicating achievements', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('link', { name: 'Open the first case' }));
    await solveCase01(user);

    const staged = [CASE02, CASE03, CASE04, CASE05, CASE06];
    for (const [i, content] of staged.entries()) {
      await user.click(screen.getByRole('link', { name: `Open Case ${content.id}` }));
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        ['The missing file', 'The waiting result', 'The misleading evidence', 'The rules inside the record', 'The final review'][i],
      );
      await solveStaged(user, content, i % 2 === 0);
    }

    const p = saved();
    expect(Object.keys(p.cases).sort()).toEqual(['01', '02', '03', '04', '05', '06']);
    expect(p.achievements).toHaveLength(6);
    expect(p.checkpoints).toEqual({});

    await user.click(screen.getByRole('link', { name: 'See your case summary' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('all files closed');
    expect(screen.getByText(/Rank: Challenger/)).toBeInTheDocument();
    expect(screen.getByText('Evidence versus policy (prompt injection risk)')).toBeInTheDocument();

    // Replay a completed case: the record and achievements must not change.
    const before = saved();
    await user.click(screen.getByRole('link', { name: 'Replay “The waiting result”' }));
    await solveStaged(user, CASE03, true);
    expect(saved()).toEqual(before);

    // Review the concept in the notebook, with search.
    await user.click(screen.getByRole('link', { name: 'Notebook' }));
    await user.type(screen.getByLabelText('Search the notebook'), 'settle');
    expect(screen.getByRole('heading', { name: 'Posted is not settled' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Execution mismatch' })).not.toBeInTheDocument();
  }, 30000);

  it('locks later cases until earlier ones are complete', async () => {
    renderApp('/case/03');
    expect(screen.getByRole('heading', { name: 'Case locked' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Case 01' })).toBeInTheDocument();
  });

  it('resumes an unfinished case at the same step after a refresh', async () => {
    const user = userEvent.setup();
    renderApp('/case/01');
    await solveCase01(user);
    await user.click(screen.getByRole('link', { name: 'Open Case 02' }));
    await solveStage(user, CASE02, 0, true);
    expect(saved().checkpoints['02']).toEqual({ stage: 1, wrong: ['02-dossier'] });

    const snapshot = localStorage.getItem(STORAGE_KEY)!;
    document.body.innerHTML = '';
    localStorage.setItem(STORAGE_KEY, snapshot);
    renderApp('/case/02');
    expect(screen.getByText(/Resumed where you left off/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Step 2 of 3/ })).toBeInTheDocument();

    await solveStage(user, CASE02, 1, false);
    await solveStage(user, CASE02, 2, false);
    // The wrong answer before the refresh still counts against first-attempt credit.
    expect(saved().cases['02']).toMatchObject({ justified: 2, decisions: 3 });
  }, 15000);
});
