import { describe, expect, it } from 'vitest';
import {
  certificateEligibility,
  emptyProgress,
  isCompleted,
  isUnlocked,
  missingChecks,
  parseProgress,
  passCheck,
  rankFor,
  resetProgress,
  setProfile,
  type Progress,
} from './progress';
import { REQUIRED_CHECKS } from './curriculum';
import { CASE_IDS } from './types';
import { loadProgress, saveProgress, STORAGE_KEY } from '../adapters/storage';

const t = (day: number) => new Date(Date.UTC(2026, 8, day, 12));
const ALL_CHECKS = CASE_IDS.flatMap((id) => REQUIRED_CHECKS[id]);

function passAll(p: Progress, checks = ALL_CHECKS, day = 25): Progress {
  return checks.reduce((acc, c) => passCheck(acc, c, t(day)), p);
}

const v1Save = (ids: string[]) =>
  JSON.stringify({
    version: 1,
    cases: Object.fromEntries(ids.map((id, i) => [id, { completedAt: t(20 + i).toISOString(), justified: 1, decisions: 1 }])),
    notebook: ['execution-mismatch'],
    achievements: ['Upheld a step challenge'],
    checkpoints: { '06': { stage: 3, wrong: [] } },
  });

describe('progress v2', () => {
  it('completes a case only when all its checks pass, and records the date once', () => {
    let p = passCheck(emptyProgress(), '06-review-reproduce', t(24));
    expect(isCompleted(p, '06')).toBe(false);
    expect(missingChecks(p, '06')).toEqual(['06-review-settled', '06-review-limits']);
    p = passCheck(passCheck(p, '06-review-settled', t(24)), '06-review-limits', t(25));
    expect(p.cases['06']).toEqual({ completedAt: t(25).toISOString() });
    const again = passCheck(p, '06-review-limits', t(30));
    expect(again).toBe(p);
  });

  it('unlocks cases in order and ranks by completed cases', () => {
    const p = passCheck(emptyProgress(), '01-replay');
    expect(isUnlocked(p, '02')).toBe(true);
    expect(isUnlocked(p, '03')).toBe(false);
    expect(rankFor(p)).toBe('Observer');
  });

  it('round-trips through JSON', () => {
    const p = passAll(setProfile(emptyProgress(), { name: 'Zoë 李', xHandle: 'zoe_1' }));
    expect(parseProgress(JSON.stringify(p))).toEqual({ ok: true, progress: p });
  });

  it.each([
    ['not JSON', '{oops'],
    ['wrong shape', '[]'],
    ['bad profile', JSON.stringify({ ...emptyProgress(), profile: { name: '   ' } })],
    ['bad case id', JSON.stringify({ ...emptyProgress(), cases: { '99': { completedAt: t(1).toISOString() } } })],
    ['bad date', JSON.stringify({ ...emptyProgress(), certificate: { completedAt: 'soon' } })],
    ['bad checks', JSON.stringify({ ...emptyProgress(), passedChecks: [1] })],
    ['bad v1', JSON.stringify({ version: 1, cases: { '01': { completedAt: 'yesterday' } } })],
  ])('rejects malformed data (%s)', (_, raw) => {
    expect(parseProgress(raw)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects unknown future versions', () => {
    expect(parseProgress(JSON.stringify({ version: 9 }))).toEqual({ ok: false, reason: 'unsupported_version' });
  });

  it('reset keeps the certificate name but removes progress and the certificate', () => {
    const p = passAll(setProfile(emptyProgress(), { name: 'Mira' }));
    expect(resetProgress(p)).toEqual({ ...emptyProgress(), profile: { name: 'Mira' } });
  });
});

describe('migration from the first release (v1)', () => {
  it('keeps completed cases and asks a full v1 finisher only for the one new final-review check', () => {
    const r = parseProgress(v1Save(['01', '02', '03', '04', '05', '06']));
    expect(r.ok && r.migratedFrom).toBe(1);
    if (!r.ok) return;
    const p = r.progress;
    expect(p.profile).toBeNull();
    for (const id of ['01', '02', '03', '04', '05'] as const) {
      expect(isCompleted(p, id)).toBe(true);
    }
    expect(p.cases['01']).toEqual({ completedAt: t(20).toISOString() });
    expect(isCompleted(p, '06')).toBe(false);
    expect(missingChecks(p, '06')).toEqual(['06-review-reproduce']);
    expect(certificateEligibility(p)).toEqual({ eligible: false, remaining: ['06'], needsName: true });
  });

  it('keeps partial progress without inventing completions', () => {
    const r = parseProgress(v1Save(['01', '02']));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(CASE_IDS.filter((id) => isCompleted(r.progress, id))).toEqual(['01', '02']);
    expect(r.progress.certificate).toBeNull();
  });

  it('is saved back in the new format by the storage adapter, under the same key', () => {
    localStorage.setItem(STORAGE_KEY, v1Save(['01']));
    const loaded = loadProgress(localStorage);
    expect(loaded.migrated).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(2);
    expect(loadProgress(localStorage)).toEqual({ progress: loaded.progress, recovered: false, migrated: false });
  });
});

describe('certificate eligibility (the single shared rule)', () => {
  it('requires all six cases', () => {
    const p = passAll(setProfile(emptyProgress(), { name: 'Ada' }), ALL_CHECKS.slice(0, -1));
    expect(certificateEligibility(p)).toEqual({ eligible: false, remaining: ['06'], needsName: false });
  });

  it('requires a name', () => {
    const p = passAll(emptyProgress());
    expect(certificateEligibility(p)).toMatchObject({ eligible: false, needsName: true });
  });

  it('keeps the completion date stable across name changes, replays and reloads', () => {
    let p = passAll(setProfile(emptyProgress(), { name: 'Ada' }), ALL_CHECKS, 25);
    const first = certificateEligibility(p);
    expect(first).toEqual({ eligible: true, name: 'Ada', completedAt: t(25).toISOString() });
    p = setProfile(p, { name: 'Ada Lovelace' });
    p = passAll(p, ALL_CHECKS, 30);
    const reloaded = parseProgress(JSON.stringify(p));
    expect(reloaded.ok && certificateEligibility(reloaded.progress)).toEqual({
      eligible: true,
      name: 'Ada Lovelace',
      completedAt: t(25).toISOString(),
    });
  });

  it('cannot be unlocked by a hand-edited certificate field without the checks', () => {
    const forged = { ...setProfile(emptyProgress(), { name: 'X' }), certificate: { completedAt: t(1).toISOString() } };
    const r = parseProgress(JSON.stringify(forged));
    expect(r.ok && certificateEligibility(r.progress).eligible).toBe(false);
  });
});

describe('storage adapter', () => {
  it('resets malformed storage and reports recovery', () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    expect(loadProgress(localStorage)).toEqual({ progress: emptyProgress(), recovered: true, migrated: false });
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
