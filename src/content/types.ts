import type { CaseId } from '../domain/types';
import type { Question } from '../domain/tasks';

export type SourceId = 'B1' | 'B2' | 'B3' | 'B4' | 'R1' | 'R2' | 'D1' | 'F1' | 'F2';

export interface SourceRef {
  id: SourceId;
  /** Optional section or passage. Only add one after checking it against the source itself. */
  locator?: string;
}

export interface Source {
  id: SourceId;
  title: string;
  author: string;
  url: string;
  date: string;
  /** How this source may be used, and what it must not be stretched to say. */
  boundary: string;
}

export interface Term {
  term: string;
  meaning: string;
}

export interface CaseSummary {
  id: CaseId;
  title: string;
  /** One line shown in the directory. */
  challenge: string;
  /** Short concept name used on the summary page. */
  concept: string;
}

export interface Lesson {
  /** Visible after the challenge is solved. */
  why: string;
  how: string;
  takeaway: string;
}

export interface Explore {
  paragraphs: string[];
  sources: SourceRef[];
}

/** A simplified case: short scenario, one task, one challenge, then the lesson. */
export interface QuestCase {
  id: CaseId;
  /** Mira's two or three sentences. */
  scenario: string[];
  task: string;
  /** Explained where first used. */
  terms: Term[];
  /** Cases 02–06 use questions; Case 01 has its own interactive replay. */
  questions: Question[];
  lesson: Lesson;
  explore: Explore;
  sources: SourceRef[];
  /** Mira's closing line after solving. */
  outro?: string;
}

export type NotebookCategory = 'Verification' | 'Reproducibility' | 'Settlement' | 'Limitations';

export interface NotebookEntry {
  caseId: CaseId;
  category: NotebookCategory;
  title: string;
  summary: string;
  takeaway: string;
  sources: SourceRef[];
}
