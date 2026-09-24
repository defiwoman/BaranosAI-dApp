import type { CaseId } from '../domain/types';

export type SourceId = 'B1' | 'B2' | 'B3' | 'R1' | 'R2' | 'D1' | 'F1' | 'F2';

export interface SourceRef {
  id: SourceId;
  /** Optional section or passage, e.g. "§§2–3". */
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

export type NotebookCategory =
  | 'Model'
  | 'Evidence'
  | 'Execution rules'
  | 'Commitments'
  | 'Challenges'
  | 'Settlement'
  | 'Limitations';

export interface NotebookEntry {
  id: string;
  caseId: CaseId;
  category: NotebookCategory;
  title: string;
  body: string;
  sources: SourceRef[];
  curriculumVersion: string;
}

export interface CaseSummary {
  id: CaseId;
  title: string;
  storyEvent: string;
  objective: string;
  /** Short name of the concept, used in the completion card. */
  concept: string;
  playable: boolean;
}

export interface TechnicalNote {
  title: string;
  paragraphs: string[];
  sources: SourceRef[];
}

export interface StageContent {
  id: string;
  heading: string;
  mira?: string[];
  task: import('../domain/tasks').Task;
}

export interface StagedCaseContent {
  id: CaseId;
  job: string;
  brief: string[];
  stages: StageContent[];
  resolution: {
    verdict: { tone: 'upheld' | 'matches' | 'incomplete' | 'hold'; label: string };
    consequence: string;
    explanation: string[];
  };
  relation: TechnicalNote;
  hook?: string;
  notebook: NotebookEntry[];
}
