import { useState } from 'react';
import { CASES } from '../content/quest';
import { useProgress } from '../progressContext';
import { certificateEligibility, isCompleted, isUnlocked, nextCase } from '../domain/progress';
import { Link } from '../router';
import { QuestProgress } from '../components/QuestProgress';
import styles from './SummaryPage.module.css';

export function SummaryPage() {
  const { progress, reset } = useProgress();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const eligibility = certificateEligibility(progress);
  const next = nextCase(progress);

  return (
    <div className={styles.page}>
      <h1 data-page-heading tabIndex={-1} className={styles.title}>
        Your progress
      </h1>
      {progress.profile && (
        <p className={styles.meta}>
          Certificate name: <strong className={styles.name}>{progress.profile.name}</strong> ·{' '}
          <Link to="/">Edit</Link>
        </p>
      )}
      <QuestProgress progress={progress} />

      <section className={styles.panel} aria-labelledby="cert-heading">
        <h2 id="cert-heading">Certificate</h2>
        {eligibility.eligible ? (
          <>
            <p>All six cases are complete. Your certificate is ready.</p>
            <Link to="/certificate" className={styles.button}>
              View my certificate
            </Link>
          </>
        ) : (
          <>
            <p>
              Complete all six cases to earn your personalised certificate.{' '}
              {eligibility.remaining.length === 1 ? 'One case to go.' : `${eligibility.remaining.length} cases to go.`}
            </p>
            {next && (
              <Link to={`/case/${next}`} className={styles.button}>
                Continue quest
              </Link>
            )}
          </>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="concepts">
        <h2 id="concepts">What you’ve explored</h2>
        <ul className={styles.concepts}>
          {CASES.map((c, i) => {
            const done = isCompleted(progress, c.id);
            return (
              <li key={c.id}>
                <span aria-hidden="true">{done ? '✓' : '○'} </span>
                <span className="visually-hidden">{done ? 'Completed: ' : 'Not yet completed: '}</span>
                <strong>
                  Case {i + 1}: {c.title}
                </strong>
                <span className={styles.concept}>{c.concept}</span>
                {(done || isUnlocked(progress, c.id)) && (
                  <Link to={`/case/${c.id}`} className={styles.inline}>
                    {done ? 'Revisit' : 'Open'}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.reset} aria-labelledby="reset">
        <h2 id="reset">Start over</h2>
        <p>Resetting removes your saved case progress and certificate from this browser. Your certificate name is kept.</p>
        {resetDone && <p role="status">Progress cleared. You can start again from Case 1.</p>}
        {confirmReset ? (
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => {
                reset();
                setConfirmReset(false);
                setResetDone(true);
              }}
            >
              Yes, remove my progress
            </button>
            <button type="button" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <div className={styles.actions}>
            <button type="button" onClick={() => setConfirmReset(true)}>
              Reset progress…
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
