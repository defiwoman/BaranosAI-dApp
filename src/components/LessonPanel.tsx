import { useEffect, useRef, type ReactNode } from 'react';
import type { QuestCase } from '../content/types';
import { SourceLine } from './SourceList';
import styles from './LessonPanel.module.css';

interface Props {
  lesson: QuestCase;
  /** Move focus here when the case has just been solved. */
  focusOnMount: boolean;
  actions: ReactNode;
}

/** The three short explanations every case ends with, plus optional depth. */
export function LessonPanel({ lesson, focusOnMount, actions }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) heading.current?.focus();
  }, [focusOnMount]);

  return (
    <section className={styles.panel} aria-labelledby={`lesson-${lesson.id}`}>
      <h2 id={`lesson-${lesson.id}`} ref={heading} tabIndex={-1} className={styles.heading}>
        <span aria-hidden="true">✓ </span>Case solved
      </h2>
      {lesson.outro && (
        <p className={styles.mira}>
          <strong>Mira:</strong> {lesson.outro}
        </p>
      )}
      <h3>Why this matters</h3>
      <p>{lesson.lesson.why}</p>
      <h3>How BaranosAI helps</h3>
      <p>{lesson.lesson.how}</p>
      <div className={styles.takeaway}>
        <h3>Your takeaway</h3>
        <p>{lesson.lesson.takeaway}</p>
      </div>
      <details className={styles.explore}>
        <summary>Explore further</summary>
        {lesson.explore.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <SourceLine refs={lesson.explore.sources} />
      </details>
      <SourceLine refs={lesson.sources} />
      <div className={styles.actions}>{actions}</div>
    </section>
  );
}
