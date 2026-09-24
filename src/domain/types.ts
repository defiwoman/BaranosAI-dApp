export const CASE_IDS = ['01', '02', '03', '04', '05', '06'] as const;
export type CaseId = (typeof CASE_IDS)[number];

export function isCaseId(value: unknown): value is CaseId {
  return typeof value === 'string' && (CASE_IDS as readonly string[]).includes(value);
}

/** Every adapter must say whether its results are simulated or from a live system. */
export type AdapterMode = 'simulation' | 'live';
