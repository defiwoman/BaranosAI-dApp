import { describe, expect, it } from 'vitest';
import { architectAccess, clearanceFor, effectiveClearance, hasCapability, tierForCase, upgradeAfter } from './clearance';
import { EMPTY_FLAGS, initialMission, missionReducer, trustShift, type MissionEvent } from './mission';
import { baraHint, baraReaction } from './bara';
import { parseProgress, recordSubmission, type Progress } from './progress';
import { CONSOLE } from '../content/console';
import { GOOD_ANSWERS, v5CasesDone, v5WithCases } from '../test/fixtures';

function load(save: unknown): Progress {
  const r = parseProgress(JSON.stringify(save));
  if (!r.ok) throw new Error(r.reason);
  return r.progress;
}
const progress = (ids: string[]) => load(v5WithCases(ids));

describe('clearance', () => {
  it('is derived from progress and unlocks capabilities tier by tier', () => {
    expect(clearanceFor(progress([]))).toBe('OBSERVER');
    expect(clearanceFor(progress(['01']))).toBe('ANALYST');
    expect(clearanceFor(progress(['01', '02']))).toBe('VERIFIER');
    expect(clearanceFor(progress(['01', '02', '03', '04']))).toBe('CHALLENGER');
    expect(hasCapability('OBSERVER', 'inspectModel')).toBe(false);
    expect(hasCapability('ANALYST', 'inspectModel')).toBe(true);
    expect(hasCapability('ANALYST', 'replay')).toBe(false);
    expect(hasCapability('VERIFIER', 'replay')).toBe(true);
    expect(hasCapability('VERIFIER', 'challenge')).toBe(false);
    expect(hasCapability('CHALLENGER', 'design')).toBe(false);
  });

  it('grants Protocol Architect only after the use case is received', () => {
    const done = load(v5CasesDone());
    expect(architectAccess(done)).toBe(true);
    expect(clearanceFor(done)).toBe('CHALLENGER');
    const submitted = recordSubmission(done, { id: 'abc-12345678', submittedAt: '2026-09-25T10:00:00.000Z', curriculumVersion: '3.2', answers: GOOD_ANSWERS });
    expect(clearanceFor(submitted)).toBe('PROTOCOL ARCHITECT');
  });

  it('plays each case at least at its own tier and reports upgrades', () => {
    expect(tierForCase('03')).toBe('VERIFIER');
    expect(effectiveClearance('OBSERVER', '05')).toBe('CHALLENGER');
    expect(effectiveClearance('CHALLENGER', '01')).toBe('CHALLENGER');
    expect(upgradeAfter('01')).toEqual({ from: 'OBSERVER', to: 'ANALYST' });
    expect(upgradeAfter('03')).toBeNull();
    expect(upgradeAfter('06')).toEqual({ from: 'CHALLENGER', to: 'PROTOCOL ARCHITECT' });
  });
});

describe('mission transitions', () => {
  const run = (...events: MissionEvent[]) => events.reduce(missionReducer, initialMission());

  it('moves received → inspect → verify → finalTrust → resolved', () => {
    let s = run({ type: 'SET_TRUST_BEFORE', value: 140 });
    expect(s).toMatchObject({ phase: 'inspect', status: 'UNDER REVIEW', trustBefore: 100 });
    s = missionReducer(s, { type: 'VIEWED', object: 'evidence' });
    expect(s.phase).toBe('verify');
    s = missionReducer(s, { type: 'REPLAYED', diverged: false });
    expect(s.status).toBe('VERIFIED');
    expect(s.log.at(-1)).toMatchObject({ text: 'Deterministic replay confirmed', tone: 'ok' });
    s = missionReducer(s, { type: 'SOLVED' });
    expect(s.phase).toBe('finalTrust');
    s = missionReducer(s, { type: 'SET_TRUST_AFTER', value: 30.4 });
    expect(s).toMatchObject({ phase: 'resolved', trustAfter: 30 });
  });

  it('records a divergence, wrong findings and one-time events', () => {
    const s = run(
      { type: 'SET_TRUST_BEFORE', value: 50 },
      { type: 'REPLAYED', diverged: true },
      { type: 'FINDING', correct: false },
      { type: 'SOURCE_CHECKED' },
      { type: 'SOURCE_CHECKED' },
    );
    expect(s.status).toBe('DIVERGENCE DETECTED');
    expect(s.flags).toMatchObject({ replayDiverged: true, wrongFindings: 1, sourceChecked: true });
    expect(s.log.filter((e) => e.text === 'Evidence quality disputed')).toHaveLength(1);
  });

  it('describes the trust shift with a small dead band', () => {
    expect(trustShift(80, 20)).toBe('down');
    expect(trustShift(40, 90)).toBe('up');
    expect(trustShift(50, 53)).toBe('same');
  });
});

describe('BARA', () => {
  const script = CONSOLE['04'].bara;

  it('reacts to what the learner has already done', () => {
    expect(baraReaction(script, 'replayConfirmed', EMPTY_FLAGS)).toBe('Replay matches exactly. So why does the organiser disagree?');
    const inspected = { ...EMPTY_FLAGS, evidenceViewed: true, modelViewed: true, rulesViewed: true };
    expect(baraReaction(script, 'rulesViewed', inspected)).toMatch(/Now check whether the same computation can be reproduced/);
    expect(baraReaction({ reactions: {}, hints: [] }, 'settled', EMPTY_FLAGS)).toBe('Now the result is final under the rules.');
  });

  it('gives the next hint for the current state, never the answer', () => {
    expect(baraHint(script, EMPTY_FLAGS)).toBe('Replay the inference first. Does it match?');
    expect(baraHint(script, { ...EMPTY_FLAGS, inferenceReplayed: true })).toBe('Check the evidence against its source.');
    expect(baraHint({ reactions: {}, hints: [] }, EMPTY_FLAGS)).toBe('Start with what the AI was given. Open the evidence.');
  });
});
