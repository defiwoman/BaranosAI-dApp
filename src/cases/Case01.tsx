import { useEffect, useReducer, useRef, useState } from 'react';
import { CASE01, CASE01_NOTEBOOK, CASE01_PRACTICE, CASE01_PRIMARY, type Case01Fixture } from '../content/case01';
import { case01Reducer, initialCase01State, type Case01Feedback, type Case01State } from '../domain/case01Machine';
import { canonicalScore, formatStep } from '../domain/toyModel';
import { simulationAdapter } from '../adapters/simulation';
import { MiraBrief } from '../components/MiraBrief';
import { Tabs } from '../components/desk/Tabs';
import { Actions, Button, Desk } from '../components/desk/Desk';
import { Feedback, Verdict } from '../components/desk/Feedback';
import { Resolution } from '../components/Resolution';
import type { CaseProps } from './types';
import styles from './Case01.module.css';

function feedbackText(f: Case01Feedback): { tone: 'wrong' | 'right' | 'info'; text: string } {
  switch (f.kind) {
    case 'step_correct':
      return { tone: 'wrong', text: CASE01.feedback.stepCorrect(f.remaining) };
    case 'step_downstream':
      return { tone: 'wrong', text: CASE01.feedback.stepDownstream };
    case 'accept_rejected':
      return { tone: 'wrong', text: CASE01.feedback.acceptRejected };
    case 'challenge_accepted':
      return { tone: 'right', text: CASE01.feedback.challengeAccepted };
    case 'no_step_selected':
      return { tone: 'info', text: CASE01.feedback.noStepSelected };
  }
}

export function Case01({ onComplete, alreadyCompleted, nextAction }: CaseProps) {
  // First play always uses the exact casebook job; practice rounds cycle through variants.
  const [round, setRound] = useState(0);
  const fixture: Case01Fixture = round === 0 ? CASE01_PRIMARY : CASE01_PRACTICE[(round - 1) % CASE01_PRACTICE.length];
  return (
    <Case01Round
      key={round}
      fixture={fixture}
      practice={round > 0}
      onComplete={onComplete}
      alreadyCompleted={alreadyCompleted}
      nextAction={nextAction}
      onPractice={() => setRound((r) => r + 1)}
    />
  );
}

function Case01Round({
  fixture,
  practice,
  onComplete,
  alreadyCompleted,
  nextAction,
  onPractice,
}: CaseProps & { fixture: Case01Fixture; practice: boolean; onPractice: () => void }) {
  const [state, dispatch] = useReducer(case01Reducer, fixture, (f) => initialCase01State(f.job, f.submitted));
  const reported = useRef(false);

  useEffect(() => {
    if (state.phase === 'resolved' && !reported.current) {
      reported.current = true;
      // Practice rounds never change the recorded result; the progress model is idempotent anyway.
      if (!practice) onComplete({ decisions: 1, wrongDecisions: state.wrongChoices > 0 ? 1 : 0 });
    }
  }, [state.phase, state.wrongChoices, practice, onComplete]);

  const { job } = state;
  const corrected = canonicalScore(job);
  const feedback = state.feedback ? feedbackText(state.feedback) : null;

  const workspace = (
    <>
      <MiraBrief caseLabel="Case 01" lines={CASE01.brief(fixture.submittedScore)} />
      {practice && (
        <p className={styles.practice}>
          Practice round with new inputs. Your recorded result for this case does not change.
        </p>
      )}

      {state.phase === 'briefing' ? (
        <Actions>
          <Button variant="primary" onClick={() => dispatch({ type: 'OPEN_CASE' })}>
            Inspect the submitted work
          </Button>
        </Actions>
      ) : (
        <>
          <Tabs
            label="Case 01 evidence"
            tabs={[
              { id: 'trace', label: 'Submitted trace', content: <TraceTable state={state} dispatch={dispatch} /> },
              { id: 'job', label: 'Agreed job', content: <AgreedJob state={state} /> },
            ]}
          />

          {state.phase !== 'resolved' && (
            <>
              <Actions>
                {state.phase === 'replay_available' ? (
                  <Button
                    variant="primary"
                    onClick={() =>
                      dispatch({
                        type: 'REPLAY',
                        replayed: simulationAdapter.replayStep(job, state.submitted, state.selected!),
                      })
                    }
                  >
                    Replay selected step
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    aria-disabled={state.selected === null}
                    onClick={() => dispatch({ type: 'CHALLENGE' })}
                  >
                    Challenge this step
                  </Button>
                )}
                <Button onClick={() => dispatch({ type: 'ACCEPT_SUBMITTED' })}>
                  Accept submitted score <span className="num">{fixture.submittedScore}</span>
                </Button>
                {!state.hintShown && (
                  <Button variant="quiet" onClick={() => dispatch({ type: 'SHOW_HINT' })}>
                    Show a hint
                  </Button>
                )}
              </Actions>
              {state.hintShown && <Feedback tone="hint">{CASE01.hint}</Feedback>}
            </>
          )}

          <div aria-live="polite">
            {feedback && state.phase !== 'resolved' && <Feedback tone={feedback.tone}>{feedback.text}</Feedback>}
          </div>

          {state.phase === 'resolved' && state.replayed && (
            <Resolution
              verdict={<Verdict tone="upheld">Challenge upheld</Verdict>}
              consequence={
                <p>
                  Step {state.selected} replayed as{' '}
                  <strong className="num">{formatStep(state.replayed[(state.selected ?? 1) - 1])}</strong>. The score
                  changes from <span className="num">{fixture.submittedScore}</span> to{' '}
                  <strong className="num">{corrected}</strong>.
                </p>
              }
              explanation={[CASE01.resolution(corrected)]}
              relation={CASE01.relation}
              notebook={alreadyCompleted || practice ? undefined : CASE01_NOTEBOOK.title}
              hook={practice ? undefined : CASE01.hook}
              nextAction={nextAction}
              extraActions={
                <>
                  <Button onClick={onPractice}>Practice with new numbers</Button>
                  <Button variant="quiet" onClick={() => dispatch({ type: 'RETRY' })}>
                    Retry this job
                  </Button>
                </>
              }
            />
          )}
        </>
      )}
    </>
  );

  const finding = (
    <>
      <h2>Finding</h2>
      <dl className={styles.facts}>
        <dt>Job</dt>
        <dd className="num">
          {job.id} · {job.model}
        </dd>
        <dt>Status</dt>
        <dd>
          {state.phase === 'resolved'
            ? 'Challenge upheld; score replayed'
            : state.phase === 'replay_available'
              ? `Challenge on step ${state.selected} ready to replay`
              : state.selected
                ? `Step ${state.selected} selected`
                : 'Under review'}
        </dd>
        <dt>Submitted score</dt>
        <dd className="num">{state.phase === 'resolved' ? <s>{fixture.submittedScore}</s> : fixture.submittedScore}</dd>
        {state.phase === 'resolved' && (
          <>
            <dt>Replayed score</dt>
            <dd className="num">
              <strong>{corrected}</strong>
            </dd>
          </>
        )}
      </dl>
      <p className={styles.mode}>Computed locally from a fictional job ({simulationAdapter.mode}).</p>
    </>
  );

  return <Desk workspace={workspace} finding={finding} />;
}

function TraceTable({ state, dispatch }: { state: Case01State; dispatch: (e: import('../domain/case01Machine').Case01Event) => void }) {
  const locked = state.phase === 'resolved';
  const changed = (i: number) => state.replayed && state.replayed[i].output !== state.submitted[i].output;
  return (
    <fieldset className={styles.trace}>
      <legend className={styles.legend}>{locked ? 'Submitted and replayed work' : 'Select a step to challenge'}</legend>
      {state.submitted.map((step, i) => (
        <label
          key={step.index}
          className={`${styles.row} ${state.selected === step.index ? styles.selected : ''} ${locked ? styles.locked : ''}`}
        >
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
          <span className={`num ${styles.work} ${changed(i) ? styles.struck : ''}`}><span className="visually-hidden">{state.replayed ? 'submitted: ' : ''}</span>
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

function AgreedJob({ state }: { state: Case01State }) {
  const { job } = state;
  return (
    <div>
      <dl className={styles.jobList}>
        <dt>Model</dt>
        <dd>{job.model}: a two-input weighted sum. This is an arithmetic teaching model, not an LLM.</dd>
        <dt>Inputs</dt>
        <dd className="num">
          x1 = {job.inputs.x1}, x2 = {job.inputs.x2}
        </dd>
        <dt>Fixed weights</dt>
        <dd className="num">
          w1 = {job.weights.w1}, w2 = {job.weights.w2}
        </dd>
        <dt>Rule</dt>
        <dd className="num">score = w1 × x1 + w2 × x2, using exact small integers</dd>
      </dl>
    </div>
  );
}
