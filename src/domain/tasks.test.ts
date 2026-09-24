import { describe, expect, it } from 'vitest';
import { evaluateChoice, evaluateSort, type ChoiceTask, type SortTask } from './tasks';
import { initialStagedState, isResolved, stagedReducer } from './stagedCase';

const sort: SortTask = {
  kind: 'sort',
  id: 't',
  prompt: '',
  categories: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ],
  items: [
    { id: '1', label: 'one', answer: 'a', feedback: { b: 'one is A' } },
    { id: '2', label: 'two', answer: 'b', feedback: { a: 'two is B' } },
  ],
  success: 'ok',
  finding: '',
};

const choice: ChoiceTask = {
  kind: 'choice',
  id: 'c',
  prompt: '',
  options: [
    { id: 'x', label: 'x', correct: true, feedback: 'yes' },
    { id: 'y', label: 'y', feedback: 'because' },
  ],
  finding: '',
};

describe('task grading', () => {
  it('grades choices with option-specific feedback', () => {
    expect(evaluateChoice(choice, 'x')).toEqual({ correct: true, feedback: 'yes' });
    expect(evaluateChoice(choice, 'y')).toEqual({ correct: false, feedback: 'because' });
  });

  it('reports unplaced cards, then wrong cards with their own feedback, then success', () => {
    expect(evaluateSort(sort, { '1': 'a' })).toEqual({ status: 'incomplete', unplaced: ['2'] });
    expect(evaluateSort(sort, { '1': 'b', '2': 'b' })).toEqual({ status: 'wrong', wrong: [{ itemId: '1', feedback: 'one is A' }] });
    expect(evaluateSort(sort, { '1': 'a', '2': 'b' })).toEqual({ status: 'correct', feedback: 'ok' });
  });
});

describe('staged case transitions', () => {
  it('advances only on the current stage and counts each wrong task once', () => {
    let s = initialStagedState(3);
    s = stagedReducer(s, { type: 'WRONG', taskId: 'a' });
    s = stagedReducer(s, { type: 'WRONG', taskId: 'a' });
    s = stagedReducer(s, { type: 'SOLVED', stage: 0 });
    s = stagedReducer(s, { type: 'SOLVED', stage: 0 }); // stale double click
    expect(s).toMatchObject({ stage: 1, wrongTasks: ['a'] });
    s = stagedReducer(stagedReducer(s, { type: 'SOLVED', stage: 1 }), { type: 'SOLVED', stage: 2 });
    expect(isResolved(s)).toBe(true);
    expect(stagedReducer(s, { type: 'RESTART' })).toEqual(initialStagedState(3));
  });

  it('resumes from a valid checkpoint and ignores an out-of-range one', () => {
    expect(initialStagedState(4, { stage: 2, wrong: ['x', 'x'] })).toEqual({ stage: 2, stageCount: 4, wrongTasks: ['x'] });
    expect(initialStagedState(4, { stage: 9, wrong: [] }).stage).toBe(0);
  });
});
