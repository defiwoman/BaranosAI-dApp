import { CASE_IDS, type CaseId } from '../domain/types';
import { completedCases, type Progress } from '../domain/progress';
import styles from './QuestProgress.module.css';

export function completedLabel(n: number): string {
  return `${n} ${n === 1 ? 'case' : 'cases'} completed`;
}

/** “Case 2 of 6 · 1 case completed”, with a six-segment bar. */
export function QuestProgress({ progress, current }: { progress: Progress; current?: CaseId }) {
  const done = completedCases(progress);
  return (
    <div className={styles.wrap}>
      <p className={styles.text}>
        {current && (
          <>
            <strong>
              Case {CASE_IDS.indexOf(current) + 1} of {CASE_IDS.length}
            </strong>
            <span aria-hidden="true"> · </span>
          </>
        )}
        <span>{completedLabel(done.length)}</span>
      </p>
      <ol className={styles.bar} aria-hidden="true">
        {CASE_IDS.map((id) => (
          <li key={id} className={`${done.includes(id) ? styles.done : ''} ${id === current ? styles.current : ''}`} />
        ))}
      </ol>
    </div>
  );
}
