import { useProgress } from '../progressContext';
import { SystemMap } from '../components/SystemMap';
import { QuestProgress } from '../components/QuestProgress';
import { REQUIREMENTS_NOTE } from '../content/brand';
import styles from './DirectoryPage.module.css';

export function DirectoryPage() {
  const { progress } = useProgress();
  return (
    <div className={styles.page}>
      <p className={styles.kicker}>BARANOS // CASE NETWORK</p>
      <h1 data-page-heading tabIndex={-1} className={styles.title}>
        The six cases
      </h1>
      <QuestProgress progress={progress} />
      <p className={styles.requirement}>{REQUIREMENTS_NOTE}</p>
      <SystemMap progress={progress} />
    </div>
  );
}
