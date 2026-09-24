import { SOURCES } from '../content/sources';
import type { SourceRef } from '../content/types';
import styles from './SourceList.module.css';

/** An unobtrusive single line of source links. */
export function SourceLine({ refs, label = 'Sources' }: { refs: SourceRef[]; label?: string }) {
  return (
    <p className={styles.line}>
      {label}:{' '}
      {refs.map((ref, i) => {
        const s = SOURCES[ref.id];
        return (
          <span key={`${ref.id}-${ref.locator ?? ''}`}>
            {i > 0 && ' · '}
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title}
              {ref.locator ? `, ${ref.locator}` : ''}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </span>
        );
      })}
    </p>
  );
}
