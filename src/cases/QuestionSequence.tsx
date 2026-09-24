import { useState } from 'react';
import type { Question } from '../domain/tasks';
import { QuestionView } from '../components/tasks/QuestionView';
import type { ChallengeProps } from './types';
import styles from './QuestionSequence.module.css';

/**
 * Asks a case’s questions one at a time. A returning participant whose earlier save already
 * covers some checks is asked only the missing ones. On a replay, every question is shown again.
 */
export function QuestionSequence({ questions, onPass, missing, replay }: ChallengeProps & { questions: Question[] }) {
  const [asked] = useState(() => (replay ? questions : questions.filter((q) => missing.includes(q.id))));
  const [index, setIndex] = useState(0);
  const skipped = questions.length - asked.length;
  const current = asked[index];
  if (!current) return null;

  return (
    <div>
      {skipped > 0 && (
        <p className={styles.carried}>
          Your earlier progress already covers {skipped} of these {questions.length} questions, so there{' '}
          {asked.length === 1 ? 'is just 1 new question' : `are ${asked.length} new questions`} to answer.
        </p>
      )}
      <QuestionView
        key={current.id}
        question={current}
        label={asked.length > 1 ? `Question ${index + 1} of ${asked.length}` : undefined}
        onCorrect={() => onPass(current.id)}
        next={index < asked.length - 1 ? { label: 'Next question', onClick: () => setIndex((i) => i + 1) } : undefined}
      />
    </div>
  );
}
