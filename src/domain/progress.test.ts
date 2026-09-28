import { describe, expect, it } from 'vitest';
import {
  certificateEligibility,
  completedCases,
  emptyProgress,
  markRegistrationDelivered,
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
import { ALL_CHECKS, GOOD_DRAFT, LEGACY_DRAFT, v2FinishedSave, v3WithDraft, v4CasesDone } from '../test/fixtures';
import { migrateLegacyDraft } from './useCase';
import { OUTBOX_LIMIT } from './registration';

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

describe('progress v4', () => {
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
    p = saveDraft(p, { ...GOOD_DRAFT, whyVerify: '' });
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

  it('reset keeps the certificate name, participant ID and unsent entry forms but removes progress, draft and certificate', () => {
    let p = passAll(setProfile(emptyProgress(), { name: 'Mira' }));
    p = recordSubmission(p, submission(26));
    expect(resetProgress(p)).toEqual({ ...emptyProgress(), profile: { name: 'Mira' }, participantId: p.participantId, outbox: p.outbox });
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
    expect(() => recordSubmission(p, { ...submission(26), answers: { ...GOOD_DRAFT, whyVerify: '   ' } })).toThrow();
  });

  it('keeps one submission ID across retries', () => {
    const p = withSubmissionId(emptyProgress(), 'first-attempt-id');
    expect(withSubmissionId(p, 'second-attempt-id').useCase.submissionId).toBe('first-attempt-id');
  });

  it('cannot be unlocked by hand-editing the certificate field', () => {
    const forged = { ...v4CasesDone(), certificate: { completedAt: t(1).toISOString(), curriculumVersion: '3' } };
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

  it('v3: folds a five-step draft into three fields and keeps the original as a backup', () => {
    const r = parseProgress(JSON.stringify(v3WithDraft()));
    expect(r.ok && r.migratedFrom).toBe(3);
    if (!r.ok) return;
    expect(r.progress.useCase.draft).toEqual(migrateLegacyDraft(LEGACY_DRAFT));
    expect(r.progress.useCase.legacyDraft).toEqual(LEGACY_DRAFT);
    expect(r.progress.profile).toEqual({ name: 'Rin' });
    expect(CASE_IDS.every((id) => isCompleted(r.progress, id))).toBe(true);
    expect(certificateEligibility(r.progress)).toMatchObject({ eligible: false, needsUseCase: true });
    // Reload after migration: stable.
    expect(parseProgress(JSON.stringify(r.progress))).toEqual({ ok: true, progress: r.progress });
  });

  it('v3: keeps an already-received submission, its certificate date and original answers', () => {
    const save = v3WithDraft();
    const sub = { id: 'sub-12345678', submittedAt: t(25).toISOString(), curriculumVersion: '3', answers: LEGACY_DRAFT };
    const r = parseProgress(JSON.stringify({ ...save, useCase: { ...save.useCase, submission: sub }, certificate: { completedAt: t(25).toISOString(), curriculumVersion: '3' } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress.useCase.submission).toEqual({ ...sub, answers: migrateLegacyDraft(LEGACY_DRAFT), legacyAnswers: LEGACY_DRAFT });
    expect(certificateEligibility(r.progress)).toMatchObject({ eligible: true, completedAt: t(25).toISOString() });
  });

  it('v3: an empty five-step draft migrates without a backup', () => {
    const empty = { title: '', problem: '', aiRole: '', whyVerify: '', agreedRules: '', risks: '', concepts: [] };
    const r = parseProgress(JSON.stringify(v3WithDraft(empty)));
    expect(r.ok && r.progress.useCase).toMatchObject({ draft: { title: '', whoAndWhat: '', whyVerify: '' }, legacyDraft: null });
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
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(5);
    expect(loadProgress(localStorage)).toEqual({ progress: loaded.progress, recovered: false, migrated: false });
  });
});

describe('participant identity and the entry-form outbox', () => {
  let n = 0;
  const ids = () => `id-0000000${++n}`;

  it('creates one participant ID with the first profile and queues a registration, with or without an X handle', () => {
    const a = setProfile(emptyProgress(), { name: 'Ada' }, t(1), ids);
    expect(a.participantId).toMatch(/^id-/);
    expect(a.outbox).toEqual([{ id: expect.any(String), participantId: a.participantId, kind: 'new', name: 'Ada', submittedAt: t(1).toISOString() }]);
    const b = setProfile(emptyProgress(), { name: 'Bo', xHandle: 'bo_x' }, t(1), ids);
    expect(b.outbox[0]).toMatchObject({ kind: 'new', name: 'Bo', xHandle: 'bo_x' });
    expect(b.participantId).not.toBe(a.participantId);
  });

  it('keeps the ID through edits, queues updates as snapshots, and ignores an unchanged save', () => {
    const a = setProfile(emptyProgress(), { name: 'Ada' }, t(1), ids);
    const same = setProfile(a, { name: 'Ada' }, t(2), ids);
    expect(same).toBe(a);
    const edited = setProfile(a, { name: 'Ada L.', xHandle: 'ada' }, t(3), ids);
    expect(edited.participantId).toBe(a.participantId);
    expect(edited.outbox.map((e) => [e.kind, e.name, e.participantId])).toEqual([
      ['new', 'Ada', a.participantId],
      ['update', 'Ada L.', a.participantId],
    ]);
    expect(new Set(edited.outbox.map((e) => e.id)).size).toBe(2);
  });

  it('marks earlier progress as a returning participant, and removes only a confirmed entry', () => {
    const p = setProfile(passCheck(emptyProgress(), '01-replay', t(1)), { name: 'Kai' }, t(2), ids);
    expect(p.outbox[0].kind).toBe('returning');
    expect(markRegistrationDelivered(p, 'unknown-id')).toBe(p);
    expect(markRegistrationDelivered(p, p.outbox[0].id).outbox).toEqual([]);
  });

  it('gives existing v4 profiles an ID once at migration, without queueing a registration', () => {
    const r = parseProgress(JSON.stringify(v4CasesDone(GOOD_DRAFT, 'Rin')), () => 'migrated-id-1');
    expect(r.ok && r.migratedFrom).toBe(4);
    if (!r.ok) return;
    expect(r.progress.participantId).toBe('migrated-id-1');
    expect(r.progress.outbox).toEqual([]);
    expect(r.progress.useCase.draft).toEqual(GOOD_DRAFT);
    const again = parseProgress(JSON.stringify(r.progress), () => 'other-id-222');
    expect(again.ok && again.progress.participantId).toBe('migrated-id-1');
  });

  it('a v1 save without a profile gets no ID until the entry form is submitted', () => {
    const r = parseProgress(v1Save(['01']), () => 'never-used-1');
    expect(r.ok && r.progress.participantId).toBeNull();
  });

  it('drops damaged or foreign outbox entries without losing progress', () => {
    const p = setProfile(passAll(emptyProgress()), { name: 'Ada' }, t(1), ids);
    const foreign = { ...p.outbox[0], id: 'foreign-entry-1', participantId: 'someone-else-1' };
    const raw = JSON.stringify({ ...p, outbox: [p.outbox[0], { id: 5 }, foreign, p.outbox[0]] });
    const r = parseProgress(raw);
    expect(r.ok && r.progress.outbox).toEqual([p.outbox[0]]);
    expect(r.ok && completedCases(r.progress)).toHaveLength(6);
  });

  it('bounds the outbox by dropping the oldest name updates, never the first registration', () => {
    let p = setProfile(emptyProgress(), { name: 'Ada' }, t(1), ids);
    for (let i = 0; i < OUTBOX_LIMIT + 5; i++) p = setProfile(p, { name: `Ada ${i}` }, t(2), ids);
    expect(p.outbox).toHaveLength(OUTBOX_LIMIT);
    expect(p.outbox[0].kind).toBe('new');
    expect(p.outbox.at(-1)!.name).toBe(`Ada ${OUTBOX_LIMIT + 4}`);
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
