import { describe, expect, it } from 'vitest';
import { canonicalScore, checkStep, firstIncorrectStep, replayFrom } from './toyModel';
import { CASE01_PRACTICE, CASE01_PRIMARY } from '../content/case01';

describe('Harbor Score v1 (casebook job)', () => {
  const { job, submitted } = CASE01_PRIMARY;

  it('keeps the exact casebook inputs, submitted score and canonical score', () => {
    expect(job.inputs).toEqual({ x1: 4, x2: 5 });
    expect(job.weights).toEqual({ w1: 2, w2: 3 });
    expect(submitted.map((s) => s.output)).toEqual([8, 17, 25]);
    expect(canonicalScore(job)).toBe(23);
  });

  it('classifies each submitted step as the casebook describes', () => {
    expect(checkStep(job, submitted, 1)).toBe('correct');
    expect(checkStep(job, submitted, 2)).toBe('incorrect');
    expect(checkStep(job, submitted, 3)).toBe('downstream');
    expect(firstIncorrectStep(job, submitted)).toBe(2);
  });

  it('replays step 2 to 15 and updates the downstream sum to 23', () => {
    const replayed = replayFrom(job, submitted, 2);
    expect(replayed[0]).toEqual(submitted[0]);
    expect(replayed[1].output).toBe(15);
    expect(replayed[2]).toMatchObject({ left: 8, right: 15, output: 23 });
  });
});

describe('practice variants', () => {
  it('each contain exactly one faulty step and replay to the canonical score', () => {
    for (const f of CASE01_PRACTICE) {
      const faulty = firstIncorrectStep(f.job, f.submitted);
      expect(faulty).not.toBeNull();
      expect(replayFrom(f.job, f.submitted, faulty!)[2].output).toBe(canonicalScore(f.job));
      expect(f.submitted[2].output).toBe(f.submittedScore);
    }
  });

  it('move the faulty step so the answer is not a memorised position', () => {
    const positions = CASE01_PRACTICE.map((f) => firstIncorrectStep(f.job, f.submitted));
    expect(positions).not.toContain(2);
  });
});
