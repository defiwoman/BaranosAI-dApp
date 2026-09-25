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
  recordSubmission,
  resetProgress,
  saveDraft,
  setProfile,
  withSubmissionId,
  type Progress,
} from './progress';
import { CASE_IDS } from './types';
import { emptyDraft } from './useCase';
import { loadProgress, saveProgress, STORAGE_KEY } from '../adapters/storage';
import { ALL_CHECKS, GOOD_DRAFT, v2FinishedSave, v3CasesDone } from '../test/fixtures';

const t = (day: number) => new Date(Date.UTC(2026, 8, day, 12));

function passAll(p: Progress, checks = ALL_CHECKS, day = 25): Progress {
  return checks.reduce((acc, c) => passCheck(acc, c, t(day)), p);
}

const submission = (day: number) => ({ id: 'sub-12345678', submittedAt: t(day).toISOString(), curriculumVersion: '3', answers: GOOD_DRAFT });

const v1Save = (ids: string[]) =>
  JSON.stringify({
    version: 1,
    cases: Object.fromEntries(ids.map((id, i) => [id, { completedAt: t(20 + i).toISOString(), justified: 1, decisions: 1 }])),
    notebook: [],
    achievements: [],
  });

describe('progress v3', () => {
  it('completes a case only when all its checks pass, and records the date once', () => {
    let p = passCheck(emptyProgress(), '06-review-reproduce', t(24));
    expect(isCompleted(p, '06')).toBe(false);
    expect(missingChecks(p, '06')).toEqual(['06-review-settled', '06-review-limits']);
    p = passCheck(passCheck(p, '06-review-settled', t(24)), '06-review-limits', t(25));
    expect(p.cases['06']).toEqual({ completedAt: t(25).toISOString() });
    expect(passCheck(p, '06-review-limits', t(30))).toBe(p);
  });

  it('unlocks cases in order and ranks by completed cases', () => {
    const p = passCheck(emptyProgress(), '01-replay');
    expect(isUnlocked(p, '02')).toBe(true);
    expect(isUnlocked(p, '03')).toBe(false);
    expect(rankFor(p)).toBe('Observer');
  });

  it('round-trips through JSON, including the draft and submission', () => {
    let p = passAll(setProfile(emptyProgress(), { name: 'Zoë 李', xHandle: 'zoe_1' }));
    p = saveDraft(p, { ...GOOD_DRAFT, risks: '' }, 2);
    expect(parseProgress(JSON.stringify(p))).toEqual({ ok: true, progress: p });
    p = recordSubmission(withSubmissionId(p, 'sub-12345678'), submission(26), t(26));
    expect(parseProgress(JSON.stringify(p))).toEqual({ ok: true, progress: p });
  });

  it.each([
    ['not JSON', '{oops'],
    ['wrong shape', '[]'],
    ['bad profile', JSON.stringify({ ...emptyProgress(), profile: { name: '   ' } })],
    ['bad case id', JSON.stringify({ ...emptyProgress(), cases: { '99': { completedAt: t(1).toISOString() } } })],
    ['bad date', JSON.stringify({ ...emptyProgress(), certificate: { completedAt: 'soon' } })],
    ['bad checks', JSON.stringify({ ...emptyProgress(), passedChecks: [1] })],
    ['bad draft', JSON.stringify({ ...emptyProgress(), useCase: { ...emptyProgress().useCase, draft: { title: 5 } } })],
    ['incomplete submission', JSON.stringify({ ...emptyProgress(), useCase: { ...emptyProgress().useCase, submission: { ...submission(1), answers: emptyDraft() } } })],
    ['bad v1', JSON.stringify({ version: 1, cases: { '01': { completedAt: 'yesterday' } } })],
  ])('rejects malformed data (%s)', (_, raw) => {
    expect(parseProgress(raw)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects unknown future versions', () => {
    expect(parseProgress(JSON.stringify({ version: 9 }))).toEqual({ ok: false, reason: 'unsupported_version' });
  });

  it('reset keeps the certificate name but removes progress, draft and certificate', () => {
    let p = passAll(setProfile(emptyProgress(), { name: 'Mira' }));
    p = recordSubmission(p, submission(26));
    expect(resetProgress(p)).toEqual({ ...emptyProgress(), profile: { name: 'Mira' } });
  });
});

describe('the use-case requirement', () => {
  it('six completed cases alone do not earn the certificate', () => {
    const p = passAll(setProfile(emptyProgress(), { name: 'Ada' }));
    expect(certificateEligibility(p)).toEqual({ eligible: false, remaining: [], needsUseCase: true, needsName: false });
    expect(p.certificate).toBeNull();
  });

  it('a confirmed submission earns it, dated at submission, and the date stays fixed', () => {
    let p = passAll(setProfile(emptyProgress(), { name: 'Ada' }), ALL_CHECKS, 25);
    p = recordSubmission(p, submission(26), t(26));
    expect(certificateEligibility(p)).toEqual({ eligible: true, name: 'Ada', completedAt: t(26).toISOString(), useCaseTitle: 'Fair harbour berths' });
    // A second submission, a name change, replays and a reload change nothing.
    p = recordSubmission(p, { ...submission(28), answers: { ...GOOD_DRAFT, title: 'Other' } }, t(28));
    p = passAll(setProfile(p, { name: 'Ada L.' }), ALL_CHECKS, 29);
    const reloaded = parseProgress(JSON.stringify(p));
    expect(reloaded.ok && certificateEligibility(reloaded.progress)).toEqual({
      eligible: true,
      name: 'Ada L.',
      completedAt: t(26).toISOString(),
      useCaseTitle: 'Fair harbour berths',
    });
  });

  it('refuses to record an incomplete use case', () => {
    const p = passAll(emptyProgress());
    expect(() => recordSubmission(p, { ...submission(26), answers: { ...GOOD_DRAFT, risks: '   ' } })).toThrow();
  });

  it('keeps one submission ID across retries', () => {
    const p = withSubmissionId(emptyProgress(), 'first-attempt-id');
    expect(withSubmissionId(p, 'second-attempt-id').useCase.submissionId).toBe('first-attempt-id');
  });

  it('cannot be unlocked by hand-editing the certificate field', () => {
    const forged = { ...v3CasesDone(), certificate: { completedAt: t(1).toISOString(), curriculumVersion: '3' } };
    const r = parseProgress(JSON.stringify(forged));
    expect(r.ok && certificateEligibility(r.progress).eligible).toBe(false);
  });
});

describe('migrations', () => {
  it('v2: keeps cases and the earned six-case certificate as an earlier certificate; only the use case is missing', () => {
    const r = parseProgress(JSON.stringify(v2FinishedSave('Lee', t(24).toISOString())));
    expect(r.ok && r.migratedFrom).toBe(2);
    if (!r.ok) return;
    expect(CASE_IDS.every((id) => isCompleted(r.progress, id))).toBe(true);
    expect(r.progress.earlierCertificate).toEqual({ completedAt: t(24).toISOString(), curriculumVersion: '2' });
    expect(r.progress.certificate).toBeNull();
    expect(certificateEligibility(r.progress)).toEqual({ eligible: false, remaining: [], needsUseCase: true, needsName: false });
    const done = recordSubmission(r.progress, submission(26), t(26));
    expect(certificateEligibility(done)).toMatchObject({ eligible: true, completedAt: t(26).toISOString() });
    expect(done.earlierCertificate).toEqual({ completedAt: t(24).toISOString(), curriculumVersion: '2' });
  });

  it('v1: keeps completed cases; a finisher still needs one review question and the use case', () => {
    const r = parseProgress(v1Save(['01', '02', '03', '04', '05', '06']));
    expect(r.ok && r.migratedFrom).toBe(1);
    if (!r.ok) return;
    expect(r.progress.cases['01']).toEqual({ completedAt: t(20).toISOString() });
    expect(missingChecks(r.progress, '06')).toEqual(['06-review-reproduce']);
    expect(certificateEligibility(r.progress)).toEqual({ eligible: false, remaining: ['06'], needsUseCase: true, needsName: true });
  });

  it('is saved back in the new format by the storage adapter, under the same key', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v2FinishedSave()));
    const loaded = loadProgress(localStorage);
    expect(loaded.migrated).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(3);
    expect(loadProgress(localStorage)).toEqual({ progress: loaded.progress, recovered: false, migrated: false });
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
