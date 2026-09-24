import { NOTEBOOK, NOTEBOOK_CATEGORIES } from '../content/notebook';
import { useProgress } from '../progressContext';
import { SourceList } from '../components/SourceList';
import { Link } from '../router';
import styles from './NotebookPage.module.css';

export function NotebookPage() {
  const { progress } = useProgress();
  const unlocked = NOTEBOOK.filter((e) => progress.notebook.includes(e.id));
  const lockedCount = NOTEBOOK.length - unlocked.length;

  return (
    <div className={styles.page}>
      <h1 data-page-heading tabIndex={-1} className={styles.title}>
        Notebook
      </h1>
      <p className={styles.intro}>Entries unlock as you resolve cases. Each one links to its sources.</p>

      {unlocked.length === 0 ? (
        <p className={styles.empty}>
          No entries yet. <Link to="/case/01">Open the first case</Link> to start your notebook.
        </p>
      ) : (
        NOTEBOOK_CATEGORIES.map((cat) => {
          const entries = unlocked.filter((e) => e.category === cat);
          if (entries.length === 0) return null;
          return (
            <section key={cat} aria-labelledby={`cat-${cat}`} className={styles.category}>
              <h2 id={`cat-${cat}`} className={styles.catTitle}>
                {cat}
              </h2>
              {entries.map((e) => (
                <article key={e.id} id={`case-${e.caseId}`} className={styles.entry}>
                  <h3>{e.title}</h3>
                  <p>{e.body}</p>
                  <SourceList refs={e.sources} />
                  <p className={styles.meta}>
                    From Case {e.caseId} · Curriculum v{e.curriculumVersion}
                  </p>
                </article>
              ))}
            </section>
          );
        })
      )}
      {lockedCount > 0 && unlocked.length > 0 && (
        <p className={styles.locked}>
          {lockedCount} more {lockedCount === 1 ? 'entry unlocks' : 'entries unlock'} as you play.
        </p>
      )}
    </div>
  );
}
