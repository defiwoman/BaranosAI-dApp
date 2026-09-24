import { useEffect, useReducer, useRef, useState } from 'react';
import { CASE01_FEEDBACK, CASE01_PRACTICE, CASE01_PRIMARY, type Case01Fixture } from '../content/case01';
import { case01Reducer, initialCase01State, type Case01Event, type Case01Feedback, type Case01State } from '../domain/case01Machine';
import { canonicalScore, formatStep } from '../domain/toyModel';
import { simulationAdapter } from '../adapters/simulation';
import { Actions, Button } from '../components/desk/Desk';
import { Feedback } from '../components/desk/Feedback';
import type { ChallengeProps } from './types';
import styles from './Case01.module.css';

const HINT = 'Check the two multiplications first.';

function feedbackText(f: Case01Feedback): { tone: 'wrong' | 'right' | 'info'; text: string } {
  switch (f.kind) {
    case 'step_correct':
      return { tone: 'wrong', text: CASE01_FEEDBACK.stepCorrect(f.remaining) };
    case 'step_downstream':
      return { tone: 'wrong', text: CASE01_FEEDBACK.stepDownstream };
    case 'accept_rejected':
      return { tone: 'wrong', text: CASE01_FEEDBACK.acceptRejected };
    case 'challenge_accepted':
      return { tone: 'right', text: CASE01_FEEDBACK.challengeAccepted };
    case 'no_step_selected':
      return { tone: 'info', text: CASE01_FEEDBACK.noStepSelected };
  }
}

/** Case 01’s challenge: a toy three-step calculation. The first round is always the casebook job (25 → 23). */
export function Case01Challenge({ onPass }: ChallengeProps) {
  const [round, setRound] = useState(0);
  const fixture = round === 0 ? CASE01_PRIMARY : CASE01_PRACTICE[(round - 1) % CASE01_PRACTICE.length];
  return <Round key={round} fixture={fixture} practice={round > 0} onPass={onPass} onPractice={() => setRound((r) => r + 1)} />;
}

function Round({
  fixture,
  practice,
  onPass,
  onPractice,
}: {
  fixture: Case01Fixture;
  practice: boolean;
  onPass: (check: string) => void;
  onPractice: () => void;
}) {
  // Skip the briefing phase: the scenario above already sets the scene.
  const [state, dispatch] = useReducer(case01Reducer, fixture, (f) =>
    case01Reducer(initialCase01State(f.job, f.submitted), { type: 'OPEN_CASE' }),
  );
  const reported = useRef(false);

  useEffect(() => {
    if (state.phase === 'resolved' && !reported.current && !practice) {
      reported.current = true;
      onPass('01-replay');
    }
  }, [state.phase, practice, onPass]);

  const { job } = state;
  const feedback = state.feedback ? feedbackText(state.feedback) : null;

  return (
    <div className={styles.challenge}>
      <p className={styles.toy}>
        <span className={styles.toyTag}>Toy analogy</span> Simple arithmetic stands in for an AI computation.
      </p>
      <p className={styles.rule}>
        Agreed rule:{' '}
        <strong className="num">
          score = {job.weights.w1} × {job.inputs.x1} + {job.weights.w2} × {job.inputs.x2}
        </strong>
        {practice && <span className={styles.practice}> (practice round)</span>}
      </p>

      <TraceTable state={state} dispatch={dispatch} />

      {state.phase !== 'resolved' && (
        <>
          <Actions>
            {state.phase === 'replay_available' ? (
              <Button
                variant="primary"
                onClick={() =>
                  dispatch({ type: 'REPLAY', replayed: simulationAdapter.replayStep(job, state.submitted, state.selected!) })
                }
              >
                Replay this step
              </Button>
            ) : (
              <Button variant="primary" aria-disabled={state.selected === null} onClick={() => dispatch({ type: 'CHALLENGE' })}>
                Challenge this step
              </Button>
            )}
            <Button onClick={() => dispatch({ type: 'ACCEPT_SUBMITTED' })}>
              Accept the score of <span className="num">{fixture.submittedScore}</span>
            </Button>
            {!state.hintShown && (
              <Button variant="quiet" onClick={() => dispatch({ type: 'SHOW_HINT' })}>
                Show a hint
              </Button>
            )}
          </Actions>
          {state.hintShown && <Feedback tone="hint">{HINT}</Feedback>}
        </>
      )}

      <div aria-live="polite">
        {feedback && state.phase !== 'resolved' && <Feedback tone={feedback.tone}>{feedback.text}</Feedback>}
        {state.phase === 'resolved' && (
          <Feedback tone="right">
            Replayed correctly: step {state.selected} is{' '}
            <strong className="num">{formatStep(state.replayed![(state.selected ?? 1) - 1])}</strong>, so the score is{' '}
            <strong className="num">{canonicalScore(job)}</strong>, not <span className="num">{fixture.submittedScore}</span>.
          </Feedback>
        )}
      </div>

      {state.phase === 'resolved' && (
        <Actions>
          <Button variant="quiet" onClick={onPractice}>
            Practise with new numbers
          </Button>
        </Actions>
      )}
    </div>
  );
}

function TraceTable({ state, dispatch }: { state: Case01State; dispatch: (e: Case01Event) => void }) {
  const locked = state.phase === 'resolved';
  const changed = (i: number) => state.replayed && state.replayed[i].output !== state.submitted[i].output;
  return (
    <fieldset className={styles.trace}>
      <legend className={styles.legend}>{locked ? 'Submitted and replayed work' : 'Which step breaks the rule?'}</legend>
      {state.submitted.map((step, i) => (
        <label key={step.index} className={`${styles.row} ${state.selected === step.index ? styles.selected : ''} ${locked ? styles.locked : ''}`}>
          <input
            type="radio"
            name="trace-step"
            value={step.index}
            checked={state.selected === step.index}
            disabled={locked}
            onChange={() => dispatch({ type: 'SELECT_STEP', step: step.index })}
            className={styles.radio}
          />
          <span className={styles.stepLabel}>Step {step.index}</span>{' '}
          <span className={`num ${styles.work} ${changed(i) ? styles.struck : ''}`}>
            <span className="visually-hidden">{state.replayed ? 'submitted: ' : ''}</span>
            {formatStep(step)}
          </span>{' '}
          {state.replayed && changed(i) && (
            <span className={`num ${styles.replayed} ${styles[`delay${i}`]}`}>
              <span className="visually-hidden">replayed: </span>
              {formatStep(state.replayed[i])}
            </span>
          )}
        </label>
      ))}
      <p className={styles.total}>
        Submitted score: <strong className="num">{state.submitted[2].output}</strong>
      </p>
    </fieldset>
  );
}
