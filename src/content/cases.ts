import type { CaseId } from '../domain/types';
import type { CaseSummary } from './types';

export const STORY_PREMISE =
  'Harbor, a demonstration app, wants to act on AI results. Join its review desk and decide which results it may use.';

export const CASES: CaseSummary[] = [
  {
    id: '01',
    title: 'The disputed score',
    storyEvent: 'A submitted result does not match a simple agreed calculation.',
    objective: 'Find the step that breaks the agreed rules, challenge it and replay it.',
    concept: 'Execution mismatch and step replay',
    playable: true,
  },
  {
    id: '02',
    title: 'The missing file',
    storyEvent: 'The original operator is offline and a reviewer must reproduce the job alone.',
    objective: 'Assemble the complete job and tell changed evidence apart from unavailable evidence.',
    concept: 'Job specification and data availability',
    playable: true,
  },
  {
    id: '03',
    title: 'The waiting result',
    storyEvent: 'Harbor acted on a posted result before it settled.',
    objective: 'Compare Confirmation and Replay, and separate posting from settlement.',
    concept: 'Posting, challenge and settlement',
    playable: true,
  },
  {
    id: '04',
    title: 'The misleading evidence',
    storyEvent: 'Every step is computed correctly, but one input is wrong.',
    objective: 'Separate correct execution from a truthful conclusion and handle a correction as a new job.',
    concept: 'Execution integrity versus answer quality',
    playable: true,
  },
  {
    id: '05',
    title: 'The rules inside the record',
    storyEvent: 'An evidence document tells the model to ignore its task.',
    objective: 'Distinguish text inside evidence from the agreed application policy.',
    concept: 'Evidence versus policy (prompt injection risk)',
    playable: true,
  },
  {
    id: '06',
    title: 'The final review',
    storyEvent: 'Harbor wants to act on whether a fictional workshop took place.',
    objective: 'Check job identity, criteria, evidence policy and settlement, then choose the permitted action.',
    concept: 'Deciding when a result may be used',
    playable: true,
  },
];

export function caseById(id: CaseId): CaseSummary {
  const found = CASES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown case ${id}`);
  return found;
}
