import type { ToyJob, Trace } from '../domain/toyModel';
import type { NotebookEntry, SourceRef, TechnicalNote } from './types';
import { CURRICULUM_VERSION } from './curriculum';

export interface Case01Fixture {
  job: ToyJob;
  submitted: Trace;
  /** Shown in the brief. */
  submittedScore: number;
}

/** The exact job from the casebook. Always used for the first play. */
export const CASE01_PRIMARY: Case01Fixture = {
  job: {
    id: 'H-0101',
    model: 'Harbor Score v1',
    inputs: { x1: 4, x2: 5 },
    weights: { w1: 2, w2: 3 },
  },
  submitted: [
    { index: 1, op: 'multiply', left: 2, right: 4, output: 8 },
    { index: 2, op: 'multiply', left: 3, right: 5, output: 17 },
    { index: 3, op: 'add', left: 8, right: 17, output: 25 },
  ],
  submittedScore: 25,
};

/** Practice variants for replays. The error moves, so replay tests the idea, not the button position. */
export const CASE01_PRACTICE: Case01Fixture[] = [
  {
    job: { id: 'H-0101-p1', model: 'Harbor Score v1', inputs: { x1: 6, x2: 2 }, weights: { w1: 2, w2: 3 } },
    submitted: [
      { index: 1, op: 'multiply', left: 2, right: 6, output: 13 },
      { index: 2, op: 'multiply', left: 3, right: 2, output: 6 },
      { index: 3, op: 'add', left: 13, right: 6, output: 19 },
    ],
    submittedScore: 19,
  },
  {
    job: { id: 'H-0101-p2', model: 'Harbor Score v1', inputs: { x1: 3, x2: 7 }, weights: { w1: 2, w2: 3 } },
    submitted: [
      { index: 1, op: 'multiply', left: 2, right: 3, output: 6 },
      { index: 2, op: 'multiply', left: 3, right: 7, output: 21 },
      { index: 3, op: 'add', left: 6, right: 21, output: 28 },
    ],
    submittedScore: 28,
  },
];

export const CASE01 = {
  brief: (score: number) => [
    `Harbor received a score of ${score}. The calculation is small enough to check ourselves.`,
    'Inspect the work and find whether a step breaks the agreed rules.',
  ],
  hint: 'Start with the multiplication steps.',
  feedback: {
    stepCorrect: (remaining: 'products' | 'steps') =>
      `This step matches the agreed calculation. Inspect the remaining ${remaining}.`,
    stepDownstream: 'The addition uses the displayed values correctly. Look earlier for the first incorrect value.',
    acceptRejected: 'Check each step against the agreed calculation before accepting the score.',
    challengeAccepted: 'This step breaks the agreed rule. Replay it under the agreed job to see the consequence.',
    noStepSelected: 'Select the step you want to challenge first.',
  },
  resolution: (corrected: number) =>
    `The replay found a calculation error and corrected the score to ${corrected}. This tells us the result follows this toy job's rules. It does not tell us whether the inputs were good evidence for a real-world decision.`,
  hook: 'The next job arrived without its complete dossier. Before we can check its result, we need to know what was supposed to run.',
  relation: {
    title: 'How this relates to Baranos',
    paragraphs: [
      'Baranos describes jobs that fix the model, evidence and execution rules, so independent participants can reproduce a computation and challenge a result. In Confirmation mode, inference normally runs offchain; a challenged portion is replayed and adjudicated onchain under the committed rules.',
      'This case imitates that idea with a three-step arithmetic trace. The game exposes a tiny trace for teaching; it does not reproduce the production dispute protocol, and Harbor Score v1 is not an LLM.',
    ],
    sources: [{ id: 'B2' }, { id: 'B1' }] as SourceRef[],
  } satisfies TechnicalNote,
};

export const CASE01_NOTEBOOK: NotebookEntry = {
  id: 'execution-mismatch',
  caseId: '01',
  category: 'Challenges',
  title: 'Execution mismatch',
  body: 'A challenge targets a specific step that breaks the agreed job. Replaying that step under the agreed rules corrects it and everything downstream of it. Disagreeing with the final answer is not the same as identifying the step that is wrong.',
  sources: [{ id: 'B1' }, { id: 'B2' }],
  curriculumVersion: CURRICULUM_VERSION,
};
