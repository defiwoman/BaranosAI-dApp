import { describe, expect, it } from 'vitest';
import { USE_CASE_FIELDS, emptyDraft, isDraftComplete, migrateLegacyDraft, validateDraft, validateField } from './useCase';
import { GOOD_DRAFT, LEGACY_DRAFT } from '../test/fixtures';

const spec = (id: string) => USE_CASE_FIELDS.find((f) => f.id === id)!;

describe('three-field use case', () => {
  it('has exactly the three required questions', () => {
    expect(USE_CASE_FIELDS.map((f) => f.label)).toEqual([
      'Name your idea',
      'Who would it help, and what would the AI do?',
      'Why does verification matter?',
    ]);
  });

  it('accepts concise answers with no minimum essay length', () => {
    expect(isDraftComplete(GOOD_DRAFT)).toBe(true);
    expect(validateField(spec('title'), 'Vote')).toBeNull();
    expect(validateField(spec('whoAndWhat'), 'Voters. It counts ballots.')).toBeNull();
    expect(validateField(spec('whyVerify'), 'Recounts. Bad ballots.')).toBeNull();
    expect(validateField(spec('whyVerify'), 'Ayuda a confiar.')).toBeNull();
  });

  it.each(['', '   ', '\n\t'])('rejects empty and whitespace-only answers (%j)', (v) => {
    expect(validateField(spec('whoAndWhat'), v)).toMatch(/short answer in your own words/);
  });

  it('rejects the untouched example, a repeated question and answers without words', () => {
    for (const f of USE_CASE_FIELDS) {
      expect(validateField(f, f.example)).toMatch(/example/);
      expect(validateField(f, f.example.replace(/^e\.g\.\s*/, ''))).toMatch(/example/);
    }
    expect(validateField(spec('whyVerify'), 'Why does verification matter?')).toMatch(/rather than repeating/);
    expect(validateField(spec('title'), '123 !!!')).toMatch(/use words/);
  });

  it('reports every missing field', () => {
    expect(Object.keys(validateDraft(emptyDraft())).sort()).toEqual(['title', 'whoAndWhat', 'whyVerify']);
  });
});

describe('migrating a five-step draft', () => {
  it('keeps every answer: title as is, problem + AI task, then verification + rules + limitations', () => {
    expect(migrateLegacyDraft(LEGACY_DRAFT)).toEqual({
      title: LEGACY_DRAFT.title,
      whoAndWhat: `${LEGACY_DRAFT.problem}\n\n${LEGACY_DRAFT.aiRole}`,
      whyVerify: `${LEGACY_DRAFT.whyVerify}\n\n${LEGACY_DRAFT.agreedRules}\n\n${LEGACY_DRAFT.risks}`,
    });
  });

  it('skips empty parts without leaving stray blank lines', () => {
    const partial = { ...LEGACY_DRAFT, aiRole: '  ', agreedRules: '' };
    expect(migrateLegacyDraft(partial)).toEqual({
      title: LEGACY_DRAFT.title,
      whoAndWhat: LEGACY_DRAFT.problem,
      whyVerify: `${LEGACY_DRAFT.whyVerify}\n\n${LEGACY_DRAFT.risks}`,
    });
  });
});
