import type { MissionFlags } from './mission';

/**
 * BARA: a contextual response system, not a chatbot. Reactions depend on what the learner has
 * already done; hints reveal only the next step and never the answer.
 */

export type BaraEvent =
  | 'evidenceViewed'
  | 'modelViewed'
  | 'rulesViewed'
  | 'replayConfirmed'
  | 'replayDiverged'
  | 'findingWrong'
  | 'findingRight'
  | 'configMismatch'
  | 'configMatch'
  | 'sourceChecked'
  | 'settled';

export interface Hint {
  /** Shown only when this returns true. Hints are checked in order. */
  when: (f: MissionFlags) => boolean;
  text: string;
}

export interface BaraScript {
  /** Case-specific reactions; missing events fall back to the generic ones. */
  reactions: Partial<Record<BaraEvent, string>>;
  hints: Hint[];
}

const GENERIC: Record<BaraEvent, string> = {
  evidenceViewed: 'Evidence is what the model was given. Keep it in mind.',
  modelViewed: 'That fingerprint is what everyone agreed to run.',
  rulesViewed: 'The rules were fixed before the result existed.',
  replayConfirmed: 'Same inputs, same model, same result. The computation holds.',
  replayDiverged: 'The replay doesn’t match. Find where it splits.',
  findingWrong: 'Not quite. Compare what you found with what was committed.',
  findingRight: 'You found it.',
  configMismatch: 'Something changed. Compare it with the commitment.',
  configMatch: 'Everything matches the commitment now.',
  sourceChecked: 'The computation was faithful. The source wasn’t.',
  settled: 'Now the result is final under the rules.',
};

/**
 * The reaction to an event, adjusted for context: once the learner has inspected everything
 * that went in, BARA points them at replay instead of repeating inspection advice.
 */
export function baraReaction(script: BaraScript, event: BaraEvent, flags: MissionFlags): string {
  const inspectedAll = flags.evidenceViewed && flags.modelViewed && flags.rulesViewed;
  if (
    (event === 'evidenceViewed' || event === 'modelViewed' || event === 'rulesViewed') &&
    inspectedAll &&
    !flags.inferenceReplayed
  ) {
    return 'You’ve inspected what went in. Now check whether the same computation can be reproduced.';
  }
  return script.reactions[event] ?? GENERIC[event];
}

const FALLBACK_HINTS: Hint[] = [
  { when: (f) => !f.evidenceViewed, text: 'Start with what the AI was given. Open the evidence.' },
  {
    when: (f) => f.evidenceViewed && !f.modelViewed,
    text: 'You’ve checked the evidence. What else was committed before inference?',
  },
  {
    when: (f) => f.evidenceViewed && f.modelViewed && !f.inferenceReplayed,
    text: 'You’ve inspected what went in. Can the same computation be reproduced?',
  },
  { when: () => true, text: 'Verification can prove execution. Can it prove the source was truthful?' },
];

/** One short hint for the learner's current state: the first matching case hint, else a generic one. */
export function baraHint(script: BaraScript, flags: MissionFlags): string {
  return (script.hints.find((h) => h.when(flags)) ?? FALLBACK_HINTS.find((h) => h.when(flags))!).text;
}
