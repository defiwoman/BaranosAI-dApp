import type { ReactNode } from 'react';

export interface CaseProps {
  /** Called once when the case is first resolved in this visit. */
  onComplete: (result: { decisions: number; wrongDecisions: number }) => void;
  alreadyCompleted: boolean;
  /** The primary next step after resolution, e.g. a link to the next case. */
  nextAction: ReactNode;
}
