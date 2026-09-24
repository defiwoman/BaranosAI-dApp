import { useId, useState } from 'react';
import { evaluateSort, type SortResult, type SortTask } from '../../domain/tasks';
import { Feedback } from '../desk/Feedback';
import styles from './Tasks.module.css';

interface Props {
  task: SortTask;
  onWrong: () => void;
  onSolved: () => void;
}

/** Click-to-place sorting: every card has its own native radio group, so no dragging is needed. */
export function SortTaskView({ task, onWrong, onSolved }: Props) {
  const [placements, setPlacements] = useState<Record<string, string | undefined>>({});
  const [result, setResult] = useState<SortResult | null>(null);
  const base = useId();
  const solved = result?.status === 'correct';
  const wrongFor = (itemId: string) =>
    result?.status === 'wrong' ? result.wrong.find((w) => w.itemId === itemId)?.feedback : undefined;

  const check = () => {
    const r = evaluateSort(task, placements);
    setResult(r);
    if (r.status === 'wrong') onWrong();
  };

  return (
    <div className={styles.task}>
      <p className={styles.prompt}>{task.prompt}</p>
      <ul className={styles.cards}>
        {task.items.map((item) => {
          const feedback = wrongFor(item.id);
          const unplaced = result?.status === 'incomplete' && result.unplaced.includes(item.id);
          return (
            <li key={item.id} className={`${styles.card} ${feedback ? styles.cardWrong : ''}`}>
              <fieldset className={styles.fieldset} disabled={solved}>
                <legend className={styles.cardLabel}>
                  {item.label}
                  {item.detail && <span className={styles.cardDetail}>{item.detail}</span>}
                </legend>
                <div className={styles.placeRow}>
                  {task.categories.map((c) => (
                    <label key={c.id} className={`${styles.place} ${placements[item.id] === c.id ? styles.placeOn : ''}`}>
                      <input
                        type="radio"
                        name={`${base}-${item.id}`}
                        value={c.id}
                        checked={placements[item.id] === c.id}
                        onChange={() => setPlacements((p) => ({ ...p, [item.id]: c.id }))}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {feedback && (
                <p className={styles.itemFeedback}>
                  <span aria-hidden="true">✕ </span>
                  {feedback}
                </p>
              )}
              {unplaced && <p className={styles.itemHint}>Not placed yet.</p>}
            </li>
          );
        })}
      </ul>
      <div aria-live="polite">
        {result?.status === 'incomplete' && (
          <Feedback tone="info">Place every card first ({result.unplaced.length} left).</Feedback>
        )}
        {result?.status === 'wrong' && (
          <Feedback tone="wrong">
            {result.wrong.length} {result.wrong.length === 1 ? 'card is' : 'cards are'} in the wrong place. Read the
            note under each marked card, then check again.
          </Feedback>
        )}
        {solved && <Feedback tone="right">{task.success}</Feedback>}
      </div>
      <div className={styles.actions}>
        {solved ? (
          <button type="button" className={styles.primary} onClick={onSolved}>
            Continue
          </button>
        ) : (
          <button type="button" className={styles.primary} onClick={check}>
            Check placement
          </button>
        )}
      </div>
    </div>
  );
}
