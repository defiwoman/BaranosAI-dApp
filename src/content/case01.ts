import type { ToyJob, Trace } from '../domain/toyModel';

export interface Case01Fixture {
  job: ToyJob;
  submitted: Trace;
  submittedScore: number;
}

/** The exact job from the casebook: 2 × 4 + 3 × 5, submitted as 25, correct answer 23. Always used first. */
export const CASE01_PRIMARY: Case01Fixture = {
  job: { id: 'H-0101', model: 'Harbor Score v1', inputs: { x1: 4, x2: 5 }, weights: { w1: 2, w2: 3 } },
  submitted: [
    { index: 1, op: 'multiply', left: 2, right: 4, output: 8 },
    { index: 2, op: 'multiply', left: 3, right: 5, output: 17 },
    { index: 3, op: 'add', left: 8, right: 17, output: 25 },
  ],
  submittedScore: 25,
};

/** Optional practice rounds. The error moves, so the idea is practised rather than a button position. */
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

export const CASE01_FEEDBACK = {
  stepCorrect: (remaining: 'products' | 'steps') =>
    `This step follows the agreed rule, so there’s nothing to challenge here. Check the remaining ${remaining}.`,
  stepDownstream:
    'The addition is done correctly with the numbers shown. The problem starts earlier: one of those numbers is already wrong.',
  acceptRejected: 'Not so fast. Check each step against the agreed rule before accepting the score.',
  challengeAccepted: 'Good catch: this step breaks the agreed rule. Now replay it to see what the correct result should be.',
  noStepSelected: 'Pick the step you want to challenge first.',
};
