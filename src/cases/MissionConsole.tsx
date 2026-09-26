import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { CONSOLE } from '../content/console';
import { QUEST, caseById } from '../content/quest';
import { CASE_IDS, type CaseId } from '../domain/types';
import { initialMission, missionReducer, trustShift } from '../domain/mission';
import { baraHint, baraReaction, type BaraEvent } from '../domain/bara';
import { clearanceFor, effectiveClearance, hasCapability, upgradeAfter } from '../domain/clearance';
import { certificateEligibility, isCompleted, missingChecks } from '../domain/progress';
import { useProgress } from '../progressContext';
import { Link } from '../router';
import { Bara } from '../components/console/Bara';
import { ObjectCard } from '../components/console/ObjectCard';
import { VerificationTrace } from '../components/console/VerificationTrace';
import { TrustMeter, TrustShiftView } from '../components/console/TrustMeter';
import {
  ClearanceUpgrade,
  ComputationLine,
  Panel,
  StatusPill,
  SystemLog,
  Toasts,
  VerdictPanel,
  consoleStyles as cs,
  usePrefersReducedMotion,
} from '../components/console/SystemParts';
import { SourceLine } from '../components/SourceList';
import { Case01Challenge } from './Case01';
import { QuestionSequence } from './QuestionSequence';
import { CASE_WIDGETS, findingReady, type WidgetApi } from './widgets';
import styles from './MissionConsole.module.css';

type ObjKey = 'model' | 'evidence' | 'rules';

/**
 * One case as a system event:
 * AI DECISION RECEIVED → INITIAL TRUST → INSPECT → REPLAY / CHALLENGE → FINAL TRUST → RESOLUTION → CLEARANCE.
 * Each stage appears only when it becomes relevant.
 */
export function MissionConsole({ caseId }: { caseId: CaseId }) {
  const { progress, pass } = useProgress();
  const data = CONSOLE[caseId];
  const lesson = QUEST[caseId];
  const summary = caseById(caseId);
  const reduced = usePrefersReducedMotion();

  // Fixed for this visit.
  const [replayVisit] = useState(() => isCompleted(progress, caseId));
  const [missing] = useState(() => missingChecks(progress, caseId));
  const clearance = effectiveClearance(clearanceFor(progress), caseId);
  const canInspect = hasCapability(clearance, 'inspectModel');
  const canReplay = hasCapability(clearance, 'replay');
  const isChallenger = hasCapability(clearance, 'challenge');

  const [mission, dispatch] = useReducer(missionReducer, undefined, initialMission);
  const [open, setOpen] = useState<ObjKey | null>(null);
  const [bara, setBara] = useState<{ id: number; text: string } | null>(null);
  const [replayRunning, setReplayRunning] = useState(false);
  const [booting, setBooting] = useState(true);
  const baraId = useRef(0);

  // The incoming decision arrives: a short pulse along INPUT → MODEL → INFERENCE → OUTPUT.
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), reduced ? 0 : 1400);
    return () => clearTimeout(t);
  }, [reduced]);

  const say = useCallback((text: string) => {
    baraId.current += 1;
    setBara({ id: baraId.current, text });
  }, []);

  const react = useCallback(
    (event: BaraEvent, flagsOverride?: Partial<typeof mission.flags>) => say(baraReaction(data.bara, event, { ...mission.flags, ...flagsOverride })),
    [data.bara, mission.flags, say],
  );

  const log = useCallback((text: string, tone: 'info' | 'ok' | 'warn' | 'fail' = 'info') => dispatch({ type: 'LOG', text, tone }), []);

  const inspect = (key: ObjKey) => {
    setOpen((o) => (o === key ? null : key));
    const already = mission.flags[`${key}Viewed` as const];
    dispatch({ type: 'VIEWED', object: key });
    if (!already) react(`${key}Viewed` as BaraEvent, { [`${key}Viewed`]: true });
  };

  const startReplay = () => {
    if (replayRunning) return;
    dispatch({ type: 'STATUS', status: 'REPLAYING' });
    log('Reproducing computation…');
    setReplayRunning(true);
  };

  const onReplayDone = useCallback(
    (diverged: boolean) => {
      dispatch({ type: 'REPLAYED', diverged });
      say(baraReaction(data.bara, diverged ? 'replayDiverged' : 'replayConfirmed', { ...mission.flags, inferenceReplayed: true }));
    },
    [data.bara, say],
  );

  const api: WidgetApi = {
    flags: mission.flags,
    log,
    react: (e) => react(e),
    config: (matches) => dispatch({ type: 'CONFIG', matches }),
    sourceChecked: () => {
      dispatch({ type: 'SOURCE_CHECKED' });
      dispatch({ type: 'STATUS', status: 'CHALLENGED' });
    },
    settled: () => dispatch({ type: 'SETTLED' }),
    replay: startReplay,
  };

  const challengeHooks = useMemo(
    () => ({
      onWrong: () => {
        dispatch({ type: 'FINDING', correct: false });
        say(baraReaction(data.bara, 'findingWrong', mission.flags));
      },
      onSolved: () => {
        dispatch({ type: 'FINDING', correct: true });
        dispatch({ type: 'SOLVED' });
        // An injected instruction makes the result unusable even though execution replays exactly.
        if (caseId === '05') dispatch({ type: 'STATUS', status: 'CHALLENGED' });
        say(baraReaction(data.bara, 'findingRight', mission.flags));
      },
      onEvent: (text: string, tone: 'info' | 'ok' | 'warn' | 'fail') => {
        log(text, tone);
        if (text === 'Challenge submitted') dispatch({ type: 'STATUS', status: 'CHALLENGED' });
        if (text === 'Disputed step isolated') dispatch({ type: 'STATUS', status: 'DIVERGENCE DETECTED' });
      },
    }),
    [caseId, data.bara, mission.flags, log, say],
  );

  const hint = () => {
    dispatch({ type: 'HINT' });
    say(baraHint(data.bara, mission.flags));
  };

  const phaseAtLeast = (p: typeof mission.phase) => {
    const order = ['received', 'inspect', 'verify', 'finalTrust', 'resolved'];
    return order.indexOf(mission.phase) >= order.indexOf(p);
  };

  const widget = CASE_WIDGETS[caseId];
  const showReplayPanel = !!data.trace && caseId !== '01' && (canReplay || replayRunning);
  const ready = findingReady(caseId, mission.flags);
  const index = CASE_IDS.indexOf(caseId);
  const following = CASE_IDS[index + 1];
  const upgrade = !replayVisit ? upgradeAfter(caseId) : null;
  const eligible = certificateEligibility(progress).eligible;
  const latest = mission.log.length > 2 ? mission.log[mission.log.length - 1] : null;
  const findingLabel = isChallenger ? 'Challenge the decision' : 'Submit your finding';

  return (
    <div className={styles.console}>
      <Toasts latest={latest} />
      <div className={styles.main}>
        <header className={styles.strip}>
          <p className={styles.eyebrow}>
            CASE {caseId} <span aria-hidden="true">//</span> {phaseAtLeast('inspect') ? 'AI DECISION UNDER REVIEW' : 'INCOMING AI DECISION'}
          </p>
          <div className={styles.titleRow}>
            <h1 data-page-heading tabIndex={-1} className={styles.title}>
              {summary.title}
            </h1>
            <StatusPill status={mission.status} live={mission.status === 'REPLAYING' || mission.status === 'UNDER REVIEW'} />
          </div>
        </header>

        {/* 1. The decision */}
        <section className={styles.decision} aria-label="AI decision">
          <ComputationLine stages={['INPUT', 'MODEL', 'INFERENCE', 'OUTPUT']} running={booting} lit={booting ? 1 : 4} />
          <div className={styles.decisionGrid}>
            <div>
              <p className={cs.label}>AI result</p>
              <p className={styles.result}>{data.output.decision}</p>
            </div>
            <dl className={styles.facts}>
              <div>
                <dt>CONFIDENCE</dt>
                <dd>{data.output.confidence}</dd>
              </div>
              <div>
                <dt>AT STAKE</dt>
                <dd>{data.output.atRisk}</dd>
              </div>
              <div>
                <dt>RULE</dt>
                <dd>{data.output.rule}</dd>
              </div>
            </dl>
          </div>
          <p className={styles.context}>
            <span className={cs.label}>MIRA //</span> {lesson.scenario.join(' ')}
          </p>
        </section>

        {/* 2. Initial trust */}
        {mission.phase === 'received' && (
          <Panel label="Before you investigate">
            <TrustMeter
              question="WOULD YOU TRUST THIS AI DECISION?"
              submitLabel="Record initial trust"
              onSubmit={(v) => {
                dispatch({ type: 'SET_TRUST_BEFORE', value: v });
                say(lesson.task);
              }}
            />
          </Panel>
        )}

        {/* 3. Inspect */}
        {phaseAtLeast('inspect') && (
          <Panel label="Inspect decision" right={<span className={cs.label}>CLEARANCE: {clearance}</span>}>
            <p className={styles.task}>
              <span className={cs.label}>TASK //</span> {lesson.task}
            </p>
            <div className={cs.objects}>
              {(['model', 'evidence', 'rules'] as ObjKey[]).map((k) => (
                <ObjectCard
                  key={k}
                  object={data.objects[k]}
                  expanded={open === k}
                  onToggle={() => inspect(k)}
                  lockedUntil={k !== 'evidence' && !canInspect ? 'ANALYST' : undefined}
                />
              ))}
            </div>
            {lesson.terms.length > 0 && (
              <details className={styles.terms}>
                <summary>Terms</summary>
                <dl>
                  {lesson.terms.map((t) => (
                    <div key={t.term}>
                      <dt>{t.term}</dt>
                      <dd>{t.meaning}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
            {!phaseAtLeast('verify') && <p className={cs.label}>Open a system object to begin.</p>}
          </Panel>
        )}

        {/* 4. Verify / challenge */}
        {phaseAtLeast('verify') && (
          <>
            {widget && !widget.afterReplay && (
              <Panel label={widget.label}>
                <widget.Widget api={api} />
              </Panel>
            )}

            {showReplayPanel && data.trace && (
              <Panel
                label="Replay inference"
                right={
                  !replayRunning && (
                    <button type="button" className={`${cs.cmd} ${cs.cmdPrimary}`} onClick={startReplay}>
                      Replay inference
                    </button>
                  )
                }
              >
                <VerificationTrace original={data.trace.original} replay={data.trace.replay} running={replayRunning} onDone={onReplayDone} />
              </Panel>
            )}

            {widget?.afterReplay && (
              <Panel label={widget.label}>
                <widget.Widget api={api} />
              </Panel>
            )}

            {ready ? (
              <Panel label={caseId === '01' ? 'Execution record' : findingLabel}>
                {caseId === '01' ? (
                  <Case01Challenge onPass={pass} missing={missing} replay={replayVisit} {...challengeHooks} />
                ) : (
                  <QuestionSequence questions={lesson.questions} onPass={pass} missing={missing} replay={replayVisit} {...challengeHooks} />
                )}
              </Panel>
            ) : (
              <p className={styles.locked}>
                <span aria-hidden="true">○ </span>
                {caseId === '04' ? 'Replay and cross-check the source to submit a finding.' : 'Run the verification above to submit a finding.'}
              </p>
            )}
          </>
        )}

        {/* 5. Final trust */}
        {mission.phase === 'finalTrust' && (
          <Panel label="After verification">
            <TrustMeter
              question="WOULD YOU TRUST THE DECISION NOW?"
              submitLabel="Record final trust"
              initial={mission.trustBefore ?? 50}
              onSubmit={(v) => dispatch({ type: 'SET_TRUST_AFTER', value: v })}
            />
          </Panel>
        )}

        {/* 6. Resolution */}
        {mission.phase === 'resolved' && (
          <Resolution
            caseId={caseId}
            before={mission.trustBefore ?? 50}
            after={mission.trustAfter ?? 50}
            upgrade={upgrade}
            following={following}
            eligible={eligible}
          />
        )}
      </div>

      <aside className={styles.rail} aria-label="System">
        <div className={styles.railInner}>
          <p className={cs.label}>SYSTEM LOG</p>
          <SystemLog entries={mission.log} />
          <p className={cs.label} style={{ marginTop: 12 }}>
            MODE: LEARNING SIMULATION
          </p>
        </div>
      </aside>

      <Bara message={bara} onHint={hint} />
    </div>
  );
}

function Resolution({
  caseId,
  before,
  after,
  upgrade,
  following,
  eligible,
}: {
  caseId: CaseId;
  before: number;
  after: number;
  upgrade: ReturnType<typeof upgradeAfter>;
  following: CaseId | undefined;
  eligible: boolean;
}) {
  const data = CONSOLE[caseId];
  const lesson = QUEST[caseId];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const shift = trustShift(before, after);

  return (
    <>
      <section className={cs.panel} aria-labelledby="resolution-heading">
        <p className={cs.label}>Case resolution</p>
        <h2 id="resolution-heading" ref={heading} tabIndex={-1} className={styles.resolutionTitle}>
          Case {caseId} resolved
        </h2>
        <TrustShiftView before={before} after={after} insight={data.trustInsight[shift]} />
      </section>

      {caseId === '01' && data.trace && (
        <Panel label="Verification trace">
          <VerificationTrace original={data.trace.original} replay={data.trace.replay} running onDone={() => undefined} />
        </Panel>
      )}

      <VerdictPanel title={data.verdict.title} checks={data.verdict.checks} limit={data.verdict.limit} />

      <section className={cs.panel} aria-label="Debrief">
        <p className={cs.label}>Debrief</p>
        <div className={styles.debrief}>
          <div>
            <h3>Why this matters</h3>
            <p>{lesson.lesson.why}</p>
          </div>
          <div>
            <h3>How BaranosAI helps</h3>
            <p>{lesson.lesson.how}</p>
          </div>
        </div>
        <div className={styles.takeaway}>
          <h3>Your takeaway</h3>
          <p>{lesson.lesson.takeaway}</p>
        </div>
        <details className={styles.terms}>
          <summary>Explore further</summary>
          {lesson.explore.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <SourceLine refs={lesson.explore.sources} />
        </details>
        <SourceLine refs={lesson.sources} />
      </section>

      {upgrade && <ClearanceUpgrade from={upgrade.from} to={upgrade.to} pending={!following} />}

      <div className={styles.next}>
        {following ? (
          <Link to={`/case/${following}`} className={`${cs.cmd} ${cs.cmdPrimary} ${styles.linkCmd}`}>
            Next case
          </Link>
        ) : eligible ? (
          <Link to="/certificate" className={`${cs.cmd} ${cs.cmdPrimary} ${styles.linkCmd}`}>
            See my certificate
          </Link>
        ) : (
          <>
            <p className={styles.finale}>You’ve inspected, verified and challenged AI decisions. Now design one.</p>
            <Link to="/use-case" className={`${cs.cmd} ${cs.cmdPrimary} ${styles.linkCmd}`}>
              Create my use case
            </Link>
          </>
        )}
        <Link to="/" className={`${cs.cmd} ${styles.linkCmd}`}>
          System map
        </Link>
      </div>
    </>
  );
}
