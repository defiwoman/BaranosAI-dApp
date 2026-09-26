import { CASE_IDS } from '../domain/types';
import { REQUIRED_CHECKS } from '../domain/curriculum';
import { composeAnswers, type LegacyDraft, type UseCaseAnswers, type UseCaseDraft } from '../domain/useCase';

export const ALL_CHECKS = CASE_IDS.flatMap((id) => REQUIRED_CHECKS[id]);

/** A complete four-step design. */
export const GOOD_DRAFT: UseCaseDraft = {
  title: 'Fair harbour berths',
  who: 'Small boat owners who want fair berth allocations.',
  decides: 'The AI ranks berth requests using the harbour’s published rules.',
  verifiable: 'The model version, request forms and rulebook are committed, so any ranking can be replayed.',
  risks: 'The rules themselves could still be unfair.',
};

export const GOOD_ANSWERS: UseCaseAnswers = composeAnswers(GOOD_DRAFT);

/** A draft from the five-step form (curriculum 3.0). */
export const LEGACY_DRAFT: LegacyDraft = {
  title: 'Fair harbour berths',
  problem: 'Small boat owners who want to know berth allocations were decided fairly.',
  aiRole: 'Rank berth requests using the harbour’s published allocation rules.',
  whyVerify: 'Owners who miss out could challenge a specific ranking step instead of arguing.',
  agreedRules: 'The model version, the request forms and the allocation rulebook, fixed in advance.',
  risks: 'Owners could give wrong boat sizes, or the rulebook itself might be unfair.',
  concepts: ['01', '02', '04'],
};

/** A draft from the three-field form (curriculum 3.1). */
export const THREE_FIELD: UseCaseAnswers = {
  title: 'Honest harbour',
  whoAndWhat: 'Boat owners need fair berths.\n\nThe AI ranks requests.',
  whyVerify: 'Rankings can be replayed.\n\nThe rules may be unfair.',
};

const doneCases = (at: string) => Object.fromEntries(CASE_IDS.map((id) => [id, { completedAt: at }]));

export function v2FinishedSave(name = 'Lee', at = '2026-09-24T12:00:00.000Z') {
  return { version: 2, profile: { name }, passedChecks: [...ALL_CHECKS], cases: doneCases(at), certificate: { completedAt: at } };
}

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

export function v4WithDraft(draft: UseCaseAnswers = THREE_FIELD, name = 'Rin', at = '2026-09-25T09:00:00.000Z') {
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

/** A current (v5) save with all six cases done and the given design draft. */
export function v5CasesDone(draft: UseCaseDraft = { title: '', who: '', decides: '', verifiable: '', risks: '' }, name = 'Rin', at = '2026-09-25T09:00:00.000Z') {
  return {
    version: 5,
    profile: { name },
    passedChecks: [...ALL_CHECKS],
    cases: doneCases(at),
    useCase: { draft, legacyDraft: null, threeFieldDraft: null, submissionId: null, submission: null },
    certificate: null,
    earlierCertificate: null,
  };
}

/** A v5 save with a profile and the given cases complete. */
export function v5WithCases(ids: string[], name = 'Zoë') {
  const checks = ids.flatMap((id) => REQUIRED_CHECKS[id as keyof typeof REQUIRED_CHECKS]);
  return {
    ...v5CasesDone(undefined, name),
    passedChecks: checks,
    cases: Object.fromEntries(ids.map((id) => [id, { completedAt: '2026-09-25T09:00:00.000Z' }])),
  };
}
