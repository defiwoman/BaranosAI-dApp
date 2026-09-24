import { SOURCES } from '../content/sources';
import type { SourceRef } from '../content/types';
import styles from './SourceList.module.css';

export function SourceList({ refs, label = 'Sources' }: { refs: SourceRef[]; label?: string }) {
  return (
    <div className={styles.wrap}>
      <p className={styles.label}>{label}</p>
      <ul className={styles.list}>
        {refs.map((ref) => {
          const s = SOURCES[ref.id];
          return (
            <li key={`${ref.id}-${ref.locator ?? ''}`}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                [{s.id}] {s.title}
                {ref.locator ? `, ${ref.locator}` : ''}
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
              <span className={styles.meta}>
                {' '}
                — {s.author}, {s.date}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
