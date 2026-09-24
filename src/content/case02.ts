import type { StagedCaseContent } from './types';
import { CURRICULUM_VERSION } from './curriculum';

/** Fictional job H-0217. Hashes are shortened illustrative strings, not real commitments. */
export const CASE02_JOB = {
  id: 'H-0217',
  model: 'Harbor Reader 2B, release r3 (fictional open-weight model)',
  task: 'Rate a community-garden grant application from 1 to 5 using Harbor rubric v2.',
  posted: 'Score 4',
  weightsRoot: '7c1e…a90f',
  evidenceCommitment: '3b9d…41c2',
  laterFileHash: '5f02…e7aa',
};

export const CASE02_RETRIEVAL = [
  {
    id: 'weights',
    item: 'Weights for Harbor Reader 2B r3',
    committed: CASE02_JOB.weightsRoot,
    retrieved: '7c1e…a90f',
    note: 'Downloaded from the model registry mirror.',
  },
  {
    id: 'later',
    item: 'E-0217.pdf on Harbor’s shared drive',
    committed: CASE02_JOB.evidenceCommitment,
    retrieved: CASE02_JOB.laterFileHash,
    note: 'Last edited three days after the job ran.',
  },
  {
    id: 'registry',
    item: 'E-0217 in the input registry',
    committed: CASE02_JOB.evidenceCommitment,
    retrieved: '—',
    note: 'Registry lists commitment 3b9d…41c2. Every listed storage location returns “not found”.',
  },
];

export const CASE02: StagedCaseContent = {
  id: '02',
  job: `Job ${CASE02_JOB.id} · posted result: ${CASE02_JOB.posted}`,
  brief: [
    'The operator who ran H-0217 has gone offline, so an independent reviewer has to reproduce the job without them.',
    'Give the reviewer everything the job needs, then check what they can actually retrieve.',
  ],
  stages: [
    {
      id: 'dossier',
      heading: 'Assemble the job for the reviewer',
      task: {
        kind: 'sort',
        id: '02-dossier',
        prompt: 'Place each card: what does a reviewer need in order to run the same job?',
        categories: [
          { id: 'model', label: 'Model' },
          { id: 'inputs', label: 'Inputs' },
          { id: 'rules', label: 'Execution rules' },
          { id: 'none', label: 'Not part of the job' },
        ],
        items: [
          {
            id: 'version',
            label: 'Model version',
            detail: 'Harbor Reader 2B, release r3',
            answer: 'model',
            feedback: {
              inputs: 'This names which model runs, not what it reads. It belongs under Model.',
              rules: 'The version says which model, not how to run it. It belongs under Model.',
              none: 'Without the exact version a reviewer could run a different model and get a different answer.',
            },
          },
          {
            id: 'weights',
            label: 'Weight commitment',
            detail: 'root 7c1e…a90f for the r3 weights',
            answer: 'model',
            feedback: {
              inputs: 'The commitment identifies the model’s weights, not the evidence it reads. Put it with the Model.',
              rules: 'This fixes which weights were used, so it belongs with the Model rather than the run settings.',
              none: 'The commitment lets a reviewer confirm they have the same weights. It is part of the model record.',
            },
          },
          {
            id: 'tokenizer',
            label: 'Tokenizer',
            detail: 'tok-r3, published with the model release',
            answer: 'model',
            feedback: {
              inputs: 'The tokenizer ships with the model and turns text into tokens. It belongs with the Model.',
              rules: 'It is part of the released model package, so it belongs with the Model.',
              none: 'A different tokenizer changes what the model sees. The reviewer needs it.',
            },
          },
          {
            id: 'evidence',
            label: 'Frozen evidence file',
            detail: 'E-0217, commitment 3b9d…41c2',
            answer: 'inputs',
            feedback: {
              model: 'This is what the model reads, not the model itself. It belongs under Inputs.',
              rules: 'The evidence is data the job reads. It belongs under Inputs.',
              none: 'The evidence is exactly what the model assessed. Without it there is nothing to rerun.',
            },
          },
          {
            id: 'prompt',
            label: 'Task prompt',
            detail: 'Harbor rubric v2: three criteria, 1–5 scale',
            answer: 'inputs',
            feedback: {
              model: 'The prompt is text given to the model, not part of the model. It belongs under Inputs.',
              rules: 'The rubric is text the model reads. How the model runs (decoding, arithmetic) is separate.',
              none: 'A different rubric asks a different question. The reviewer needs the exact text.',
            },
          },
          {
            id: 'decoding',
            label: 'Decoding policy',
            detail: 'greedy, max 16 tokens, no sampling',
            answer: 'rules',
            feedback: {
              model: 'This says how outputs are chosen when the model runs, not which model. It is an execution rule.',
              inputs: 'This is not data the model reads; it controls how the run produces output.',
              none: 'Sampling settings change the output. A reviewer must use the same ones to reproduce the job.',
            },
          },
          {
            id: 'runtime',
            label: 'Runtime profile',
            detail: 'fixed-point arithmetic p2, fixed operation order',
            answer: 'rules',
            feedback: {
              model: 'This describes how the numbers are computed, not the model itself. It is an execution rule.',
              inputs: 'This is not data; it fixes how the computation runs.',
              none: 'Different numeric precision or operation order can change results. It is part of the job.',
            },
          },
          {
            id: 'avatar',
            label: 'Operator’s profile picture',
            answer: 'none',
            feedback: {
              model: 'The operator’s avatar does not affect the computation.',
              inputs: 'The model never reads the avatar. It has no effect on the result.',
              rules: 'Nothing about how the job runs depends on the avatar.',
            },
          },
          {
            id: 'result',
            label: 'The operator’s posted result',
            detail: 'Score 4',
            answer: 'none',
            feedback: {
              model: 'The result is the claim being checked. The reviewer should reproduce it, not be given it as part of the job.',
              inputs: 'Feeding the claimed answer into the job would not test it. The result is what the reviewer checks.',
              rules: 'The result is an output to compare against, not a rule for running the job.',
            },
          },
        ],
        success:
          'The dossier is complete: which model runs, what it reads, and how it runs. The posted result is what the reviewer will compare against.',
        finding: 'Job specified: model, inputs and execution rules',
      },
    },
    {
      id: 'retrieval',
      heading: 'Check what the reviewer can retrieve',
      mira: ['The reviewer went to fetch everything in the dossier. Here is their retrieval log.'],
      task: {
        kind: 'sort',
        id: '02-retrieval',
        prompt: 'Classify each line of the retrieval log.',
        categories: [
          { id: 'match', label: 'Matches the job' },
          { id: 'changed', label: 'Changed evidence' },
          { id: 'unavailable', label: 'Unavailable evidence' },
          { id: 'exec', label: 'Execution error' },
        ],
        items: [
          {
            id: 'weights',
            label: 'Weights for Harbor Reader 2B r3',
            detail: 'committed 7c1e…a90f · retrieved 7c1e…a90f',
            answer: 'match',
            feedback: {
              changed: 'The retrieved weights hash to the committed root, so they are the same weights.',
              unavailable: 'The weights were retrieved and match their commitment.',
              exec: 'Nothing has been executed yet. This line is only about retrieving the weights.',
            },
          },
          {
            id: 'later',
            label: 'E-0217.pdf on Harbor’s shared drive',
            detail: 'committed 3b9d…41c2 · retrieved 5f02…e7aa · edited after the job',
            answer: 'changed',
            feedback: {
              match: 'The hashes differ. This file’s contents are not what the job committed to.',
              unavailable: 'This file can be retrieved; the problem is that its contents differ from the committed evidence.',
              exec: 'Nothing has been executed. A different input file is an evidence problem, not a sign that the operator ran the job incorrectly.',
            },
          },
          {
            id: 'registry',
            label: 'E-0217 in the input registry',
            detail: 'commitment 3b9d…41c2 listed · file “not found” everywhere',
            answer: 'unavailable',
            feedback: {
              match: 'The commitment matches, but a commitment is a fingerprint, not the file. Without the contents nobody can rerun the job.',
              changed: 'Nothing here has different contents. The committed file cannot be retrieved at all.',
              exec: 'We cannot run the job at all, so there is no execution to judge.',
            },
          },
        ],
        success:
          'One file is retrievable but different; the committed file is not retrievable at all. These are different problems.',
        finding: 'Shared-drive file differs from the commitment; committed evidence is unavailable',
      },
    },
    {
      id: 'report',
      heading: 'Report on H-0217',
      task: {
        kind: 'choice',
        id: '02-report',
        prompt: 'What should the reviewer report?',
        options: [
          {
            id: 'verified',
            label: 'Verified: the registry commitment matches the job.',
            feedback:
              'A matching commitment shows which file the job named. It does not recover that file, and it does not show the computation was performed correctly.',
          },
          {
            id: 'upheld',
            label: 'Challenge upheld: the operator used the wrong evidence.',
            feedback:
              'No step has been shown to break the job’s rules. The shared-drive file was edited after the job; nothing shows the operator used it.',
          },
          {
            id: 'rerun',
            label: 'Re-run with the shared-drive file and record the result as H-0217.',
            feedback:
              'That file has different contents, so running it would be a different job. It could be submitted as a new job with its own commitment, but not as H-0217.',
          },
          {
            id: 'incomplete',
            label: 'Review incomplete: the committed evidence is unavailable, so the job cannot be reproduced yet.',
            correct: true,
            feedback:
              'Right. Saying “we cannot check this yet” is a justified finding. It neither confirms nor rejects the posted score.',
          },
        ],
        finding: 'Report: review incomplete, evidence unavailable',
      },
    },
  ],
  resolution: {
    verdict: { tone: 'incomplete', label: 'Review incomplete: evidence unavailable' },
    consequence:
      'Harbor cannot rely on H-0217’s score of 4 until the committed evidence can be retrieved and the job reproduced. The score is not shown to be wrong; it simply cannot be checked.',
    explanation: [
      'A job is only reproducible if someone can obtain everything it fixed: the model, the inputs and the execution rules. A commitment identifies data but does not store it, so a matching hash with no retrievable file leaves the review incomplete.',
      'A later file with different contents is not the original evidence. It could define a new job, but it cannot stand in for H-0217.',
    ],
  },
  relation: {
    title: 'How this relates to Baranos',
    paragraphs: [
      'Baranos describes each job as fixing the model, evidence and execution rules so independent participants can reproduce the computation. It uses open-weight models so other executors can run the same job; in Confirmation mode a Merkle root commits to the weights while the weights themselves remain offchain.',
      'That is why availability matters: a commitment lets a checker confirm they hold the right data, but someone still has to be able to get the data. The registry and commitment formats in this case are invented for teaching. Baranos’s actual registry interface has not been published for this app and is not modelled here.',
    ],
    sources: [{ id: 'B2' }, { id: 'B1', locator: '§2 and §6' }],
  },
  hook: 'The next job was checked properly, but Harbor didn’t wait for the check. It acted the moment a result was posted.',
  notebook: [
    {
      id: 'job-specification',
      caseId: '02',
      category: 'Execution rules',
      title: 'A complete job specification',
      body: 'To reproduce a job, a reviewer needs the model (version, weights, tokenizer), the inputs (evidence and prompt) and the execution rules (decoding policy, numeric precision, operation order). The posted result is what gets checked; it is not part of the job.',
      sources: [{ id: 'B1', locator: '§2' }, { id: 'B2' }],
      curriculumVersion: CURRICULUM_VERSION,
    },
    {
      id: 'commitment-availability',
      caseId: '02',
      category: 'Commitments',
      title: 'A commitment is not the data',
      body: 'A commitment such as a hash or Merkle root identifies data. It cannot recover missing contents and does not prove that a computation happened or was correct. If the committed data cannot be retrieved, the review is incomplete.',
      sources: [{ id: 'B2' }, { id: 'B1', locator: '§6' }],
      curriculumVersion: CURRICULUM_VERSION,
    },
    {
      id: 'changed-evidence',
      caseId: '02',
      category: 'Evidence',
      title: 'Changed evidence defines a new job',
      body: 'Evidence whose contents differ from the committed file is different evidence. It can be the input to a new job with its own commitment, but it cannot be used to check or replace the original job.',
      sources: [{ id: 'B1', locator: '§2' }],
      curriculumVersion: CURRICULUM_VERSION,
    },
  ],
};
