import { clearanceFor, clearanceProgress } from '../../domain/clearance';
import { useProgress } from '../../progressContext';
import styles from './ClearanceBadge.module.css';

/** "CLEARANCE: ANALYST" with a thin progress bar toward Protocol Architect. */
export function ClearanceBadge() {
  const { progress } = useProgress();
  const clearance = clearanceFor(progress);
  const pct = Math.round(clearanceProgress(progress) * 100);
  return (
    <div className={styles.badge} aria-label={`Clearance: ${clearance}. ${pct}% of the way to Protocol Architect.`} role="img">
      <span className={styles.text}>
        CLEARANCE: <strong>{clearance}</strong>
      </span>
      <span className={styles.bar} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
