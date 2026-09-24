import { describe, expect, it } from 'vitest';
import { buildImagePdf } from './pdf';

describe('buildImagePdf', () => {
  it('writes a single-page PDF whose xref offsets point at each object', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
    const bytes = buildImagePdf(jpeg, 2480, 1754, 'Certificate (test) — é');
    const text = new TextDecoder('latin1').decode(bytes);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/MediaBox [0 0 842 596]');
    expect(text).toContain('/Width 2480 /Height 1754');
    expect(text).toContain('/Title (Certificate \\(test\\)  )');

    const startxref = Number(/startxref\n(\d+)/.exec(text)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');
    const offsets = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(offsets).toHaveLength(6);
    offsets.forEach((o, i) => expect(text.slice(o, o + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
  });
});
