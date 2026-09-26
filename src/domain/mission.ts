/**
 * Per-visit mission state for a case console. Nothing here is saved: trust values and
 * investigation flags are temporary for the mission, as intended. Case completion is still
 * recorded only by passing the case's learning checks (see progress.ts).
 */

export type Phase = 'received' | 'inspect' | 'verify' | 'finalTrust' | 'resolved';

export type SystemStatus = 'UNVERIFIED' | 'UNDER REVIEW' | 'REPLAYING' | 'VERIFIED' | 'CHALLENGED' | 'DIVERGENCE DETECTED';

export interface MissionFlags {
  outputViewed: boolean;
  evidenceViewed: boolean;
  modelViewed: boolean;
  rulesViewed: boolean;
  inferenceReplayed: boolean;
  replayDiverged: boolean;
  challengeAttempted: boolean;
  wrongFindings: number;
  hintsUsed: number;
  configChanged: boolean;
  configMatches: boolean;
  sourceChecked: boolean;
  settled: boolean;
}

export type LogTone = 'info' | 'ok' | 'warn' | 'fail';

export interface LogEntry {
  id: number;
  text: string;
  tone: LogTone;
}

export interface MissionState {
  phase: Phase;
  status: SystemStatus;
  flags: MissionFlags;
  log: LogEntry[];
  trustBefore: number | null;
  trustAfter: number | null;
  nextId: number;
}

export type MissionEvent =
  | { type: 'LOG'; text: string; tone?: LogTone }
  | { type: 'SET_TRUST_BEFORE'; value: number }
  | { type: 'SET_TRUST_AFTER'; value: number }
  | { type: 'VIEWED'; object: 'output' | 'evidence' | 'model' | 'rules' }
  | { type: 'REPLAYED'; diverged: boolean }
  | { type: 'FINDING'; correct: boolean }
  | { type: 'HINT' }
  | { type: 'CONFIG'; matches: boolean }
  | { type: 'SOURCE_CHECKED' }
  | { type: 'SETTLED' }
  | { type: 'STATUS'; status: SystemStatus }
  | { type: 'SOLVED' }
  | { type: 'RESTART' };

export const EMPTY_FLAGS: MissionFlags = {
  outputViewed: false,
  evidenceViewed: false,
  modelViewed: false,
  rulesViewed: false,
  inferenceReplayed: false,
  replayDiverged: false,
  challengeAttempted: false,
  wrongFindings: 0,
  hintsUsed: 0,
  configChanged: false,
  configMatches: false,
  sourceChecked: false,
  settled: false,
};

const MAX_LOG = 40;

export function initialMission(): MissionState {
  return {
    phase: 'received',
    status: 'UNVERIFIED',
    flags: { ...EMPTY_FLAGS },
    log: [
      { id: 1, text: 'AI decision received', tone: 'info' },
      { id: 2, text: 'Inference complete', tone: 'info' },
    ],
    trustBefore: null,
    trustAfter: null,
    nextId: 3,
  };
}

function withLog(state: MissionState, text: string, tone: LogTone = 'info'): MissionState {
  const log = [...state.log, { id: state.nextId, text, tone }].slice(-MAX_LOG);
  return { ...state, log, nextId: state.nextId + 1 };
}

const clampTrust = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

export function missionReducer(state: MissionState, event: MissionEvent): MissionState {
  switch (event.type) {
    case 'LOG':
      return withLog(state, event.text, event.tone);
    case 'SET_TRUST_BEFORE':
      return withLog({ ...state, trustBefore: clampTrust(event.value), phase: 'inspect', status: 'UNDER REVIEW' }, `Initial trust recorded: ${clampTrust(event.value)}%`);
    case 'VIEWED': {
      const key = `${event.object}Viewed` as const;
      if (state.flags[key]) return state;
      // The verification controls appear once the learner has inspected something.
      const phase = state.phase === 'inspect' && event.object !== 'output' ? 'verify' : state.phase;
      return withLog({ ...state, phase, flags: { ...state.flags, [key]: true } }, 'Opening inference record…');
    }
    case 'REPLAYED': {
      const flags = { ...state.flags, inferenceReplayed: true, replayDiverged: event.diverged };
      const status: SystemStatus = event.diverged ? 'DIVERGENCE DETECTED' : 'VERIFIED';
      const s = withLog({ ...state, flags, status, phase: state.phase === 'inspect' ? 'verify' : state.phase }, 'Reproducing computation…');
      return withLog(s, event.diverged ? 'Verification divergence detected' : 'Deterministic replay confirmed', event.diverged ? 'fail' : 'ok');
    }
    case 'FINDING': {
      const flags = {
        ...state.flags,
        challengeAttempted: true,
        wrongFindings: state.flags.wrongFindings + (event.correct ? 0 : 1),
      };
      return withLog({ ...state, flags }, event.correct ? 'Finding accepted' : 'Finding rejected: see feedback', event.correct ? 'ok' : 'warn');
    }
    case 'HINT':
      return { ...state, flags: { ...state.flags, hintsUsed: state.flags.hintsUsed + 1 } };
    case 'CONFIG': {
      const flags = { ...state.flags, configChanged: true, configMatches: event.matches };
      return { ...state, flags };
    }
    case 'SOURCE_CHECKED':
      if (state.flags.sourceChecked) return state;
      return withLog({ ...state, flags: { ...state.flags, sourceChecked: true } }, 'Evidence quality disputed', 'warn');
    case 'SETTLED':
      if (state.flags.settled) return state;
      return withLog({ ...state, flags: { ...state.flags, settled: true } }, 'Result settled', 'ok');
    case 'STATUS':
      return state.status === event.status ? state : { ...state, status: event.status };
    case 'SOLVED':
      if (state.phase === 'finalTrust' || state.phase === 'resolved') return state;
      return withLog({ ...state, phase: 'finalTrust' }, 'Case finding recorded', 'ok');
    case 'SET_TRUST_AFTER':
      return withLog({ ...state, trustAfter: clampTrust(event.value), phase: 'resolved' }, `Final trust recorded: ${clampTrust(event.value)}%`);
    case 'RESTART':
      return initialMission();
  }
}

export type TrustShift = 'down' | 'up' | 'same';

/** How the learner's trust moved. A 5-point band counts as unchanged. */
export function trustShift(before: number, after: number): TrustShift {
  if (after <= before - 5) return 'down';
  if (after >= before + 5) return 'up';
  return 'same';
}
