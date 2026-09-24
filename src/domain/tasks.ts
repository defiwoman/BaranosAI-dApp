/**
 * Content-driven decision tasks used by Cases 02–06. Everything here is pure:
 * content describes the task, these functions grade an answer and return feedback.
 */

export interface ChoiceOption {
  id: string;
  label: string;
  correct?: boolean;
  /** Shown when this option is submitted. For the correct option, this is the success message. */
  feedback: string;
}

export interface ChoiceTask {
  kind: 'choice';
  id: string;
  prompt: string;
  options: ChoiceOption[];
  /** Line added to the finding panel once solved. */
  finding: string;
}

export interface SortCategory {
  id: string;
  label: string;
}

export interface SortItem {
  id: string;
  label: string;
  detail?: string;
  answer: string;
  /** Specific feedback per wrong category. */
  feedback: Record<string, string>;
}

export interface SortTask {
  kind: 'sort';
  id: string;
  prompt: string;
  categories: SortCategory[];
  items: SortItem[];
  success: string;
  finding: string;
}

export type Task = ChoiceTask | SortTask;

export type ChoiceResult = { correct: boolean; feedback: string };

export function evaluateChoice(task: ChoiceTask, optionId: string): ChoiceResult {
  const option = task.options.find((o) => o.id === optionId);
  if (!option) throw new Error(`Unknown option ${optionId} for ${task.id}`);
  return { correct: option.correct === true, feedback: option.feedback };
}

export type SortResult =
  | { status: 'incomplete'; unplaced: string[] }
  | { status: 'wrong'; wrong: { itemId: string; feedback: string }[] }
  | { status: 'correct'; feedback: string };

export function evaluateSort(task: SortTask, placements: Record<string, string | undefined>): SortResult {
  const unplaced = task.items.filter((i) => !placements[i.id]).map((i) => i.id);
  if (unplaced.length > 0) return { status: 'incomplete', unplaced };
  const wrong = task.items
    .filter((i) => placements[i.id] !== i.answer)
    .map((i) => ({ itemId: i.id, feedback: i.feedback[placements[i.id]!] ?? 'Look at this card again.' }));
  if (wrong.length > 0) return { status: 'wrong', wrong };
  return { status: 'correct', feedback: task.success };
}

/** Content sanity check used by tests: exactly one correct option; every wrong sort answer has specific feedback. */
export function validateTask(task: Task): string[] {
  const problems: string[] = [];
  if (task.kind === 'choice') {
    const correct = task.options.filter((o) => o.correct).length;
    if (correct !== 1) problems.push(`${task.id}: expected one correct option, found ${correct}`);
    if (new Set(task.options.map((o) => o.feedback)).size !== task.options.length) {
      problems.push(`${task.id}: options share feedback text`);
    }
  } else {
    const ids = new Set(task.categories.map((c) => c.id));
    for (const item of task.items) {
      if (!ids.has(item.answer)) problems.push(`${task.id}/${item.id}: unknown answer ${item.answer}`);
      for (const c of task.categories) {
        if (c.id !== item.answer && !item.feedback[c.id]) {
          problems.push(`${task.id}/${item.id}: no feedback for ${c.id}`);
        }
      }
    }
  }
  return problems;
}
