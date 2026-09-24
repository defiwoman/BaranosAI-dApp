import { describe, expect, it } from 'vitest';
import { case01Reducer, initialCase01State, type Case01Event, type Case01State } from './case01Machine';
import { replayFrom } from './toyModel';
import { CASE01_PRIMARY } from '../content/case01';

const start = () => case01Reducer(initialCase01State(CASE01_PRIMARY.job, CASE01_PRIMARY.submitted), { type: 'OPEN_CASE' });
const run = (s: Case01State, ...events: Case01Event[]) => events.reduce(case01Reducer, s);

describe('Case 01 state machine', () => {
  it('follows briefing → inspecting → step_selected → replay_available → resolved', () => {
    let s = initialCase01State(CASE01_PRIMARY.job, CASE01_PRIMARY.submitted);
    expect(s.phase).toBe('briefing');
    s = run(s, { type: 'OPEN_CASE' });
    expect(s.phase).toBe('inspecting');
    s = run(s, { type: 'SELECT_STEP', step: 2 });
    expect(s.phase).toBe('step_selected');
    s = run(s, { type: 'CHALLENGE' });
    expect(s.phase).toBe('replay_available');
    s = run(s, { type: 'REPLAY', replayed: replayFrom(s.job, s.submitted, 2) });
    expect(s.phase).toBe('resolved');
    expect(s.replayed?.[2].output).toBe(23);
    expect(s.wrongChoices).toBe(0);
  });

  it('rejects a challenge to step 1 with specific feedback and keeps the case open', () => {
    const s = run(start(), { type: 'SELECT_STEP', step: 1 }, { type: 'CHALLENGE' });
    expect(s.phase).toBe('inspecting');
    expect(s.feedback).toEqual({ kind: 'step_correct', step: 1, remaining: 'products' });
    expect(s.wrongChoices).toBe(1);
  });

  it('rejects a challenge to step 3 as downstream of the earlier error', () => {
    const s = run(start(), { type: 'SELECT_STEP', step: 3 }, { type: 'CHALLENGE' });
    expect(s.phase).toBe('inspecting');
    expect(s.feedback).toEqual({ kind: 'step_downstream', step: 3 });
  });

  it('does not accept the submitted score', () => {
    const s = run(start(), { type: 'ACCEPT_SUBMITTED' });
    expect(s.phase).toBe('inspecting');
    expect(s.feedback).toEqual({ kind: 'accept_rejected' });
  });

  it('cannot replay without an upheld challenge', () => {
    const s = run(start(), { type: 'SELECT_STEP', step: 1 }, { type: 'REPLAY', replayed: replayFrom(CASE01_PRIMARY.job, CASE01_PRIMARY.submitted, 1) });
    expect(s.phase).toBe('step_selected');
    expect(s.replayed).toBeNull();
  });

  it('asks for a selection before challenging', () => {
    const s = run(start(), { type: 'CHALLENGE' });
    expect(s.feedback).toEqual({ kind: 'no_step_selected' });
    expect(s.wrongChoices).toBe(0);
  });

  it('can be completed after wrong attempts and retried from the start', () => {
    let s = run(start(), { type: 'SELECT_STEP', step: 3 }, { type: 'CHALLENGE' }, { type: 'SELECT_STEP', step: 2 }, { type: 'CHALLENGE' });
    s = run(s, { type: 'REPLAY', replayed: replayFrom(s.job, s.submitted, 2) });
    expect(s.phase).toBe('resolved');
    s = run(s, { type: 'RETRY' });
    expect(s).toMatchObject({ phase: 'inspecting', selected: null, replayed: null, wrongChoices: 0 });
  });
});
