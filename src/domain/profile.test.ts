import { describe, expect, it } from 'vitest';
import { NAME_MAX_LENGTH, graphemeLength, validateName, validateProfile, validateXHandle } from './profile';

describe('certificate name', () => {
  it('trims and collapses whitespace', () => {
    expect(validateName('   Ada    Lovelace  ')).toEqual({ ok: true, value: 'Ada Lovelace' });
  });

  it.each(['', '    ', '\n\t '])('rejects an empty name (%j) with a helpful message', (raw) => {
    const r = validateName(raw);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/nickname or display name is fine/);
  });

  it.each(['Zoë', 'José Ñúñez', '李小龍', 'محمد', 'Ωμέγα', 'Dev 🚀'])('accepts Unicode names (%s)', (name) => {
    expect(validateName(name)).toEqual({ ok: true, value: name });
  });

  it('measures length in visible characters and rejects overly long names', () => {
    expect(graphemeLength('👩‍👩‍👧‍👦')).toBe(1);
    expect(validateName('a'.repeat(NAME_MAX_LENGTH)).ok).toBe(true);
    const r = validateName('a'.repeat(NAME_MAX_LENGTH + 1));
    expect(!r.ok && r.error).toMatch(/60 characters/);
  });
});

describe('X handle', () => {
  it.each([
    ['', undefined],
    ['@baranos_ai', 'baranos_ai'],
    ['baranos', 'baranos'],
    ['https://x.com/Baranos_1', 'Baranos_1'],
  ])('accepts %j', (raw, value) => {
    expect(validateXHandle(raw)).toEqual({ ok: true, value });
  });

  it.each(['has space', '@way_too_long_handle_123', 'bad-dash'])('rejects %j', (raw) => {
    expect(validateXHandle(raw).ok).toBe(false);
  });

  it('validates the whole form', () => {
    expect(validateProfile(' Mira ', '@mira')).toEqual({ profile: { name: 'Mira', xHandle: 'mira' }, errors: {} });
    expect(validateProfile('', 'bad handle').errors).toEqual({ name: expect.any(String), xHandle: expect.any(String) });
  });
});
