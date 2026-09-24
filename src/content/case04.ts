import type { ToyJob, Trace } from '../domain/toyModel';
import type { StagedCaseContent } from './types';
import { CURRICULUM_VERSION } from './curriculum';

/**
 * Harbor Attendance v1 has the same shape as Harbor Score v1:
 * expected attendance = 2 × registered households + 3 × group bookings.
 * Every number and event here is fictional.
 */
export const CASE04_JOB: ToyJob = {
  id: 'H-0412',
  model: 'Harbor Attendance v1',
  inputs: { x1: 7, x2: 4 },
  weights: { w1: 2, w2: 3 },
};

export const CASE04_TRACE: Trace = [
  { index: 1, op: 'multiply', left: 2, right: 7, output: 14 },
  { index: 2, op: 'multiply', left: 3, right: 4, output: 12 },
  { index: 3, op: 'add', left: 14, right: 12, output: 26 },
];

export const CASE04_CORRECTED_JOB: ToyJob = {
  id: 'H-0412-b',
  model: 'Harbor Attendance v1',
  inputs: { x1: 9, x2: 4 },
  weights: { w1: 2, w2: 3 },
};

export const CASE04_EVIDENCE = {
  used: {
    title: 'Registration sheet used by H-0412',
    lines: ['Riverside repair café · registered households: 7', 'Exported 12 June · status: draft (late registrations still open)'],
  },
  final: {
    title: 'Organiser’s signed final export',
    lines: ['Riverside repair café · registered households: 9', 'Exported 15 June · status: final · signed by the organiser'],
  },
  forum: {
    title: 'Community forum comment',
    lines: ['“Pretty sure about 12 households came along.”', 'Posted 20 June by a visitor'],
  },
  policy: [
    'Registration counts must come from the organiser’s signed final export.',
    'A correction is submitted as a new job. Settled results are never edited.',
  ],
};

export const CASE04: StagedCaseContent = {
  id: '04',
  job: 'Job H-0412 · Harbor Attendance v1 · settled result: 26',
  brief: [
    'H-0412 estimated attendance for a fictional repair café so volunteers could plan chairs and tables. It settled at 26.',
    'The organiser says the number is off. Check the work first.',
  ],
  stages: [
    {
      id: 'execution',
      heading: 'Check the execution',
      task: {
        kind: 'choice',
        id: '04-execution',
        prompt: 'Does H-0412’s execution follow the agreed job?',
        options: [
          {
            id: 'yes',
            label: 'Yes: every step follows the agreed rules with the committed inputs.',
            correct: true,
            feedback: 'Right. 2 × 7 = 14, 3 × 4 = 12 and 14 + 12 = 26. The execution matches the job.',
          },
          {
            id: 'step1',
            label: 'No: challenge step 1 (2 × 7 = 14).',
            feedback: '2 × 7 = 14 follows the rule with the committed input. A challenge needs a step that breaks the job’s rules.',
          },
          {
            id: 'step2',
            label: 'No: challenge step 2 (3 × 4 = 12).',
            feedback: '3 × 4 = 12 is correct for the committed input. There is nothing here to replay.',
          },
          {
            id: 'step3',
            label: 'No: challenge step 3 (14 + 12 = 26).',
            feedback: 'The sum uses the displayed values correctly, and those values are correct too.',
          },
        ],
        finding: 'Execution matches the job: 26 is what the agreed job computes',
      },
    },
    {
      id: 'diagnose',
      heading: 'Find what went wrong',
      mira: ['The organiser has sent their final export. Compare it with what the job used, and read Harbor’s evidence policy.'],
      task: {
        kind: 'choice',
        id: '04-diagnose',
        prompt: 'What is the problem with H-0412?',
        options: [
          {
            id: 'input',
            label: 'It used an input that doesn’t meet Harbor’s evidence policy: a draft export instead of the signed final export.',
            correct: true,
            feedback: 'Right. The computation was faithful to its inputs; one input was inaccurate evidence.',
          },
          {
            id: 'model',
            label: 'The model computed incorrectly.',
            feedback: 'You just confirmed every step follows the rules. The computation did what the job specified.',
          },
          {
            id: 'chain',
            label: 'The chain recorded the wrong number.',
            feedback: 'The chain recorded exactly what the committed job produced. The number was wrong before it reached the job.',
          },
        ],
        finding: 'Input problem: a draft export (7) was used instead of the signed final export (9)',
      },
    },
    {
      id: 'action',
      heading: 'Decide what Harbor should do',
      task: {
        kind: 'choice',
        id: '04-action',
        prompt: 'What should Harbor do about the attendance estimate?',
        options: [
          {
            id: 'challenge',
            label: 'Raise an execution challenge against H-0412.',
            feedback:
              'An execution challenge asks whether the job ran correctly under its rules. It does not rule on whether the inputs were true about the world, and this job ran correctly.',
          },
          {
            id: 'edit',
            label: 'Edit the settled H-0412 result to use 9 households.',
            feedback:
              'A settled result stays tied to its original specification. Editing it would make the record claim something no job computed.',
          },
          {
            id: 'new-job',
            label: 'Submit a new job with corrected evidence, following Harbor’s evidence policy.',
            correct: true,
            feedback: 'Right. The correction becomes a new job with its own evidence commitment, execution and settlement.',
          },
          {
            id: 'accept',
            label: 'Keep using 26: the computation was verified.',
            feedback: 'Verified execution means the job ran as agreed. It does not mean its inputs were accurate.',
          },
        ],
        finding: 'Action: propose a new job; H-0412 stays as recorded',
      },
    },
    {
      id: 'source',
      heading: 'Choose the corrected evidence',
      task: {
        kind: 'choice',
        id: '04-source',
        prompt: 'Which source may the new job use under Harbor’s evidence policy?',
        options: [
          {
            id: 'final',
            label: 'The organiser’s signed final export (9 households).',
            correct: true,
            feedback: 'Right. It is the source the policy names, so it can be committed as the new job’s evidence.',
          },
          {
            id: 'forum',
            label: 'The forum comment (about 12 households).',
            feedback: 'However plausible, a visitor’s comment is not an allowed source under Harbor’s policy.',
          },
          {
            id: 'average',
            label: 'The average of the draft and the forum comment.',
            feedback: 'Averaging two unsuitable sources doesn’t produce allowed evidence. The policy names one source.',
          },
        ],
        finding: 'New job H-0412-b uses the signed final export',
      },
    },
  ],
  resolution: {
    verdict: { tone: 'matches', label: 'Execution matches the job; the evidence was wrong' },
    consequence:
      'H-0412 remains on record as 26 under its original specification. A new job, H-0412-b, is proposed with the signed final export.',
    explanation: [
      'Correct execution means the agreed computation was performed faithfully. It does not make the conclusion true: an inaccurate input produces a faithfully computed, inaccurate result.',
      'Under Harbor’s policy, corrected evidence belongs to a new job with its own commitment and settlement. The historical result is not rewritten, and an execution challenge is not a way to dispute facts about the world.',
    ],
  },
  relation: {
    title: 'How this relates to Baranos',
    paragraphs: [
      'Baranos presents verification as establishing that a computation conformed to the agreed job, not that the model’s conclusion is true. For language models the same gap covers hallucination, bias and poor domain judgement.',
      'Evidence policy is the application’s responsibility: which sources are allowed, when evidence is frozen, and how corrections are handled. In this game that policy is Harbor’s; it is not a Baranos rule.',
    ],
    sources: [{ id: 'B2' }, { id: 'B1' }],
  },
  hook: 'The next record didn’t just contain a wrong number. It contained an instruction.',
  notebook: [
    {
      id: 'execution-vs-truth',
      caseId: '04',
      category: 'Limitations',
      title: 'Correct execution is not a true conclusion',
      body: 'Verification can show that the agreed computation ran as specified. It does not show the inputs were accurate or that the model’s answer is true. Inaccurate evidence gives a faithfully computed wrong answer.',
      sources: [{ id: 'B2' }, { id: 'B1' }],
      curriculumVersion: CURRICULUM_VERSION,
    },
    {
      id: 'evidence-policy',
      caseId: '04',
      category: 'Evidence',
      title: 'Evidence policy and corrections',
      body: 'An application decides which sources count as evidence, when evidence is frozen and how corrections work. A correction is a new job with new committed evidence; a settled historical result stays tied to its original specification.',
      sources: [{ id: 'B1' }],
      curriculumVersion: CURRICULUM_VERSION,
    },
  ],
};
