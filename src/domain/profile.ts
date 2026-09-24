export const NAME_MAX_LENGTH = 60;

export interface Profile {
  name: string;
  /** Without the leading @. */
  xHandle?: string;
}

export type FieldResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Counts user-perceived characters, so accented and non-Latin names are measured fairly. */
export function graphemeLength(text: string): number {
  const Segmenter = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(t: string): Iterable<unknown> } }).Segmenter;
  if (Segmenter) return Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(text)).length;
  return Array.from(text).length;
}

/** Trims, collapses inner whitespace and keeps any script. A real name is not required. */
export function validateName(raw: string): FieldResult<string> {
  const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name === '') return { ok: false, error: 'Please enter a name for your certificate. A nickname or display name is fine.' };
  if (graphemeLength(name) > NAME_MAX_LENGTH) {
    return { ok: false, error: `Please keep the name to ${NAME_MAX_LENGTH} characters or fewer so it fits on the certificate.` };
  }
  // Control characters would not print sensibly.
  if (/[\u0000-\u001f\u007f]/.test(name)) return { ok: false, error: 'Please remove special control characters from the name.' };
  return { ok: true, value: name };
}

/** Optional. Accepts "@handle", "handle" or an x.com / twitter.com profile link. */
export function validateXHandle(raw: string): FieldResult<string | undefined> {
  let handle = raw.trim();
  if (handle === '') return { ok: true, value: undefined };
  handle = handle.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '');
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    return { ok: false, error: 'X handles use letters, numbers and underscores, up to 15 characters. You can also leave this blank.' };
  }
  return { ok: true, value: handle };
}

export function validateProfile(name: string, xHandle: string): { profile?: Profile; errors: { name?: string; xHandle?: string } } {
  const n = validateName(name);
  const x = validateXHandle(xHandle);
  const errors = { name: n.ok ? undefined : n.error, xHandle: x.ok ? undefined : x.error };
  if (!n.ok || !x.ok) return { errors };
  return { profile: x.value ? { name: n.value, xHandle: x.value } : { name: n.value }, errors: {} };
}
