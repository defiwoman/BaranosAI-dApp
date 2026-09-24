import { describe, expect, it } from 'vitest';
import { CASE02 } from './case02';
import { CASE03 } from './case03';
import { CASE04, CASE04_CORRECTED_JOB, CASE04_JOB, CASE04_TRACE } from './case04';
import { CASE05 } from './case05';
import { CASE06 } from './case06';
import { CASES } from './cases';
import { NOTEBOOK, CASE_NOTEBOOK_IDS } from './notebook';
import { SOURCES } from './sources';
import { canonicalScore, firstIncorrectStep } from '../domain/toyModel';
import { validateTask, type SortTask, type ChoiceTask } from '../domain/tasks';
import type { SourceRef } from './types';

const STAGED = [CASE02, CASE03, CASE04, CASE05, CASE06];
const allTasks = STAGED.flatMap((c) => c.stages.map((s) => s.task));

function sortAnswer(task: SortTask, labelIncludes: string) {
  const item = task.items.find((i) => i.label.includes(labelIncludes));
  if (!item) throw new Error(`No item containing “${labelIncludes}”`);
  return item.answer;
}

function correctOption(task: ChoiceTask) {
  return task.options.find((o) => o.correct)!;
}

describe('content integrity', () => {
  it('keeps the six case IDs in order and all playable', () => {
    expect(CASES.map((c) => c.id)).toEqual(['01', '02', '03', '04', '05', '06']);
    expect(CASES.every((c) => c.playable)).toBe(true);
  });

  it.each(allTasks.map((t) => [t.id, t] as const))('task %s has one right answer and specific feedback for every wrong one', (_, task) => {
    expect(validateTask(task)).toEqual([]);
  });

  it('uses unique task and notebook IDs', () => {
    const taskIds = allTasks.map((t) => t.id);
    expect(new Set(taskIds).size).toBe(taskIds.length);
    const nb = NOTEBOOK.map((e) => e.id);
    expect(new Set(nb).size).toBe(nb.length);
  });

  it('gives every case notebook entries, a resolution and source references that exist', () => {
    for (const c of CASES) expect(CASE_NOTEBOOK_IDS[c.id].length).toBeGreaterThan(0);
    const refs: SourceRef[] = [...STAGED.flatMap((c) => c.relation.sources), ...NOTEBOOK.flatMap((e) => e.sources)];
    for (const r of refs) expect(SOURCES[r.id]).toBeDefined();
    for (const c of STAGED) {
      expect(c.relation.sources.length).toBeGreaterThan(0);
      expect(c.resolution.explanation.length).toBeGreaterThan(0);
    }
    for (const e of NOTEBOOK) expect(e.sources.length).toBeGreaterThan(0);
  });

  it('cites no unverified section numbers', () => {
    const refs: SourceRef[] = [...STAGED.flatMap((c) => c.relation.sources), ...NOTEBOOK.flatMap((e) => e.sources)];
    expect(refs.filter((r) => r.locator)).toEqual([]);
    expect(JSON.stringify([STAGED, NOTEBOOK])).not.toMatch(/§/);
  });

  it('links sources over https', () => {
    for (const s of Object.values(SOURCES)) expect(s.url).toMatch(/^https:\/\//);
  });
});

describe('factual boundaries', () => {
  const statements = CASE03.stages.find((s) => s.id === 'statements')!.task as SortTask;

  it('Confirmation computes offchain with onchain replay of disputes; Replay executes onchain from the outset', () => {
    expect(sortAnswer(statements, 'normally runs offchain')).toBe('confirmation');
    expect(sortAnswer(statements, 'onchain from the outset')).toBe('replay');
  });

  it('treats block time as different from inference time, and silence as no guarantee', () => {
    expect(sortAnswer(statements, 'block time')).toBe('neither');
    expect(sortAnswer(statements, 'nobody challenges')).toBe('neither');
    expect(sortAnswer(statements, 'final as soon as it is posted')).toBe('neither');
  });

  it('Case 02: a commitment alone is not verification and unavailable evidence leaves the review incomplete', () => {
    const report = CASE02.stages.find((s) => s.id === 'report')!.task as ChoiceTask;
    expect(correctOption(report).id).toBe('incomplete');
    const retrieval = CASE02.stages.find((s) => s.id === 'retrieval')!.task as SortTask;
    expect(sortAnswer(retrieval, 'shared drive')).toBe('changed');
    expect(sortAnswer(retrieval, 'input registry')).toBe('unavailable');
  });

  it('Case 04: execution is correct, the evidence is not, and the correction is a new job', () => {
    expect(firstIncorrectStep(CASE04_JOB, CASE04_TRACE)).toBeNull();
    expect(canonicalScore(CASE04_JOB)).toBe(26);
    expect(canonicalScore(CASE04_CORRECTED_JOB)).toBe(30);
    const action = CASE04.stages.find((s) => s.id === 'action')!.task as ChoiceTask;
    expect(correctOption(action).id).toBe('new-job');
  });

  it('Case 05: does not imply prompt injection is solved', () => {
    const safer = CASE05.stages.find((s) => s.id === 'safer')!.task as SortTask;
    expect(sortAnswer(safer, 'prevents prompt injection')).toBe('no');
    expect(sortAnswer(safer, 'prompt injection is solved')).toBe('no');
    const classify = CASE05.stages.find((s) => s.id === 'classify')!.task as SortTask;
    expect(sortAnswer(classify, 'Ignore the task')).toBe('evidence');
  });

  it('Case 06 checks identity, criteria, evidence policy, status and action, then names a remaining uncertainty', () => {
    expect(CASE06.stages.map((s) => s.id)).toEqual([
      'identity',
      'criteria',
      'evidence',
      'status',
      'action-pending',
      'action-disputed',
      'action-settled',
      'uncertainty',
    ]);
    const pending = CASE06.stages.find((s) => s.id === 'action-pending')!.task as ChoiceTask;
    // Right action with the wrong reason is not accepted.
    expect(pending.options.find((o) => o.id === 'hold-truth')!.correct).toBeFalsy();
  });

  it('labels the enterprise narrative as a future thesis and keeps the reported demo’s date and conditions', () => {
    expect(SOURCES.R1.boundary).toMatch(/future thesis/);
    const note = CASE03.relation.paragraphs.join(' ');
    expect(note).toMatch(/17 September 2026/);
    expect(note).toMatch(/Doug Colkitt/);
    expect(note).toMatch(/not a Baranos benchmark/);
    expect(CASE06.relation.paragraphs.join(' ')).toMatch(/thesis about the future/);
  });
});
