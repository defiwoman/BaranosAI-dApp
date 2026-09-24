import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadProgress, saveProgress } from './adapters/storage';
import { passCheck, resetProgress, setProfile, type Progress } from './domain/progress';
import type { Profile } from './domain/profile';

interface ProgressValue {
  progress: Progress;
  recovered: boolean;
  dismissRecovered: () => void;
  pass: (check: string) => void;
  saveProfile: (profile: Profile) => void;
  reset: () => void;
}

const ProgressContext = createContext<ProgressValue | null>(null);

export function ProgressProvider({ children, storage }: { children: ReactNode; storage?: Storage }) {
  const [initial] = useState(() => loadProgress(storage));
  const [progress, setProgress] = useState(initial.progress);
  const [recovered, setRecovered] = useState(initial.recovered);

  useEffect(() => {
    saveProgress(progress, storage);
  }, [progress, storage]);

  const pass = useCallback((check: string) => setProgress((p) => passCheck(p, check)), []);
  const saveProfile = useCallback((profile: Profile) => setProgress((p) => setProfile(p, profile)), []);
  const reset = useCallback(() => setProgress((p) => resetProgress(p)), []);

  return (
    <ProgressContext.Provider
      value={{ progress, recovered, dismissRecovered: () => setRecovered(false), pass, saveProfile, reset }}
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
