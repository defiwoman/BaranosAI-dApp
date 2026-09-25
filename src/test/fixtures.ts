import { CASE_IDS } from '../domain/types';
import { REQUIRED_CHECKS } from '../domain/curriculum';
import type { LegacyDraft, UseCaseDraft } from '../domain/useCase';

export const ALL_CHECKS = CASE_IDS.flatMap((id) => REQUIRED_CHECKS[id]);

export const GOOD_DRAFT: UseCaseDraft = {
  title: 'Fair harbour berths',
  whoAndWhat: 'Small boat owners want fair berth allocations. The AI would rank requests using the harbour’s published rules.',
  whyVerify: 'Owners could challenge a specific ranking step. The rules themselves could still be unfair.',
};

/** A draft from the earlier five-step form (curriculum 3.0). */
export const LEGACY_DRAFT: LegacyDraft = {
  title: 'Fair harbour berths',
  problem: 'Small boat owners who want to know berth allocations were decided fairly.',
  aiRole: 'Rank berth requests using the harbour’s published allocation rules.',
  whyVerify: 'Owners who miss out could challenge a specific ranking step instead of arguing.',
  agreedRules: 'The model version, the request forms and the allocation rulebook, fixed in advance.',
  risks: 'Owners could give wrong boat sizes, or the rulebook itself might be unfair.',
  concepts: ['01', '02', '04'],
};

const doneCases = (at: string) => Object.fromEntries(CASE_IDS.map((id) => [id, { completedAt: at }]));

/** A v2 save (six simplified cases) whose owner earned the six-case certificate. */
export function v2FinishedSave(name = 'Lee', at = '2026-09-24T12:00:00.000Z') {
  return { version: 2, profile: { name }, passedChecks: [...ALL_CHECKS], cases: doneCases(at), certificate: { completedAt: at } };
}

/** A v3 save (five-step form) with all six cases done and an unsubmitted draft. */
export function v3WithDraft(draft: LegacyDraft = LEGACY_DRAFT, name = 'Rin', at = '2026-09-25T09:00:00.000Z') {
  return {
    version: 3,
    profile: { name },
    passedChecks: [...ALL_CHECKS],
    cases: doneCases(at),
    useCase: { draft, step: 3, submissionId: null, submission: null },
    certificate: null,
    earlierCertificate: null,
  };
}

/** A current (v4) save with all six cases done and the given three-field draft. */
export function v4CasesDone(draft: UseCaseDraft = { title: '', whoAndWhat: '', whyVerify: '' }, name = 'Rin', at = '2026-09-25T09:00:00.000Z') {
  return {
    version: 4,
    profile: { name },
    passedChecks: [...ALL_CHECKS],
    cases: doneCases(at),
    useCase: { draft, legacyDraft: null, submissionId: null, submission: null },
    certificate: null,
    earlierCertificate: null,
  };
}
