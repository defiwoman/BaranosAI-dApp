/**
 * Multiple-choice questions used by the cases. Grading is pure: content describes the
 * question, these functions return the verdict and the option's own explanation.
 */

export interface ChoiceOption {
  id: string;
  label: string;
  correct?: boolean;
  /** Explains why this option is right or wrong. */
  feedback: string;
}

export interface Question {
  /** Matches a check in REQUIRED_CHECKS. */
  id: string;
  /** Optional one- or two-sentence situation shown above the prompt. */
  scenario?: string;
  prompt: string;
  options: ChoiceOption[];
  hint: string;
}

export type ChoiceResult = { correct: boolean; feedback: string };

export function evaluateChoice(question: Question, optionId: string): ChoiceResult {
  const option = question.options.find((o) => o.id === optionId);
  if (!option) throw new Error(`Unknown option ${optionId} for ${question.id}`);
  return { correct: option.correct === true, feedback: option.feedback };
}

export function correctIndex(question: Question): number {
  return question.options.findIndex((o) => o.correct);
}

/** Content check used by tests: exactly one correct option, each with its own explanation. */
export function validateQuestion(q: Question): string[] {
  const problems: string[] = [];
  const correct = q.options.filter((o) => o.correct).length;
  if (correct !== 1) problems.push(`${q.id}: expected one correct option, found ${correct}`);
  if (q.options.length < 2 || q.options.length > 4) problems.push(`${q.id}: use 2–4 options`);
  if (new Set(q.options.map((o) => o.feedback)).size !== q.options.length) problems.push(`${q.id}: options share feedback`);
  if (!q.hint) problems.push(`${q.id}: missing hint`);
  return problems;
}
