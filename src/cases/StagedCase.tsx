import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { StagedCaseContent } from '../content/types';
import { initialStagedState, isResolved, stagedReducer } from '../domain/stagedCase';
import { useProgress } from '../progressContext';
import { MiraBrief } from '../components/MiraBrief';
import { Desk } from '../components/desk/Desk';
import { Verdict } from '../components/desk/Feedback';
import { Resolution } from '../components/Resolution';
import { ChoiceTaskView } from '../components/tasks/ChoiceTaskView';
import { SortTaskView } from '../components/tasks/SortTaskView';
import type { CaseProps } from './types';
import styles from './StagedCase.module.css';

interface Props extends CaseProps {
  content: StagedCaseContent;
  /** Evidence shown for the current stage. `stage === content.stages.length` means resolved. */
  evidence: (stage: number) => ReactNode;
  /** Extra material shown inside the resolution, e.g. a proposed new job. */
  resolutionExtra?: ReactNode;
}

export function StagedCase({ content, evidence, resolutionExtra, onComplete, alreadyCompleted, nextAction }: Props) {
  const { progress, checkpoint } = useProgress();
  const saved = alreadyCompleted ? undefined : progress.checkpoints[content.id];
  const [state, dispatch] = useReducer(stagedReducer, content.stages.length, (n) => initialStagedState(n, saved));
  const [resumed, setResumed] = useState(state.stage > 0);
  const reported = useRef(false);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const prevStage = useRef(state.stage);
  const resolved = isResolved(state);

  // Persist the stage so a refresh resumes here; completion clears it.
  useEffect(() => {
    if (resolved || alreadyCompleted) return;
    checkpoint(content.id, { stage: state.stage, wrong: state.wrongTasks });
  }, [state.stage, state.wrongTasks, resolved, alreadyCompleted, checkpoint, content.id]);

  useEffect(() => {
    if (resolved && !reported.current) {
      reported.current = true;
      onComplete({ decisions: content.stages.length, wrongDecisions: state.wrongTasks.length });
    }
  }, [resolved, onComplete, content.stages.length, state.wrongTasks.length]);

  // Move focus to the new step heading when the player advances.
  useEffect(() => {
    if (prevStage.current === state.stage) return;
    prevStage.current = state.stage;
    stageHeading.current?.focus();
  }, [state.stage]);

  const restart = () => {
    reported.current = false;
    setResumed(false);
    checkpoint(content.id, null);
    dispatch({ type: 'RESTART' });
  };

  const current = content.stages[state.stage];

  const workspace = (
    <>
      <MiraBrief caseLabel={`Case ${content.id}`} lines={content.brief} />

      {resumed && !resolved && (
        <p className={styles.resumed}>
          Resumed where you left off.{' '}
          <button type="button" className={styles.linkButton} onClick={restart}>
            Start this case over
          </button>
        </p>
      )}

      <ol className={styles.steps} aria-label="Case steps">
        {content.stages.map((s, i) => (
          <li
            key={s.id}
            className={i < state.stage ? styles.stepDone : i === state.stage ? styles.stepNow : styles.stepLater}
            aria-current={i === state.stage ? 'step' : undefined}
          >
            <span aria-hidden="true">{i < state.stage ? '✓' : i + 1}</span> {s.heading}
            {i < state.stage && <span className="visually-hidden"> (done)</span>}
          </li>
        ))}
      </ol>

      {current && (
        <section aria-labelledby={`stage-${current.id}`}>
          <h2 id={`stage-${current.id}`} ref={stageHeading} tabIndex={-1} className={styles.stageHeading}>
            <span className={`num ${styles.stageNum}`}>
              Step {state.stage + 1} of {content.stages.length}
            </span>
            {current.heading}
          </h2>
          {current.mira && <MiraBrief caseLabel={`Case ${content.id} step ${state.stage + 1}`} lines={current.mira} />}
          {evidence(state.stage)}
          {current.task.kind === 'choice' ? (
            <ChoiceTaskView
              key={current.task.id}
              task={current.task}
              onWrong={() => dispatch({ type: 'WRONG', taskId: current.task.id })}
              onSolved={() => dispatch({ type: 'SOLVED', stage: state.stage })}
            />
          ) : (
            <SortTaskView
              key={current.task.id}
              task={current.task}
              onWrong={() => dispatch({ type: 'WRONG', taskId: current.task.id })}
              onSolved={() => dispatch({ type: 'SOLVED', stage: state.stage })}
            />
          )}
        </section>
      )}

      {resolved && (
        <>
          {evidence(state.stage)}
          <Resolution
            verdict={<Verdict tone={content.resolution.verdict.tone}>{content.resolution.verdict.label}</Verdict>}
            consequence={
              <>
                <p>{content.resolution.consequence}</p>
                {resolutionExtra}
              </>
            }
            explanation={content.resolution.explanation}
            relation={content.relation}
            notebook={alreadyCompleted ? undefined : content.notebook.map((n) => n.title).join(', ')}
            hook={content.hook}
            nextAction={nextAction}
            extraActions={
              <button type="button" onClick={restart}>
                Replay this case
              </button>
            }
          />
        </>
      )}
    </>
  );

  const solvedStages = content.stages.slice(0, state.stage);
  const finding = (
    <>
      <h2>Finding</h2>
      <p className={styles.job}>{content.job}</p>
      {solvedStages.length === 0 ? (
        <p className={styles.empty}>Nothing established yet.</p>
      ) : (
        <ul className={styles.findings}>
          {solvedStages.map((s) => (
            <li key={s.id}>
              <span aria-hidden="true">✓ </span>
              {s.task.finding}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.mode}>Fictional job in a learning simulation.</p>
    </>
  );

  return <Desk workspace={workspace} finding={finding} />;
}
