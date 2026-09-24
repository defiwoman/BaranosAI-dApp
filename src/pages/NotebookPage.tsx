import { useEffect, useState } from 'react';
import { NOTEBOOK } from '../content/quest';
import { SOURCES } from '../content/sources';
import type { NotebookCategory } from '../content/types';
import { useProgress } from '../progressContext';
import { isCompleted } from '../domain/progress';
import { SourceLine } from '../components/SourceList';
import { Link } from '../router';
import styles from './NotebookPage.module.css';

const CATEGORIES: NotebookCategory[] = ['Verification', 'Reproducibility', 'Settlement', 'Limitations'];
const SEARCH_THRESHOLD = 4;

export function NotebookPage() {
  const { progress } = useProgress();
  const [query, setQuery] = useState('');
  const unlocked = NOTEBOOK.filter((e) => isCompleted(progress, e.caseId));
  const q = query.trim().toLowerCase();
  const visible = q ? unlocked.filter((e) => `${e.title} ${e.summary} ${e.takeaway} ${e.category}`.toLowerCase().includes(q)) : unlocked;

  // Links such as /notebook#case-02 jump to that case's entry.
  useEffect(() => {
    const el = document.getElementById(window.location.hash.slice(1));
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
      <p className={styles.intro}>One short note for each case you solve, to look back on.</p>

      {unlocked.length >= SEARCH_THRESHOLD && (
        <div className={styles.search}>
          <label htmlFor="notebook-search">Search the notebook</label>
          <input id="notebook-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. settled, evidence" />
          <p aria-live="polite" className={styles.count}>
            {q ? `${visible.length} of ${unlocked.length} notes match.` : ''}
          </p>
        </div>
      )}

      {unlocked.length === 0 ? (
        <p className={styles.empty}>
          No notes yet. <Link to="/case/01">Open the first case</Link> to start your notebook.
        </p>
      ) : (
        CATEGORIES.map((cat) => {
          const entries = visible.filter((e) => e.category === cat);
          if (entries.length === 0) return null;
          return (
            <section key={cat} aria-labelledby={`cat-${cat}`} className={styles.category}>
              <h2 id={`cat-${cat}`} className={styles.catTitle}>
                {cat}
              </h2>
              {entries.map((e) => (
                <article key={e.caseId} id={`case-${e.caseId}`} tabIndex={-1} className={styles.entry}>
                  <h3>{e.title}</h3>
                  <p>{e.summary}</p>
                  <p className={styles.takeaway}>{e.takeaway}</p>
                  <SourceLine refs={e.sources} />
                  <p className={styles.meta}>
                    <Link to={`/case/${e.caseId}`}>Revisit Case {Number(e.caseId)}</Link>
                  </p>
                </article>
              ))}
            </section>
          );
        })
      )}
      {unlocked.length > 0 && unlocked.length < NOTEBOOK.length && (
        <p className={styles.locked}>
          {NOTEBOOK.length - unlocked.length} more {NOTEBOOK.length - unlocked.length === 1 ? 'note unlocks' : 'notes unlock'} as you play.
        </p>
      )}

      <details className={styles.register}>
        <summary>All sources</summary>
        <ul>
          {Object.values(SOURCES).map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
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
