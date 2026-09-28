import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { loadProgress, saveProgress } from './adapters/storage';
import { submitRegistration } from './adapters/submission';
import {
  markRegistrationDelivered,
  passCheck,
  recordSubmission,
  resetProgress,
  saveDraft,
  setProfile,
  withSubmissionId,
  type Progress,
  type Submission,
} from './domain/progress';
import type { UseCaseDraft } from './domain/useCase';
import type { Profile } from './domain/profile';

interface ProgressValue {
  progress: Progress;
  recovered: boolean;
  dismissRecovered: () => void;
  pass: (check: string) => void;
  saveProfile: (profile: Profile) => void;
  saveDraft: (draft: UseCaseDraft) => void;
  setSubmissionId: (id: string) => void;
  recordSubmission: (submission: Submission) => void;
  reset: () => void;
}

const ProgressContext = createContext<ProgressValue | null>(null);

/** Waits between retries of an unsent entry form within one visit. It is also retried when the browser comes back online and on the next visit. */
export const RETRY_DELAYS_MS = [15_000, 60_000, 5 * 60_000];

/**
 * Sends queued entry-form submissions one at a time, oldest first. An entry leaves the queue only
 * after the server confirms it stored it, so a failure is never silently dropped; the same
 * submission ID is reused on every retry.
 */
function useRegistrationOutbox(progress: Progress, setProgress: (f: (p: Progress) => Progress) => void) {
  const sending = useRef(false);
  const failures = useRef(0);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [tick, setTick] = useState(0);
  const next = progress.outbox[0];

  useEffect(() => {
    mounted.current = true;
    const online = () => {
      failures.current = 0;
      setTick((t) => t + 1);
    };
    window.addEventListener('online', online);
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      window.removeEventListener('online', online);
    };
  }, []);

  useEffect(() => {
    if (!next || sending.current) return;
    sending.current = true;
    clearTimeout(timer.current);
    void submitRegistration(next).then((r) => {
      sending.current = false;
      if (!mounted.current) return;
      if (r.ok) {
        failures.current = 0;
        setProgress((p) => markRegistrationDelivered(p, next.id));
        return;
      }
      const delay = RETRY_DELAYS_MS[failures.current++];
      if (delay !== undefined) timer.current = setTimeout(() => setTick((t) => t + 1), delay);
    });
  }, [next, tick, setProgress]);
}

export function ProgressProvider({ children, storage }: { children: ReactNode; storage?: Storage }) {
  const [initial] = useState(() => loadProgress(storage));
  const [progress, setProgress] = useState(initial.progress);
  const [recovered, setRecovered] = useState(initial.recovered);

  useEffect(() => {
    saveProgress(progress, storage);
  }, [progress, storage]);

  useRegistrationOutbox(progress, setProgress);

  const pass = useCallback((check: string) => setProgress((p) => passCheck(p, check)), []);
  const saveProfile = useCallback((profile: Profile) => setProgress((p) => setProfile(p, profile)), []);
  const saveDraftCb = useCallback((draft: UseCaseDraft) => setProgress((p) => saveDraft(p, draft)), []);
  const setSubmissionId = useCallback((id: string) => setProgress((p) => withSubmissionId(p, id)), []);
  const record = useCallback((s: Submission) => setProgress((p) => recordSubmission(p, s)), []);
  const reset = useCallback(() => setProgress((p) => resetProgress(p)), []);

  return (
    <ProgressContext.Provider
      value={{
        progress,
        recovered,
        dismissRecovered: () => setRecovered(false),
        pass,
        saveProfile,
        saveDraft: saveDraftCb,
        setSubmissionId,
        recordSubmission: record,
        reset,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressValue {
  const value = useContext(ProgressContext);
  if (!value) throw new Error('useProgress outside ProgressProvider');
  return value;
}
