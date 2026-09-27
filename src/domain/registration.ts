import { isId } from './ids';
import { validateName, validateXHandle, type Profile } from './profile';

/**
 * Entry-form submissions waiting to reach the organiser. Each one is a snapshot taken when the
 * participant pressed the button, so a later name change never rewrites an earlier record.
 * Entries stay in the browser until the server confirms it stored them.
 */

export type RegistrationKind = 'new' | 'returning' | 'update';

export const REGISTRATION_KIND_LABELS: Record<RegistrationKind, string> = {
  new: 'New participant',
  returning: 'Returning participant (progress already saved in this browser)',
  update: 'Updated certificate name or X handle',
};

export interface PendingRegistration {
  /** Submission ID, reused on every retry of this entry. */
  id: string;
  participantId: string;
  kind: RegistrationKind;
  name: string;
  xHandle?: string;
  submittedAt: string;
}

/** Keeps the outbox bounded if a browser stays offline for a long time; the oldest updates go first, never a first registration. */
export const OUTBOX_LIMIT = 20;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const KINDS: RegistrationKind[] = ['new', 'returning', 'update'];

export function parsePendingRegistration(v: unknown): PendingRegistration | null {
  if (!isObject(v) || !isId(v.id) || !isId(v.participantId)) return null;
  if (typeof v.kind !== 'string' || !KINDS.includes(v.kind as RegistrationKind)) return null;
  if (typeof v.submittedAt !== 'string' || Number.isNaN(Date.parse(v.submittedAt))) return null;
  if (typeof v.name !== 'string') return null;
  const name = validateName(v.name);
  if (!name.ok) return null;
  const entry: PendingRegistration = { id: v.id, participantId: v.participantId, kind: v.kind as RegistrationKind, name: name.value, submittedAt: v.submittedAt };
  if (v.xHandle !== undefined) {
    if (typeof v.xHandle !== 'string') return null;
    const x = validateXHandle(v.xHandle);
    if (!x.ok) return null;
    if (x.value) entry.xHandle = x.value;
  }
  return entry;
}

/** Invalid entries are dropped individually so one bad record never wipes the participant's progress. */
export function parseOutbox(v: unknown): PendingRegistration[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: PendingRegistration[] = [];
  for (const item of v) {
    const entry = parsePendingRegistration(item);
    if (entry && !seen.has(entry.id)) {
      seen.add(entry.id);
      out.push(entry);
    }
  }
  return out;
}

export function sameProfile(a: Profile | null, b: Profile): boolean {
  return !!a && a.name === b.name && (a.xHandle ?? '') === (b.xHandle ?? '');
}

export function enqueue(outbox: PendingRegistration[], entry: PendingRegistration): PendingRegistration[] {
  const next = [...outbox, entry];
  while (next.length > OUTBOX_LIMIT) {
    const i = next.findIndex((e) => e.kind === 'update');
    if (i === -1 || i === next.length - 1) break;
    next.splice(i, 1);
  }
  return next;
}
