import type { ReactNode } from 'react';
import styles from './Desk.module.css';

export type FeedbackTone = 'info' | 'wrong' | 'right' | 'hint';

const ICON: Record<FeedbackTone, string> = { info: 'ℹ', wrong: '✕', right: '✓', hint: '?' };
const LABEL: Record<FeedbackTone, string> = { info: 'Note', wrong: 'Not yet', right: 'Correct', hint: 'Hint' };

export function Feedback({ tone, children }: { tone: FeedbackTone; children: ReactNode }) {
  return (
    <div className={`${styles.feedback} ${styles[`feedback_${tone}`]}`}>
      <span aria-hidden="true" className={styles.feedbackIcon}>
        {ICON[tone]}
      </span>
      <div>
        <strong className={styles.feedbackLabel}>{LABEL[tone]}: </strong>
        {children}
      </div>
    </div>
  );
}

export function Verdict({ tone, children }: { tone: 'upheld' | 'matches' | 'incomplete' | 'hold'; children: ReactNode }) {
  const icon = tone === 'upheld' ? '⚑' : tone === 'matches' ? '✓' : tone === 'incomplete' ? '◌' : '⏸';
  return (
    <p className={`${styles.verdict} ${styles[`verdict_${tone}`]}`}>
      <span aria-hidden="true">{icon}</span> {children}
    </p>
  );
}
