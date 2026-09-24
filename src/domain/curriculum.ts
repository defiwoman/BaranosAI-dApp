import type { CaseId } from './types';

/**
 * The learning checks each case requires, for the current curriculum. A case is complete
 * only when every one of its checks has been passed. Content question IDs must match these.
 */
export const REQUIRED_CHECKS: Record<CaseId, readonly string[]> = {
  '01': ['01-replay'],
  '02': ['02-same-task'],
  '03': ['03-settled'],
  '04': ['04-evidence'],
  '05': ['05-injection'],
  '06': ['06-review-reproduce', '06-review-settled', '06-review-limits'],
};

/**
 * Checks that a completion saved by the first release (progress v1) already demonstrated.
 * The old Case 06 asked players to hold while a result was pending and to name what
 * verification cannot establish, but it had no reproducibility question, so that single
 * check is still asked of those players.
 */
export const V1_COMPLETION_GRANTS: Record<CaseId, readonly string[]> = {
  '01': REQUIRED_CHECKS['01'],
  '02': REQUIRED_CHECKS['02'],
  '03': REQUIRED_CHECKS['03'],
  '04': REQUIRED_CHECKS['04'],
  '05': REQUIRED_CHECKS['05'],
  '06': ['06-review-settled', '06-review-limits'],
};
