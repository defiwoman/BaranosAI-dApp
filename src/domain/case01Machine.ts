import { checkStep, firstIncorrectStep, type ToyJob, type Trace } from './toyModel';

export type Case01Phase = 'briefing' | 'inspecting' | 'step_selected' | 'replay_available' | 'resolved';

export type Case01Feedback =
  | { kind: 'step_correct'; step: 1 | 2 | 3; remaining: 'products' | 'steps' }
  | { kind: 'step_downstream'; step: 1 | 2 | 3 }
  | { kind: 'accept_rejected' }
  | { kind: 'challenge_accepted'; step: 1 | 2 | 3 }
  | { kind: 'no_step_selected' };

export interface Case01State {
  phase: Case01Phase;
  job: ToyJob;
  submitted: Trace;
  selected: 1 | 2 | 3 | null;
  feedback: Case01Feedback | null;
  replayed: Trace | null;
  hintShown: boolean;
  /** Wrong challenges or accept attempts before resolution. Used only for first-attempt credit. */
  wrongChoices: number;
}

export type Case01Event =
  | { type: 'OPEN_CASE' }
  | { type: 'SELECT_STEP'; step: 1 | 2 | 3 }
  | { type: 'CHALLENGE' }
  | { type: 'ACCEPT_SUBMITTED' }
  /** `replayed` comes from the execution adapter (only the simulation adapter exists). */
  | { type: 'REPLAY'; replayed: Trace }
  | { type: 'SHOW_HINT' }
  | { type: 'RETRY' };

export function initialCase01State(job: ToyJob, submitted: Trace): Case01State {
  return {
    phase: 'briefing',
    job,
    submitted,
    selected: null,
    feedback: null,
    replayed: null,
    hintShown: false,
    wrongChoices: 0,
  };
}

export function case01Reducer(state: Case01State, event: Case01Event): Case01State {
  switch (event.type) {
    case 'OPEN_CASE':
      return state.phase === 'briefing' ? { ...state, phase: 'inspecting' } : state;

    case 'SELECT_STEP':
      if (state.phase === 'resolved' || state.phase === 'briefing') return state;
      if (state.phase === 'replay_available') {
        // Changing the selection withdraws the pending replay; the player must challenge again.
        if (event.step === state.selected) return state;
      }
      return { ...state, phase: 'step_selected', selected: event.step, feedback: null };

    case 'CHALLENGE': {
      if (state.phase !== 'step_selected' && state.phase !== 'inspecting') return state;
      if (state.selected === null) {
        return { ...state, feedback: { kind: 'no_step_selected' } };
      }
      const step = state.selected;
      const faulty = firstIncorrectStep(state.job, state.submitted);
      if (step === faulty) {
        return { ...state, phase: 'replay_available', feedback: { kind: 'challenge_accepted', step } };
      }
      const status = checkStep(state.job, state.submitted, step);
      const feedback: Case01Feedback =
        status === 'downstream'
          ? { kind: 'step_downstream', step }
          : { kind: 'step_correct', step, remaining: faulty !== null && faulty < 3 ? 'products' : 'steps' };
      return { ...state, phase: 'inspecting', feedback, wrongChoices: state.wrongChoices + 1 };
    }

    case 'ACCEPT_SUBMITTED':
      if (state.phase === 'resolved' || state.phase === 'briefing') return state;
      return { ...state, phase: 'inspecting', selected: null, feedback: { kind: 'accept_rejected' }, wrongChoices: state.wrongChoices + 1 };

    case 'REPLAY':
      if (state.phase !== 'replay_available' || state.selected === null) return state;
      return { ...state, phase: 'resolved', replayed: event.replayed };

    case 'SHOW_HINT':
      return { ...state, hintShown: true };

    case 'RETRY':
      return { ...initialCase01State(state.job, state.submitted), phase: 'inspecting' };
  }
}
