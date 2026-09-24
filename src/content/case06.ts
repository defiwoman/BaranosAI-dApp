import type { StagedCaseContent } from './types';
import { CURRICULUM_VERSION } from './curriculum';

/** Fictional scenario: whether a community repair workshop took place before a deadline. */
export const CASE06_QUESTION = {
  id: 'Q-0630',
  question: 'Did the Harbor Makers repair workshop take place on or before 30 June?',
  job: 'H-0630-v2',
  criteria: 'Counts as held if the venue’s attendance log shows at least 5 participants on a date on or before 30 June.',
  evidencePolicy: 'Only the venue’s signed attendance log is allowed. Evidence cutoff: 1 July, 12:00 UTC.',
  actionPolicy: [
    { status: 'Pending', action: 'Hold. Do nothing yet.' },
    { status: 'Disputed', action: 'Hold and notify the organiser.' },
    { status: 'Settled: YES', action: 'Award the “Workshop held” community badge.' },
    { status: 'Settled: NO', action: 'Close without a badge.' },
  ],
};

export const CASE06_RESULTS = [
  { id: 'R-71', job: 'H-0630-v1', note: 'Retired specification, evidence cutoff 20 June', answer: 'YES', status: 'Settled' },
  { id: 'R-88', job: 'H-0630-v2', note: 'Current specification', answer: 'YES', status: 'Posted: challenge window open' },
];

export const CASE06_EVIDENCE = [
  { id: 'log', title: 'Venue attendance log', detail: 'Signed by the venue · dated 28 June · 7 participants · committed and retrievable' },
  { id: 'photo', title: 'Attendee’s photo', detail: 'Posted on social media on 2 July' },
];

/** Status of R-88 as the story advances; index matches the stage that introduces it. */
export const CASE06_STATUS_UPDATES = [
  { fromStage: 0, status: 'Pending', text: 'R-88 posted. Challenge window open.' },
  { fromStage: 5, status: 'Disputed', text: 'A challenge has been raised against step 9 of R-88.' },
  { fromStage: 6, status: 'Settled: YES', text: 'Step 9 was replayed and matched the committed rules. The challenge was rejected; R-88 settled: YES.' },
];

export const CASE06: StagedCaseContent = {
  id: '06',
  job: `Question ${CASE06_QUESTION.id} · job ${CASE06_QUESTION.job}`,
  brief: [
    'Harbor wants to award a community badge if a fictional repair workshop took place on or before 30 June.',
    'Check the job, the criteria, the evidence, the settlement status, then the action. Harbor acts only on what you sign off.',
  ],
  stages: [
    {
      id: 'identity',
      heading: 'Job identity',
      task: {
        kind: 'choice',
        id: '06-identity',
        prompt: `Which result belongs to Harbor’s registered question (job ${CASE06_QUESTION.job})?`,
        options: [
          {
            id: 'r88',
            label: 'R-88 (job H-0630-v2)',
            correct: true,
            feedback: 'Right. R-88 answers the job Harbor registered for this question.',
          },
          {
            id: 'r71',
            label: 'R-71 (job H-0630-v1)',
            feedback:
              'R-71 answers the retired v1 job, which had a different evidence cutoff. It is settled and says YES, but it isn’t the job Harbor agreed to use.',
          },
          {
            id: 'either',
            label: 'Either: they both say YES.',
            feedback: 'Matching answers don’t make them the same job. Only the registered job’s result counts.',
          },
        ],
        finding: 'Job identity: R-88 answers registered job H-0630-v2',
      },
    },
    {
      id: 'criteria',
      heading: 'Agreed criteria',
      task: {
        kind: 'choice',
        id: '06-criteria',
        prompt: 'According to the registered question, what must the evidence show for a YES?',
        options: [
          {
            id: 'log',
            label: 'At least 5 participants in the venue’s attendance log, on a date on or before 30 June.',
            correct: true,
            feedback: 'Right. That is the criterion Harbor fixed before the job ran.',
          },
          {
            id: 'announced',
            label: 'The organiser announced that the workshop would happen.',
            feedback: 'An announcement is a plan, not evidence it took place. The criterion is the attendance log.',
          },
          {
            id: 'photo',
            label: 'Any photo showing the workshop.',
            feedback: 'The criterion names a specific record, the venue’s log, not any image.',
          },
        ],
        finding: 'Criteria: at least 5 participants in the venue log by 30 June',
      },
    },
    {
      id: 'evidence',
      heading: 'Evidence policy',
      task: {
        kind: 'choice',
        id: '06-evidence',
        prompt: 'Which evidence falls inside Harbor’s evidence policy?',
        options: [
          {
            id: 'log',
            label: 'The venue’s signed attendance log dated 28 June',
            correct: true,
            feedback: 'Right. It is the allowed source, it predates the cutoff, and it is committed and retrievable.',
          },
          {
            id: 'photo',
            label: 'The attendee’s photo posted on 2 July',
            feedback: 'The photo is not an allowed source, and it was posted after the 1 July cutoff.',
          },
          {
            id: 'both',
            label: 'Both: more evidence is better',
            feedback: 'The policy fixes which evidence counts. Adding sources outside it would change the job.',
          },
        ],
        finding: 'Evidence: venue log (allowed, before cutoff); photo excluded',
      },
    },
    {
      id: 'status',
      heading: 'Settlement status',
      task: {
        kind: 'choice',
        id: '06-status',
        prompt: 'What is R-88’s status right now?',
        options: [
          {
            id: 'pending',
            label: 'Pending: posted, challenge window open',
            correct: true,
            feedback: 'Right. It has been posted but not settled.',
          },
          {
            id: 'settled',
            label: 'Settled',
            feedback: 'Posted is not settled. The challenge window is still open.',
          },
          {
            id: 'disputed',
            label: 'Disputed',
            feedback: 'No challenge has been raised yet. An open window is not a dispute.',
          },
        ],
        finding: 'Status: pending',
      },
    },
    {
      id: 'action-pending',
      heading: 'Permitted action while pending',
      task: {
        kind: 'choice',
        id: '06-action-pending',
        prompt: 'What may Harbor do now, and why?',
        options: [
          {
            id: 'award',
            label: 'Award the badge, because R-88 says YES.',
            feedback: 'The answer may be right, but the timing isn’t. Harbor’s policy awards only on a settled YES.',
          },
          {
            id: 'hold-status',
            label: 'Hold, because the result is pending and the policy acts only on settled results.',
            correct: true,
            feedback: 'Right action, right reason: the policy ties the action to the settlement status.',
          },
          {
            id: 'hold-truth',
            label: 'Hold, because the AI might be wrong about the world.',
            feedback:
              'Holding is right, but not for that reason. The rule you are applying is about settlement status. Doubts about the evidence stay true even after settlement.',
          },
          {
            id: 'close',
            label: 'Close without a badge.',
            feedback: 'Closing is for a settled NO. The result is pending and says YES.',
          },
        ],
        finding: 'Action while pending: hold',
      },
    },
    {
      id: 'action-disputed',
      heading: 'Update: a challenge',
      mira: ['A challenge has just been raised against step 9 of R-88.'],
      task: {
        kind: 'choice',
        id: '06-action-disputed',
        prompt: 'R-88 is now disputed. What does Harbor’s policy permit?',
        options: [
          {
            id: 'notify',
            label: 'Hold and notify the organiser.',
            correct: true,
            feedback: 'Right. The policy has a specific action for disputed results.',
          },
          {
            id: 'award',
            label: 'Award the badge: the challenge is only an opinion.',
            feedback: 'A challenge is resolved by replaying the disputed step. Until then the result is not settled.',
          },
          {
            id: 'close',
            label: 'Close without a badge: a challenge means the result is wrong.',
            feedback: 'A challenge starts a replay; it is not a verdict. The replay may reject it.',
          },
          {
            id: 'silent',
            label: 'Hold without telling anyone.',
            feedback: 'Holding is right, but Harbor’s policy also says to notify the organiser while disputed.',
          },
        ],
        finding: 'Action while disputed: hold and notify',
      },
    },
    {
      id: 'action-settled',
      heading: 'Update: settlement',
      mira: ['Step 9 was replayed and matched the committed rules. The challenge was rejected, and R-88 has settled: YES.'],
      task: {
        kind: 'choice',
        id: '06-action-settled',
        prompt: 'What does Harbor’s policy permit now?',
        options: [
          {
            id: 'award',
            label: 'Award the badge: R-88 settled YES under the registered job.',
            correct: true,
            feedback: 'Right. Identity, criteria, evidence and status all check out, so the policy permits the award.',
          },
          {
            id: 'hold',
            label: 'Keep holding, because a challenge was raised.',
            feedback: 'The challenge has been resolved. The policy says to award on a settled YES.',
          },
          {
            id: 'rerun',
            label: 'Re-run the job including the attendee’s photo, to be sure.',
            feedback: 'The photo is outside the evidence policy, and adding it would make a different job.',
          },
        ],
        finding: 'Action once settled: award the badge',
      },
    },
    {
      id: 'uncertainty',
      heading: 'What is still uncertain?',
      task: {
        kind: 'choice',
        id: '06-uncertainty',
        prompt: 'Name one uncertainty that remains after settlement.',
        options: [
          {
            id: 'log',
            label: 'The venue’s log could be inaccurate, even though the job ran correctly.',
            correct: true,
            feedback:
              'Right. Settlement shows the agreed computation over the agreed evidence was not successfully challenged. It cannot vouch for the log itself.',
          },
          {
            id: 'commitment',
            label: 'None: the evidence commitment proves the workshop happened.',
            feedback: 'A commitment identifies the log. It says nothing about whether the log is accurate.',
          },
          {
            id: 'block',
            label: 'Fogo’s block time means the result might not be final.',
            feedback: 'Block time is how often blocks are produced. It says nothing about whether this result has settled.',
          },
          {
            id: 'none',
            label: 'None: a verified result is a true result.',
            feedback: 'Verification covers the computation, not whether the world matches the evidence.',
          },
        ],
        finding: 'Remaining risk: the attendance log itself could be wrong',
      },
    },
  ],
  resolution: {
    verdict: { tone: 'matches', label: 'Final review complete: action permitted' },
    consequence:
      'Harbor awards the fictional “Workshop held” badge on R-88’s settled YES. It held while R-88 was pending, and it held and notified the organiser while R-88 was disputed.',
    explanation: [
      'Before an application uses a result, it checks the job’s identity, the agreed criteria, the evidence policy and the settlement status, then takes only the action its policy permits for that status.',
      'Even then, uncertainty remains: verification covers the computation, not the accuracy of the evidence or the soundness of the conclusion.',
    ],
  },
  relation: {
    title: 'How this relates to Baranos',
    paragraphs: [
      'Baranos lets an application check the computation behind an AI result before acting on it. The result can then be consumed by another application under that application’s own rules.',
      'In posts on X on 21 and 22 September 2026, Fogo co-founder Robert Sagurton described enterprise adoption of verifiable AI. That is a thesis about the future, not a description of current adoption or customers.',
      'Harbor, the badge and the workshop are fictional, and this is not a prediction market or a live integration.',
    ],
    sources: [{ id: 'B2' }, { id: 'B3' }, { id: 'B1' }, { id: 'R1' }, { id: 'R2' }],
  },
  notebook: [
    {
      id: 'using-a-result',
      caseId: '06',
      category: 'Settlement',
      title: 'Checks before using a result',
      body: 'Job identity (is this the registered job?), agreed criteria, evidence policy, settlement status, and the action the application’s policy permits for that status. Name the uncertainty that remains afterwards.',
      sources: [{ id: 'B2' }, { id: 'B1' }],
      curriculumVersion: CURRICULUM_VERSION,
    },
    {
      id: 'model-registry',
      caseId: '06',
      category: 'Model',
      title: 'Versions matter',
      body: 'Two jobs can give the same answer under different specifications. An application uses only the result of the job it registered: the same model version, evidence policy and cutoff.',
      sources: [{ id: 'B1' }],
      curriculumVersion: CURRICULUM_VERSION,
    },
  ],
};
