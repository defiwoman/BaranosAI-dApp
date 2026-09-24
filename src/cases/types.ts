export interface ChallengeProps {
  /** Record a passed learning check. Only correct work calls this. */
  onPass: (check: string) => void;
  /** Checks this participant still needs for the case (empty when the case is complete). */
  missing: string[];
  /** True when the case was already complete before this visit (a replay). */
  replay: boolean;
}
