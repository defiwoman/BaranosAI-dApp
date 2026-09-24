import type { StagedCaseContent } from './types';
import { CURRICULUM_VERSION } from './curriculum';

export interface TimelineEvent {
  id: string;
  label: string;
  where: 'offchain' | 'onchain' | 'harbor';
}

/** Illustrative order of events for H-0305. Deliberately no durations: this is not a latency claim. */
export const CASE03_TIMELINE: TimelineEvent[] = [
  { id: 'spec', label: 'Job specified: model, evidence and rules committed', where: 'onchain' },
  { id: 'compute', label: 'Operator computes the result', where: 'offchain' },
  { id: 'post', label: 'Result posted onchain', where: 'onchain' },
  { id: 'act', label: 'Harbor unlocks the next project stage', where: 'harbor' },
  { id: 'window', label: 'Challenge window open', where: 'onchain' },
  { id: 'settle', label: 'Window closes; result settles under the challenge policy', where: 'onchain' },
];

export const CASE03_POLICY = 'Harbor acts only on settled results.';

export const CASE03_ROUTES = {
  confirmation: [
    'Job is specified and committed',
    'Inference normally runs offchain',
    'Result is posted onchain',
    'A challenger can dispute a specific portion',
    'Only the disputed portion is replayed onchain under the committed rules',
    'Result settles under the challenge policy',
  ],
  replay: ['Job is specified and committed', 'Execution happens onchain from the outset', 'Result is produced onchain'],
};

export const CASE03: StagedCaseContent = {
  id: '03',
  job: 'Job H-0305 · Harbor Reader 2B r3 · grant report review',
  brief: [
    'H-0305 checked out, but Harbor didn’t wait for the check. It acted as soon as a result appeared.',
    'Find what happened too early, then work out which route this job took.',
  ],
  stages: [
    {
      id: 'premature',
      heading: 'Find the premature action',
      task: {
        kind: 'choice',
        id: '03-premature',
        prompt: `Harbor’s policy: “${CASE03_POLICY}” Which event happened too early?`,
        options: [
          {
            id: 'compute',
            label: 'Operator computes the result',
            feedback: 'Computing first and posting afterwards is the normal order. Look at what Harbor did.',
          },
          {
            id: 'post',
            label: 'Result posted onchain',
            feedback: 'Posting is how the result reaches the chain. The problem is what someone did right after it.',
          },
          {
            id: 'act',
            label: 'Harbor unlocks the next project stage',
            correct: true,
            feedback: 'Right. Harbor acted on a posted result while it could still be challenged.',
          },
          {
            id: 'window',
            label: 'Challenge window open',
            feedback: 'The challenge window should follow posting. It is where a bad result can be disputed.',
          },
        ],
        finding: 'Harbor acted on a posted, unsettled result',
      },
    },
    {
      id: 'reorder',
      heading: 'Put Harbor’s action in the right place',
      task: {
        kind: 'choice',
        id: '03-reorder',
        prompt: 'Under Harbor’s policy, when may it unlock the next project stage?',
        options: [
          {
            id: 'after-post',
            label: 'Right after the result is posted',
            feedback: 'That is what went wrong. A posted result is a claim that can still be challenged.',
          },
          {
            id: 'during-window',
            label: 'While the challenge window is open',
            feedback:
              'During the window the result can still be disputed and corrected. Acting now risks acting on a result that later changes.',
          },
          {
            id: 'after-settle',
            label: 'After the result settles',
            correct: true,
            feedback: 'Right. Posting puts a result on the chain; settlement is when Harbor’s policy lets it act.',
          },
          {
            id: 'before-compute',
            label: 'As soon as the job is specified',
            feedback: 'At that point there is no result at all. Harbor would be acting on nothing.',
          },
        ],
        finding: 'Harbor’s action belongs after settlement',
      },
    },
    {
      id: 'route',
      heading: 'Which route did H-0305 take?',
      mira: ['Baranos describes two routes. Compare them against H-0305’s timeline.'],
      task: {
        kind: 'choice',
        id: '03-route',
        prompt: 'H-0305 was computed offchain and then posted. Which route is that?',
        options: [
          {
            id: 'confirmation',
            label: 'Confirmation',
            correct: true,
            feedback: 'Right. In Confirmation, inference normally runs offchain; only a disputed portion is replayed onchain.',
          },
          {
            id: 'replay',
            label: 'Replay',
            feedback: 'In Replay, execution happens onchain from the outset. H-0305 was computed offchain first.',
          },
          {
            id: 'unknown',
            label: 'Can’t tell from the timeline',
            feedback: 'The timeline does say where the work happened: the operator computed offchain before posting.',
          },
        ],
        finding: 'Route: Confirmation (offchain compute, onchain posting)',
      },
    },
    {
      id: 'statements',
      heading: 'Sort the claims',
      task: {
        kind: 'sort',
        id: '03-statements',
        prompt: 'Is each statement an accurate description of Confirmation, of Replay, or inaccurate?',
        categories: [
          { id: 'confirmation', label: 'Accurate: Confirmation' },
          { id: 'replay', label: 'Accurate: Replay' },
          { id: 'neither', label: 'Inaccurate' },
        ],
        items: [
          {
            id: 'offchain',
            label: 'Inference normally runs offchain; a disputed portion can be replayed onchain.',
            answer: 'confirmation',
            feedback: {
              replay: 'Replay runs onchain from the start. Offchain compute with disputed-step replay is Confirmation.',
              neither: 'This is an accurate description of Confirmation.',
            },
          },
          {
            id: 'onchain',
            label: 'Execution happens onchain from the outset.',
            answer: 'replay',
            feedback: {
              confirmation: 'Confirmation computes offchain first. Onchain from the start is Replay.',
              neither: 'This is an accurate description of Replay.',
            },
          },
          {
            id: 'posted-settled',
            label: 'A Confirmation result is final as soon as it is posted.',
            answer: 'neither',
            feedback: {
              confirmation: 'It mentions Confirmation, but it is inaccurate: a posted result can still be challenged before it settles.',
              replay: 'This statement is about Confirmation, and it is inaccurate: posting and settlement are different moments.',
            },
          },
          {
            id: 'block-time',
            label: 'Fogo’s block time tells you how long an AI inference takes.',
            answer: 'neither',
            feedback: {
              confirmation: 'Block time is how often the chain produces blocks. Inference time and time to settlement are different measurements.',
              replay: 'Even when execution is onchain, one inference can span many transactions. Block time is not inference latency, so the statement is inaccurate.',
            },
          },
          {
            id: 'silence',
            label: 'If nobody challenges, the result is guaranteed correct.',
            answer: 'neither',
            feedback: {
              confirmation:
                'An unchallenged result relies on assumptions: the data was available and someone capable was checking within the window.',
              replay: 'This is about challenges going unused, and it overstates what silence shows. It is inaccurate.',
            },
          },
        ],
        success: 'Sorted. Where the work runs, when a result is settled and how long things take are separate questions.',
        finding: 'Confirmation and Replay distinguished; block time ≠ inference time',
      },
    },
    {
      id: 'challenge',
      heading: 'A challenge arrives',
      mira: ['Suppose a reviewer had raised a valid challenge against step 14 of H-0305 while the window was open.'],
      task: {
        kind: 'choice',
        id: '03-challenge',
        prompt: 'What happens next under the Confirmation route?',
        options: [
          {
            id: 'replayed',
            label: 'The disputed step is replayed onchain under the committed rules, and Harbor keeps waiting.',
            correct: true,
            feedback: 'Right. The replay settles the dispute about that step, and Harbor waits for the outcome.',
          },
          {
            id: 'opinion',
            label: 'Harbor keeps the posted result; a challenge is only an opinion.',
            feedback: 'A valid challenge names a step that breaks the committed rules. It is settled by replay, not ignored.',
          },
          {
            id: 'replace',
            label: 'The challenger’s preferred answer replaces the result.',
            feedback: 'Disagreeing with an answer is not a challenge. The replay under the committed rules decides, not the challenger.',
          },
          {
            id: 'new-model',
            label: 'The whole job is rerun from scratch with a different model.',
            feedback: 'The model and rules are fixed by the job. Confirmation replays the disputed portion under those same rules.',
          },
        ],
        finding: 'A challenge is resolved by replaying the disputed step',
      },
    },
  ],
  resolution: {
    verdict: { tone: 'hold', label: 'Premature action found' },
    consequence:
      'Harbor’s unlock moves to after settlement. H-0305 took the Confirmation route: computed offchain, posted onchain, open to challenge, then settled.',
    explanation: [
      'Posting a result and settling it are different moments. Between them, the result can be challenged, and a valid challenge is resolved by replaying the disputed portion under the committed rules.',
      'Settling without a challenge is not proof of correctness on its own. It depends on the data being available and on capable participants checking within the policy’s window.',
    ],
  },
  relation: {
    title: 'How this relates to Baranos',
    paragraphs: [
      'Baranos describes Confirmation mode as offchain inference with onchain verification and replay of disputed steps. Replay mode executes onchain from the outset. The timeline here is illustrative and has no durations; it is not a measurement of either mode.',
      'On 17 September 2026, Doug Colkitt reported on X that an LLM had run entirely onchain on Fogo testnet, with every step a standard SVM transaction. He described Qwen3.5-4B with a 30-token prompt and a 52-token completion, at about 300 seconds per decode token and roughly 30% chain utilisation. That is a reported research demonstration under those conditions, not a Baranos benchmark. It also shows that Fogo block time and AI inference time are different measurements.',
    ],
    sources: [{ id: 'B2' }, { id: 'B1', locator: '§3 and §§4–5' }, { id: 'D1' }],
  },
  hook: 'The next job settled cleanly and every step checks out. Something is still wrong with the answer.',
  notebook: [
    {
      id: 'posting-settlement',
      caseId: '03',
      category: 'Settlement',
      title: 'Posted is not settled',
      body: 'A posted result can still be challenged. An application that should act only on final results waits for settlement under the challenge policy. An unchallenged result still depends on data availability and on someone capable checking.',
      sources: [{ id: 'B2' }, { id: 'B1', locator: '§3' }],
      curriculumVersion: CURRICULUM_VERSION,
    },
    {
      id: 'confirmation-replay',
      caseId: '03',
      category: 'Challenges',
      title: 'Confirmation and Replay',
      body: 'Confirmation: inference normally runs offchain, and a disputed portion is replayed onchain under the committed rules. Replay: execution happens onchain from the outset.',
      sources: [{ id: 'B2' }, { id: 'B1', locator: '§3' }],
      curriculumVersion: CURRICULUM_VERSION,
    },
    {
      id: 'block-time',
      caseId: '03',
      category: 'Limitations',
      title: 'Block time is not inference time',
      body: 'How often a chain produces blocks, how long an inference takes and how long a result takes to settle are three different measurements. A reported demonstration keeps its date, conditions and attribution; it is not a general benchmark.',
      sources: [{ id: 'D1' }, { id: 'B1', locator: '§12' }],
      curriculumVersion: CURRICULUM_VERSION,
    },
  ],
};
