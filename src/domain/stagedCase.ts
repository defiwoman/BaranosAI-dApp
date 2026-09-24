import type { Task } from './tasks';

export interface StagedState {
  /** Index of the current stage; equal to stageCount when every stage is solved. */
  stage: number;
  stageCount: number;
  /** Tasks answered wrongly at least once. Each counts once against first-attempt credit. */
  wrongTasks: string[];
}

export type StagedEvent =
  | { type: 'WRONG'; taskId: string }
  | { type: 'SOLVED'; stage: number }
  | { type: 'RESTART' };

export function initialStagedState(stageCount: number, resume?: { stage: number; wrong: string[] }): StagedState {
  if (resume && resume.stage > 0 && resume.stage < stageCount) {
    return { stage: resume.stage, stageCount, wrongTasks: [...new Set(resume.wrong)] };
  }
  return { stage: 0, stageCount, wrongTasks: [] };
}

export function stagedReducer(state: StagedState, event: StagedEvent): StagedState {
  switch (event.type) {
    case 'WRONG':
      return state.wrongTasks.includes(event.taskId) ? state : { ...state, wrongTasks: [...state.wrongTasks, event.taskId] };
    case 'SOLVED':
      // Ignore stale events so a double click cannot skip a stage.
      return event.stage === state.stage ? { ...state, stage: state.stage + 1 } : state;
    case 'RESTART':
      return initialStagedState(state.stageCount);
  }
}

export function isResolved(state: StagedState): boolean {
  return state.stage >= state.stageCount;
}

export function decisionCount(tasks: Task[]): number {
  return tasks.length;
}
