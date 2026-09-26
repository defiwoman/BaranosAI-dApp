import { isCaseId, type CaseId } from '../domain/types';
import { isUnlocked, nextCase } from '../domain/progress';
import { tierForCase } from '../domain/clearance';
import { useProgress } from '../progressContext';
import { Link } from '../router';
import { caseById } from '../content/quest';
import { MissionConsole } from '../cases/MissionConsole';
import { NotFoundPage } from './NotFoundPage';
import styles from './CasePage.module.css';

export function CasePage({ id }: { id: string }) {
  if (!isCaseId(id)) return <NotFoundPage />;
  return <CaseGate key={id} id={id} />;
}

function CaseGate({ id }: { id: CaseId }) {
  const { progress } = useProgress();
  if (isUnlocked(progress, id)) return <MissionConsole caseId={id} />;
  const next = nextCase(progress);
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>
        CASE {id} <span aria-hidden="true">//</span> ACCESS RESTRICTED
      </p>
      <h1 data-page-heading tabIndex={-1} className={styles.title}>
        {caseById(id).title}
      </h1>
      <section className={styles.locked}>
        <h2>This case unlocks later</h2>
        <p>
          <span aria-hidden="true">🔒 </span>Requires {tierForCase(id)} clearance. Resolve the earlier cases first.
        </p>
        {next && (
          <Link to={`/case/${next}`} className={styles.button}>
            Go to Case {Number(next)}
          </Link>
        )}
      </section>
    </div>
  );
}
