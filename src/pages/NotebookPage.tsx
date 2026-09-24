import { useEffect, useState } from 'react';
import { NOTEBOOK, NOTEBOOK_CATEGORIES } from '../content/notebook';
import { SOURCES } from '../content/sources';
import { useProgress } from '../progressContext';
import { SourceList } from '../components/SourceList';
import { Link } from '../router';
import styles from './NotebookPage.module.css';

/** Search appears once there are enough entries for it to help. */
const SEARCH_THRESHOLD = 5;

export function NotebookPage() {
  const { progress } = useProgress();
  const [query, setQuery] = useState('');
  const unlocked = NOTEBOOK.filter((e) => progress.notebook.includes(e.id));
  const lockedCount = NOTEBOOK.length - unlocked.length;
  const q = query.trim().toLowerCase();
  const visible = q
    ? unlocked.filter((e) => `${e.title} ${e.body} ${e.category}`.toLowerCase().includes(q))
    : unlocked;
  // The first entry of each case (in display order) carries the #case-NN anchor.
  const firstOfCase = new Set<string>();
  const seenCases = new Set<string>();
  for (const e of NOTEBOOK_CATEGORIES.flatMap((cat) => visible.filter((x) => x.category === cat))) {
    if (!seenCases.has(e.caseId)) {
      seenCases.add(e.caseId);
      firstOfCase.add(e.id);
    }
  }

  // Links such as /notebook#case-02 jump to that case's first entry.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView();
      el.focus();
    }
  }, []);

  return (
    <div className={styles.page}>
      <h1 data-page-heading tabIndex={-1} className={styles.title}>
        Notebook
      </h1>
      <p className={styles.intro}>Entries unlock as you resolve cases. Each one links to its sources.</p>

      {unlocked.length >= SEARCH_THRESHOLD && (
        <div className={styles.search}>
          <label htmlFor="notebook-search">Search the notebook</label>
          <input
            id="notebook-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. settlement, commitment"
          />
          <p aria-live="polite" className={styles.count}>
            {q ? `${visible.length} of ${unlocked.length} entries match.` : ''}
          </p>
        </div>
      )}

      {unlocked.length === 0 ? (
        <p className={styles.empty}>
          No entries yet. <Link to="/case/01">Open the first case</Link> to start your notebook.
        </p>
      ) : (
        NOTEBOOK_CATEGORIES.map((cat) => {
          const entries = visible.filter((e) => e.category === cat);
          if (entries.length === 0) return null;
          return (
            <section key={cat} aria-labelledby={`cat-${cat}`} className={styles.category}>
              <h2 id={`cat-${cat}`} className={styles.catTitle}>
                {cat}
              </h2>
              {entries.map((e) => (
                <article
                  key={e.id}
                  id={firstOfCase.has(e.id) ? `case-${e.caseId}` : undefined}
                  tabIndex={firstOfCase.has(e.id) ? -1 : undefined}
                  className={styles.entry}
                >
                  <h3>{e.title}</h3>
                  <p>{e.body}</p>
                  <SourceList refs={e.sources} />
                  <p className={styles.meta}>
                    From <Link to={`/case/${e.caseId}`}>Case {e.caseId}</Link> · Curriculum v{e.curriculumVersion}
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

      <details className={styles.register}>
        <summary>Source register and claim boundaries</summary>
        <ul>
          {Object.values(SOURCES).map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                [{s.id}] {s.title}
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>{' '}
              — {s.author}, {s.date}. <span className={styles.boundary}>{s.boundary}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
