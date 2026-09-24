import { useId, useState } from 'react';
import { evaluateChoice, type ChoiceResult, type ChoiceTask } from '../../domain/tasks';
import { Feedback } from '../desk/Feedback';
import styles from './Tasks.module.css';

interface Props {
  task: ChoiceTask;
  onWrong: () => void;
  onSolved: () => void;
}

export function ChoiceTaskView({ task, onWrong, onSolved }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<ChoiceResult | null>(null);
  const [prompted, setPrompted] = useState(false);
  const name = useId();
  const solved = result?.correct === true;

  const submit = () => {
    if (!selected) {
      setPrompted(true);
      return;
    }
    const r = evaluateChoice(task, selected);
    setResult(r);
    setPrompted(false);
    if (!r.correct) onWrong();
  };

  return (
    <div className={styles.task}>
      <fieldset className={styles.fieldset} disabled={solved}>
        <legend className={styles.prompt}>{task.prompt}</legend>
        {task.options.map((o) => (
          <label key={o.id} className={`${styles.option} ${selected === o.id ? styles.optionSelected : ''}`}>
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={selected === o.id}
              onChange={() => {
                setSelected(o.id);
                setResult(null);
              }}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </fieldset>
      <div aria-live="polite">
        {prompted && <Feedback tone="info">Choose an option first.</Feedback>}
        {result && <Feedback tone={result.correct ? 'right' : 'wrong'}>{result.feedback}</Feedback>}
      </div>
      <div className={styles.actions}>
        {solved ? (
          <button type="button" className={styles.primary} onClick={onSolved}>
            Continue
          </button>
        ) : (
          <button type="button" className={styles.primary} onClick={submit}>
            Submit decision
          </button>
        )}
      </div>
    </div>
  );
}
