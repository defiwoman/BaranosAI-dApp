import { describe, expect, it } from 'vitest';
import { emptyProgress, isUnlocked, parseProgress, rankFor, recordCompletion } from './progress';
import { loadProgress, saveProgress, STORAGE_KEY } from '../adapters/storage';

const completion = (caseId: '01' | '02', wrong = 0) => ({
  caseId,
  decisions: 1,
  wrongDecisions: wrong,
  notebook: [`nb-${caseId}`],
  achievements: [`ach-${caseId}`],
  at: new Date('2026-09-24T10:00:00Z'),
});

describe('progress', () => {
  it('records a completion once; replays do not duplicate achievements or overwrite the first record', () => {
    let p = recordCompletion(emptyProgress(), completion('01', 1));
    const first = p.cases['01'];
    p = recordCompletion(p, { ...completion('01', 0), at: new Date('2026-09-25T10:00:00Z') });
    expect(p.cases['01']).toEqual(first);
    expect(p.cases['01']?.justified).toBe(0);
    expect(p.achievements).toEqual(['ach-01']);
    expect(p.notebook).toEqual(['nb-01']);
  });

  it('unlocks cases in order', () => {
    const p = recordCompletion(emptyProgress(), completion('01'));
    expect(isUnlocked(emptyProgress(), '01')).toBe(true);
    expect(isUnlocked(emptyProgress(), '02')).toBe(false);
    expect(isUnlocked(p, '02')).toBe(true);
    expect(isUnlocked(p, '03')).toBe(false);
  });

  it('assigns descriptive ranks', () => {
    let p = emptyProgress();
    expect(rankFor(p)).toBe('Observer');
    p = recordCompletion(recordCompletion(p, completion('01')), completion('02'));
    expect(rankFor(p)).toBe('Investigator');
  });

  it('round-trips through JSON', () => {
    const p = recordCompletion(emptyProgress(), completion('01'));
    expect(parseProgress(JSON.stringify(p))).toEqual({ ok: true, progress: p });
  });

  it.each([
    ['not JSON', '{oops'],
    ['wrong shape', '[]'],
    ['unknown case id', JSON.stringify({ version: 1, cases: { '99': { completedAt: '2026-01-01T00:00:00Z', justified: 0, decisions: 1 } }, notebook: [], achievements: [] })],
    ['bad record', JSON.stringify({ version: 1, cases: { '01': { completedAt: 'yesterday', justified: 3, decisions: 1 } }, notebook: [], achievements: [] })],
    ['bad notebook', JSON.stringify({ version: 1, cases: {}, notebook: [1], achievements: [] })],
  ])('rejects malformed data (%s)', (_, raw) => {
    expect(parseProgress(raw)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects unsupported versions', () => {
    expect(parseProgress(JSON.stringify({ version: 99 }))).toEqual({ ok: false, reason: 'unsupported_version' });
  });
});

describe('storage adapter', () => {
  it('resets malformed storage and reports recovery', () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    const r = loadProgress(localStorage);
    expect(r).toEqual({ progress: emptyProgress(), recovered: true });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(emptyProgress());
  });

  it('restores saved progress', () => {
    const p = recordCompletion(emptyProgress(), completion('01'));
    saveProgress(p, localStorage);
    expect(loadProgress(localStorage)).toEqual({ progress: p, recovered: false });
  });

  it('survives storage that throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    } as unknown as Storage;
    expect(loadProgress(throwing).progress).toEqual(emptyProgress());
    expect(saveProgress(emptyProgress(), throwing)).toBe(false);
  });
});
