/**
 * Harbor Score v1: a two-input weighted sum used only as a teaching model.
 * It is arithmetic, not an LLM, and not a Baranos verifier.
 */
export interface ToyJob {
  id: string;
  model: string;
  inputs: { x1: number; x2: number };
  weights: { w1: number; w2: number };
}

export type StepOp = 'multiply' | 'add';

export interface TraceStep {
  index: 1 | 2 | 3;
  op: StepOp;
  left: number;
  right: number;
  output: number;
}

export type Trace = [TraceStep, TraceStep, TraceStep];

export type StepStatus = 'correct' | 'incorrect' | 'downstream';

/** The trace an honest executor would produce for the agreed job. */
export function canonicalTrace(job: ToyJob): Trace {
  const p1 = job.weights.w1 * job.inputs.x1;
  const p2 = job.weights.w2 * job.inputs.x2;
  return [
    { index: 1, op: 'multiply', left: job.weights.w1, right: job.inputs.x1, output: p1 },
    { index: 2, op: 'multiply', left: job.weights.w2, right: job.inputs.x2, output: p2 },
    { index: 3, op: 'add', left: p1, right: p2, output: p1 + p2 },
  ];
}

export function canonicalScore(job: ToyJob): number {
  return canonicalTrace(job)[2].output;
}

function apply(op: StepOp, left: number, right: number): number {
  return op === 'multiply' ? left * right : left + right;
}

/**
 * A step is `incorrect` when its output breaks the agreed rule for its own operands,
 * or when it uses operands the job did not specify. A step whose arithmetic is right
 * but which consumes an earlier wrong value is `downstream` of the error.
 */
export function checkStep(job: ToyJob, trace: Trace, index: 1 | 2 | 3): StepStatus {
  const step = trace[index - 1];
  const expected = canonicalTrace(job)[index - 1];
  if (step.op !== expected.op) return 'incorrect';
  if (step.output !== apply(step.op, step.left, step.right)) return 'incorrect';
  if (index < 3) {
    return step.left === expected.left && step.right === expected.right ? 'correct' : 'incorrect';
  }
  // The sum must use the earlier displayed outputs.
  if (step.left !== trace[0].output || step.right !== trace[1].output) return 'incorrect';
  return step.output === expected.output ? 'correct' : 'downstream';
}

/** The first step whose own work breaks the agreed rules, or null when execution matches. */
export function firstIncorrectStep(job: ToyJob, trace: Trace): 1 | 2 | 3 | null {
  for (const index of [1, 2, 3] as const) {
    if (checkStep(job, trace, index) === 'incorrect') return index;
  }
  return null;
}

/**
 * Re-executes the challenged step under the agreed rules and recomputes everything after it.
 * Steps before the challenged one are kept as submitted.
 */
export function replayFrom(job: ToyJob, trace: Trace, index: 1 | 2 | 3): Trace {
  const canonical = canonicalTrace(job);
  const next = trace.map((s) => ({ ...s })) as Trace;
  for (let i = index; i <= 3; i++) {
    if (i < 3) {
      next[i - 1] = { ...canonical[i - 1] };
    } else {
      const left = next[0].output;
      const right = next[1].output;
      next[2] = { index: 3, op: 'add', left, right, output: left + right };
    }
  }
  return next;
}

export function formatStep(step: TraceStep): string {
  const symbol = step.op === 'multiply' ? '×' : '+';
  return `${step.left} ${symbol} ${step.right} = ${step.output}`;
}
