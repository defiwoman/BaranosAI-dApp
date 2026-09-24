import type { AdapterMode } from '../domain/types';
import { replayFrom, type ToyJob, type Trace } from '../domain/toyModel';

/**
 * The only execution adapter in this release. Every result it returns is computed
 * locally from fictional fixtures; nothing is sent to Fogo or to Baranos.
 */
export const simulationAdapter = {
  mode: 'simulation' as AdapterMode,
  label: 'Learning simulation',
  replayStep(job: ToyJob, trace: Trace, step: 1 | 2 | 3): Trace {
    return replayFrom(job, trace, step);
  },
};
