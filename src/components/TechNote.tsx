import type { TechnicalNote } from '../content/types';
import { SourceList } from './SourceList';
import styles from './TechNote.module.css';

export function TechNote({ note, showSources = true }: { note: TechnicalNote; showSources?: boolean }) {
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>{note.title}</summary>
      <div className={styles.body}>
        {note.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {showSources && <SourceList refs={note.sources} />}
      </div>
    </details>
  );
}
