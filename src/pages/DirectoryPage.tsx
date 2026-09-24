import { CASES } from '../content/cases';
import { useProgress } from '../progressContext';
import { completedCases, rankFor } from '../domain/progress';
import { Link } from '../router';
import { availability, AVAILABILITY_LABEL } from '../components/CaseStatus';
import styles from './DirectoryPage.module.css';

export function DirectoryPage() {
  const { progress } = useProgress();
  const done = completedCases(progress).length;
  return (
    <div>
      <h1 data-page-heading tabIndex={-1} className={styles.title}>
        Case directory
      </h1>
      <p className={styles.meta}>
        {done} of {CASES.length} complete · Rank: {rankFor(progress)}
      </p>
      <ol className={styles.list}>
        {CASES.map((c) => {
          const a = availability(progress, c);
          const open = a === 'available' || a === 'complete';
          return (
            <li key={c.id} className={`${styles.card} ${a === 'preview' || a === 'locked' ? styles.muted : ''}`}>
              <p className={`num ${styles.id}`}>Case {c.id}</p>
              <h2 className={styles.caseTitle}>{open ? <Link to={`/case/${c.id}`}>{c.title}</Link> : c.title}</h2>
              <p className={styles.event}>{c.storyEvent}</p>
              <p>
                <strong>Objective:</strong> {c.objective}
              </p>
              <p className={styles.status}>{AVAILABILITY_LABEL[a]}</p>
              {a === 'complete' && (
                <p className={styles.review}>
                  <Link to={`/case/${c.id}`}>Replay case</Link> · <Link to={`/notebook#case-${c.id}`}>Review concept</Link>
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
