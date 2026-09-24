import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadProgress, saveProgress } from './adapters/storage';
import { emptyProgress, recordCompletion, saveCheckpoint, type Checkpoint, type Completion, type Progress } from './domain/progress';
import type { CaseId } from './domain/types';

interface ProgressValue {
  progress: Progress;
  recovered: boolean;
  dismissRecovered: () => void;
  complete: (c: Omit<Completion, 'at'>) => void;
  checkpoint: (caseId: CaseId, cp: Checkpoint | null) => void;
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

  const complete = useCallback((c: Omit<Completion, 'at'>) => {
    setProgress((p) => recordCompletion(p, { ...c, at: new Date() }));
  }, []);

  const checkpoint = useCallback((caseId: CaseId, cp: Checkpoint | null) => {
    setProgress((p) => saveCheckpoint(p, caseId, cp));
  }, []);

  const reset = useCallback(() => setProgress(emptyProgress()), []);

  return (
    <ProgressContext.Provider
      value={{ progress, recovered, dismissRecovered: () => setRecovered(false), complete, checkpoint, reset }}
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
