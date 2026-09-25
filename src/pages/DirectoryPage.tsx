import { CASES } from '../content/quest';
import { useProgress } from '../progressContext';
import { isCompleted, isUnlocked, nextCase } from '../domain/progress';
import { Link } from '../router';
import { QuestProgress } from '../components/QuestProgress';
import { REQUIREMENTS_NOTE } from '../content/brand';
import styles from './DirectoryPage.module.css';

export function DirectoryPage() {
  const { progress } = useProgress();
  const next = nextCase(progress);
  return (
    <div className={styles.page}>
      <h1 data-page-heading tabIndex={-1} className={styles.title}>
        The six cases
      </h1>
      <QuestProgress progress={progress} />
      <p className={styles.requirement}>{REQUIREMENTS_NOTE}</p>
      <ol className={styles.list}>
        {CASES.map((c, i) => {
          const done = isCompleted(progress, c.id);
          const open = done || isUnlocked(progress, c.id);
          const status = done ? '✓ Completed' : c.id === next ? 'Up next' : open ? 'Open' : 'Unlocks after the earlier cases';
          return (
            <li key={c.id} className={`${styles.card} ${open ? '' : styles.muted}`}>
              <p className={`num ${styles.id}`}>
                Case {i + 1} of {CASES.length}
              </p>
              <h2 className={styles.caseTitle}>{open ? <Link to={`/case/${c.id}`}>{c.title}</Link> : c.title}</h2>
              <p>{c.challenge}</p>
              <p className={styles.status}>{status}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
