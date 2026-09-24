import { CASES, STORY_PREMISE } from '../content/cases';
import { useProgress } from '../progressContext';
import { completedCases, nextCase, rankFor } from '../domain/progress';
import { Link } from '../router';
import { availability, AVAILABILITY_LABEL } from '../components/CaseStatus';
import styles from './EntryPage.module.css';

export function EntryPage() {
  const { progress } = useProgress();
  const done = completedCases(progress);
  const next = nextCase(progress);
  const returning = done.length > 0;
  const continueTo = next ? `/case/${next}` : '/summary';

  return (
    <div className={styles.entry}>
      <section className={styles.hero}>
        <img src="/brand/baranos-logo.png" alt="Baranos logo" className={styles.logo} width={400} height={400} />
        <div>
          <p className={styles.kicker}>Learning simulation</p>
          <h1 data-page-heading tabIndex={-1} className={styles.title}>
            Baranos Lab: The Verification Files
          </h1>
          <p className={styles.premise}>{STORY_PREMISE}</p>
          <div className={styles.ctas}>
            {returning && (
              <Link to={continueTo} className={styles.primary}>
                Continue investigation
              </Link>
            )}
            <Link to="/case/01" className={returning ? styles.secondary : styles.primary}>
              Open the first case
            </Link>
          </div>
          {returning && (
            <p className={styles.progress}>
              {done.length} of {CASES.length} cases complete · Rank: {rankFor(progress)}
            </p>
          )}
          <p className={styles.note}>
            Play as a guest; no wallet needed. Cases use fictional jobs and a toy arithmetic model computed in your
            browser. They illustrate ideas from Baranos’s public materials but do not run Baranos jobs.
          </p>
        </div>
      </section>

      <section aria-labelledby="directory-preview" className={styles.preview}>
        <h2 id="directory-preview">The case files</h2>
        <ol className={styles.list}>
          {CASES.map((c) => {
            const a = availability(progress, c);
            return (
              <li key={c.id} className={styles.item}>
                <span className={`num ${styles.id}`}>{c.id}</span>
                <span className={styles.itemTitle}>
                  {a === 'available' || a === 'complete' ? <Link to={`/case/${c.id}`}>{c.title}</Link> : c.title}
                </span>
                <span className={styles.itemStatus}>{AVAILABILITY_LABEL[a]}</span>
              </li>
            );
          })}
        </ol>
        <Link to="/cases" className={styles.more}>
          View the case directory
        </Link>
      </section>
    </div>
  );
}
