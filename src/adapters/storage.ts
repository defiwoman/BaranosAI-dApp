import { emptyProgress, parseProgress, type Progress } from '../domain/progress';

/** Unchanged since the first release so existing saves are found and migrated in place. */
export const STORAGE_KEY = 'baranos-lab:progress';

export type LoadResult = { progress: Progress; recovered: boolean; migrated: boolean };

/** Loads saved progress, migrating older versions. Invalid or unreadable data is replaced with a fresh record. */
export function loadProgress(storage: Storage | undefined = safeStorage()): LoadResult {
  const fresh = { progress: emptyProgress(), recovered: false, migrated: false };
  if (!storage) return fresh;
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return fresh;
  }
  const parsed = parseProgress(raw);
  if (parsed.ok) {
    if (parsed.migratedFrom !== undefined) saveProgress(parsed.progress, storage);
    return { progress: parsed.progress, recovered: false, migrated: parsed.migratedFrom !== undefined };
  }
  if (parsed.reason === 'empty') return fresh;
  saveProgress(fresh.progress, storage);
  return { ...fresh, recovered: true };
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
