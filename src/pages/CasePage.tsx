import { useCallback } from 'react';
import { CASES, caseById } from '../content/cases';
import { CASE_IDS, isCaseId, type CaseId } from '../domain/types';
import { isCompleted, nextCase } from '../domain/progress';
import { useProgress } from '../progressContext';
import { Link } from '../router';
import { CASE_ACHIEVEMENTS, CASE_COMPONENTS } from '../cases/registry';
import { CASE_NOTEBOOK_IDS } from '../content/notebook';
import { availability, AVAILABILITY_LABEL } from '../components/CaseStatus';
import { NotFoundPage } from './NotFoundPage';
import styles from './CasePage.module.css';

export function CasePage({ id }: { id: string }) {
  if (!isCaseId(id)) return <NotFoundPage />;
  return <CaseView id={id} />;
}

function CaseView({ id }: { id: CaseId }) {
  const { progress, complete } = useProgress();
  const summary = caseById(id);
  const a = availability(progress, summary);
  const Component = CASE_COMPONENTS[id];

  const onComplete = useCallback(
    (r: { decisions: number; wrongDecisions: number }) =>
      complete({
        caseId: id,
        decisions: r.decisions,
        wrongDecisions: r.wrongDecisions,
        notebook: CASE_NOTEBOOK_IDS[id],
        achievements: [CASE_ACHIEVEMENTS[id]],
      }),
    [complete, id],
  );

  const index = CASE_IDS.indexOf(id);
  const following = CASES[index + 1];
  const nextAction = following ? (
    <Link to={following.playable ? `/case/${following.id}` : '/cases'}>
      {following.playable ? `Open Case ${following.id}` : `Case ${following.id} preview`}
    </Link>
  ) : (
    <Link to="/summary">See your case summary</Link>
  );

  return (
    <div className={styles.page}>
      <nav aria-label="Cases" className={styles.caseNav}>
        <ol>
          {CASES.map((c) => {
            const ca = availability(progress, c);
            const current = c.id === id;
            return (
              <li key={c.id}>
                <Link to={`/case/${c.id}`} aria-current={current ? 'page' : undefined} className={styles.navItem}>
                  <span className="num">{c.id}</span>
                  <span className={styles.navTitle}>{c.title}</span>
                  <span className="visually-hidden">, {AVAILABILITY_LABEL[ca]}</span>
                  {ca === 'complete' && (
                    <span aria-hidden="true" className={styles.check}>
                      ✓
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className={styles.content}>
        <header className={styles.header}>
          <p className={`num ${styles.kicker}`}>
            Case {id} <span className={styles.sim}>· Learning simulation</span>
          </p>
          <h1 data-page-heading tabIndex={-1} className={styles.title}>
            {summary.title}
          </h1>
          <p className={styles.objective}>{summary.objective}</p>
        </header>

        {a === 'preview' || !Component ? (
          <Preview id={id} />
        ) : a === 'locked' ? (
          <Locked />
        ) : (
          <Component
            key={id}
            onComplete={onComplete}
            alreadyCompleted={isCompleted(progress, id)}
            nextAction={nextAction}
          />
        )}
      </div>
    </div>
  );
}

function Preview({ id }: { id: CaseId }) {
  const c = caseById(id);
  return (
    <section className={styles.notice}>
      <h2>Preview</h2>
      <p>{c.storyEvent}</p>
      <p>This case is still being written and is not playable yet.</p>
      <Link to="/cases">Back to the case directory</Link>
    </section>
  );
}

function Locked() {
  const { progress } = useProgress();
  const next = nextCase(progress);
  return (
    <section className={styles.notice}>
      <h2>Case locked</h2>
      <p>Each case builds on the one before it. Complete the earlier cases to open this file.</p>
      {next && <Link to={`/case/${next}`}>Go to Case {next}</Link>}
    </section>
  );
}
