import { describe, expect, it } from 'vitest';
import { USE_CASE_FIELDS, emptyDraft, firstInvalidStep, isDraftComplete, validateDraft, validateField, validateStep } from './useCase';
import { GOOD_DRAFT } from '../test/fixtures';

const spec = (id: string) => USE_CASE_FIELDS.find((f) => f.id === id)!;

describe('use-case completeness checks', () => {
  it('accepts concise answers in the participant’s own words', () => {
    expect(isDraftComplete(GOOD_DRAFT)).toBe(true);
    expect(validateField(spec('title'), 'Vote')).toBeNull();
    expect(validateField(spec('problem'), 'Helps voters trust counts.')).toBeNull();
    expect(validateField(spec('problem'), 'Ayuda a los vecinos a confiar.')).toBeNull();
  });

  it.each(['', '   ', '\n\t'])('rejects empty and whitespace-only answers (%j)', (v) => {
    expect(validateField(spec('problem'), v)).toMatch(/short answer in your own words/);
  });

  it('rejects the untouched example text, with or without “e.g.”', () => {
    for (const f of USE_CASE_FIELDS) {
      expect(validateField(f, f.example)).toMatch(/example/);
      expect(validateField(f, f.example.replace(/^e\.g\.\s*/, ''))).toMatch(/example/);
    }
  });

  it('rejects repeating the question and answers that are too short or not words', () => {
    expect(validateField(spec('aiRole'), spec('aiRole').label)).toMatch(/rather than repeating/);
    expect(validateField(spec('aiRole'), 'score it')).toMatch(/a little more/);
    expect(validateField(spec('aiRole'), '1234567890 12345 !!!')).toMatch(/use words/);
  });

  it('requires at least one concept', () => {
    expect(validateStep(3, { ...GOOD_DRAFT, concepts: [] })).toEqual({ concepts: expect.any(String) });
  });

  it('reports every missing field and points to the first incomplete step', () => {
    expect(Object.keys(validateDraft(emptyDraft())).sort()).toEqual(
      ['agreedRules', 'aiRole', 'concepts', 'problem', 'risks', 'title', 'whyVerify'].sort(),
    );
    expect(firstInvalidStep({ ...GOOD_DRAFT, agreedRules: ' ' })).toBe(2);
    expect(firstInvalidStep(GOOD_DRAFT)).toBeNull();
  });
});
