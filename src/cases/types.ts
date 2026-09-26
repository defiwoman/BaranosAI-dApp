export interface ChallengeProps {
  /** Record a passed learning check. Only correct work calls this. */
  onPass: (check: string) => void;
  /** Checks this participant still needs for the case (empty when the case is complete). */
  missing: string[];
  /** True when the case was already complete before this visit (a replay). */
  replay: boolean;
  /** A finding was submitted and was wrong (feedback is shown by the challenge itself). */
  onWrong?: () => void;
  /** Every question in this visit has been answered correctly. */
  onSolved?: () => void;
  /** Optional system events from the challenge, e.g. "Challenge submitted". */
  onEvent?: (text: string, tone: 'info' | 'ok' | 'warn' | 'fail') => void;
}
