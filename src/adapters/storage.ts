import { emptyProgress, parseProgress, type Progress } from '../domain/progress';

export const STORAGE_KEY = 'baranos-lab:progress';

export type LoadResult = { progress: Progress; recovered: boolean };

/** Loads guest progress. Invalid or unreadable data is replaced with a fresh record. */
export function loadProgress(storage: Storage | undefined = safeStorage()): LoadResult {
  if (!storage) return { progress: emptyProgress(), recovered: false };
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { progress: emptyProgress(), recovered: false };
  }
  const parsed = parseProgress(raw);
  if (parsed.ok) return { progress: parsed.progress, recovered: false };
  if (parsed.reason === 'empty') return { progress: emptyProgress(), recovered: false };
  const fresh = emptyProgress();
  saveProgress(fresh, storage);
  return { progress: fresh, recovered: true };
}

export function saveProgress(progress: Progress, storage: Storage | undefined = safeStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}
