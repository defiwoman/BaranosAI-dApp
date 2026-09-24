import { CASES } from '../content/cases';
import { completedCases, justifiedTotals, rankFor, type Progress, type Rank } from './progress';

export interface SummaryData {
  completed: number;
  total: number;
  rank: Rank;
  concepts: { id: string; title: string; concept: string }[];
  justified: number;
  decisions: number;
}

/** Built only from the player's stored progress; nothing is invented or estimated. */
export function summaryFrom(progress: Progress): SummaryData {
  const done = new Set(completedCases(progress));
  const { justified, decisions } = justifiedTotals(progress);
  return {
    completed: done.size,
    total: CASES.length,
    rank: rankFor(progress),
    concepts: CASES.filter((c) => done.has(c.id)).map((c) => ({ id: c.id, title: c.title, concept: c.concept })),
    justified,
    decisions,
  };
}
