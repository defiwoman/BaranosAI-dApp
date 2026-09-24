import { describe, expect, it } from 'vitest';
import { certificateFilename, fitName, wrapLines } from './certificate';

// A fake measure: every character is 10 units wide at size 50, scaling with size.
const measureAt = (size: number, s: string) => Array.from(s).length * 10 * (size / 50);

describe('certificate layout', () => {
  it('keeps a short name on one line at the largest size', () => {
    expect(fitName(measureAt, 'Ada', 800, 56, 30)).toEqual({ size: 56, lines: ['Ada'] });
  });

  it('shrinks a longer name before wrapping it', () => {
    const r = fitName(measureAt, 'A'.repeat(90), 800, 56, 30);
    expect(r.lines).toHaveLength(1);
    expect(r.size).toBeLessThan(56);
    expect(measureAt(r.size, r.lines[0])).toBeLessThanOrEqual(800);
  });

  it('wraps a very long name over at most two lines without clipping', () => {
    const name = 'Maximiliana Alexandrina Konstantinopoulou-Vanderbilt de la Cruz y Montenegro';
    const wide = (size: number, s: string) => measureAt(size, s) * 2;
    const r = fitName(wide, name, 800, 56, 30);
    expect(r.size).toBe(30);
    expect(r.lines).toHaveLength(2);
    r.lines.forEach((l) => expect(wide(30, l)).toBeLessThanOrEqual(800));
    expect(r.lines.join(' ')).toBe(name);
    // Balanced at a word boundary: no stranded fragment on the second line.
    r.lines.forEach((l) => expect(l.length).toBeGreaterThanOrEqual(20));
  });

  it('balances a long name without spaces across two lines', () => {
    const wide = (size: number, s: string) => measureAt(size, s) * 2;
    const r = fitName(wide, 'W'.repeat(80), 800, 56, 30);
    expect(r.lines.map((l) => l.length)).toEqual([40, 40]);
  });

  it('splits a long name with no spaces by character', () => {
    const lines = wrapLines((s) => Array.from(s).length * 10, '李'.repeat(30), 100);
    expect(lines.every((l) => Array.from(l).length <= 10)).toBe(true);
    expect(lines.join('')).toBe('李'.repeat(30));
  });

  it('builds safe file names', () => {
    expect(certificateFilename('Zoë Ada', 'pdf')).toBe('baranosai-quest-certificate-zoe-ada.pdf');
    expect(certificateFilename('李小龍', 'png')).toBe('baranosai-quest-certificate.png');
  });
});
