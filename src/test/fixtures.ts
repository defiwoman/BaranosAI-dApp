import { CASE_IDS } from '../domain/types';
import { REQUIRED_CHECKS } from '../domain/curriculum';
import type { UseCaseDraft } from '../domain/useCase';

export const ALL_CHECKS = CASE_IDS.flatMap((id) => REQUIRED_CHECKS[id]);

export const GOOD_DRAFT: UseCaseDraft = {
  title: 'Fair harbour berths',
  problem: 'Small boat owners who want to know berth allocations were decided fairly.',
  aiRole: 'Rank berth requests using the harbour’s published allocation rules.',
  whyVerify: 'Owners who miss out could challenge a specific ranking step instead of arguing.',
  agreedRules: 'The model version, the request forms and the allocation rulebook, fixed in advance.',
  risks: 'Owners could give wrong boat sizes, or the rulebook itself might be unfair.',
  concepts: ['01', '02', '04'],
};

/** A v2 save (six simplified cases) whose owner earned the six-case certificate. */
export function v2FinishedSave(name = 'Lee', at = '2026-09-24T12:00:00.000Z') {
  return {
    version: 2,
    profile: { name },
    passedChecks: [...ALL_CHECKS],
    cases: Object.fromEntries(CASE_IDS.map((id) => [id, { completedAt: at }])),
    certificate: { completedAt: at },
  };
}

/** A v3 save with all six cases done and no use case yet. */
export function v3CasesDone(name = 'Rin', at = '2026-09-25T09:00:00.000Z') {
  return {
    version: 3,
    profile: { name },
    passedChecks: [...ALL_CHECKS],
    cases: Object.fromEntries(CASE_IDS.map((id) => [id, { completedAt: at }])),
    useCase: { draft: { title: '', problem: '', aiRole: '', whyVerify: '', agreedRules: '', risks: '', concepts: [] }, step: 0, submissionId: null, submission: null },
    certificate: null,
    earlierCertificate: null,
  };
}
