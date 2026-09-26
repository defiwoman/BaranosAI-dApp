import { describe, expect, it } from 'vitest';
import {
  DRAFT_FIELDS,
  composeAnswers,
  emptyDraft,
  firstOpenStep,
  isAnswersComplete,
  isDraftComplete,
  migrateLegacyDraft,
  splitAnswers,
  validateDraft,
  validateField,
  validateStep,
} from './useCase';
import { GOOD_DRAFT, LEGACY_DRAFT, THREE_FIELD } from '../test/fixtures';

const spec = (id: string) => DRAFT_FIELDS.find((f) => f.id === id)!;

describe('four-step design', () => {
  it('asks the four Protocol Architect questions, plus a name', () => {
    expect(DRAFT_FIELDS.map((f) => [f.step, f.label])).toEqual([
      ['', 'Name your system'],
      ['01', 'Who needs the AI?'],
      ['02', 'What does the AI decide?'],
      ['03', 'What should be verifiable?'],
      ['04', 'What could still go wrong?'],
    ]);
  });

  it('accepts concise answers with no minimum essay length', () => {
    expect(isDraftComplete(GOOD_DRAFT)).toBe(true);
    expect(validateField(spec('title'), 'Vote')).toBeNull();
    expect(validateField(spec('decides'), 'It counts ballots.')).toBeNull();
    expect(validateField(spec('risks'), 'Ayuda a confiar.')).toBeNull();
  });

  it.each(['', '   ', '\n\t'])('rejects empty and whitespace-only answers (%j)', (v) => {
    expect(validateField(spec('who'), v)).toMatch(/short answer in your own words/);
  });

  it('rejects the untouched example, a repeated question and answers without words', () => {
    for (const f of DRAFT_FIELDS) {
      expect(validateField(f, f.example)).toMatch(/example/);
      expect(validateField(f, f.example.replace(/^e\.g\.\s*/, ''))).toMatch(/example/);
    }
    expect(validateField(spec('risks'), 'What could still go wrong?')).toMatch(/rather than repeating/);
    expect(validateField(spec('title'), '123 !!!')).toMatch(/use words/);
  });

  it('validates one step at a time and resumes at the first open step', () => {
    const empty = emptyDraft();
    expect(Object.keys(validateStep(0, empty)).sort()).toEqual(['title', 'who']);
    expect(Object.keys(validateDraft(empty)).sort()).toEqual(['decides', 'risks', 'title', 'verifiable', 'who']);
    expect(firstOpenStep(empty)).toBe(0);
    expect(firstOpenStep({ ...GOOD_DRAFT, verifiable: '' })).toBe(2);
    expect(firstOpenStep(GOOD_DRAFT)).toBe(4); // the preview
  });
});

describe('what is sent to the organiser', () => {
  it('keeps the three backend fields: who + decides, verifiable + risks', () => {
    const a = composeAnswers(GOOD_DRAFT);
    expect(a).toEqual({
      title: GOOD_DRAFT.title,
      whoAndWhat: `${GOOD_DRAFT.who}\n\n${GOOD_DRAFT.decides}`,
      whyVerify: `${GOOD_DRAFT.verifiable}\n\n${GOOD_DRAFT.risks}`,
    });
    expect(isAnswersComplete(a)).toBe(true);
    expect(isAnswersComplete({ ...a, whyVerify: ' ' })).toBe(false);
  });

  it('round-trips through the split used for earlier three-field drafts', () => {
    expect(splitAnswers(composeAnswers(GOOD_DRAFT))).toEqual(GOOD_DRAFT);
    expect(splitAnswers(THREE_FIELD)).toEqual({
      title: 'Honest harbour',
      who: 'Boat owners need fair berths.',
      decides: 'The AI ranks requests.',
      verifiable: 'Rankings can be replayed.',
      risks: 'The rules may be unfair.',
    });
  });
});

describe('migrating a five-step draft', () => {
  it('keeps every answer', () => {
    expect(migrateLegacyDraft(LEGACY_DRAFT)).toEqual({
      title: LEGACY_DRAFT.title,
      who: LEGACY_DRAFT.problem,
      decides: LEGACY_DRAFT.aiRole,
      verifiable: `${LEGACY_DRAFT.whyVerify}\n\n${LEGACY_DRAFT.agreedRules}`,
      risks: LEGACY_DRAFT.risks,
    });
  });

  it('skips empty parts without leaving stray blank lines', () => {
    expect(migrateLegacyDraft({ ...LEGACY_DRAFT, agreedRules: '  ' }).verifiable).toBe(LEGACY_DRAFT.whyVerify);
  });
});
