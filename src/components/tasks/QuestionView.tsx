import { useId, useState } from 'react';
import { evaluateChoice, type ChoiceResult, type Question } from '../../domain/tasks';
import { Feedback } from '../desk/Feedback';
import styles from './Tasks.module.css';

interface Props {
  question: Question;
  /** Called once when the correct option is submitted. */
  onCorrect: () => void;
  /** Shown after a correct answer when more questions follow. */
  next?: { label: string; onClick: () => void };
  /** e.g. "Question 1 of 3". */
  label?: string;
}

/** One multiple-choice question: unlimited retries, an optional hint, and an explanation for every option. */
export function QuestionView({ question, onCorrect, next, label }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<ChoiceResult | null>(null);
  const [prompted, setPrompted] = useState(false);
  const [hint, setHint] = useState(false);
  const name = useId();
  const solved = result?.correct === true;

  const submit = () => {
    if (!selected) {
      setPrompted(true);
      return;
    }
    const r = evaluateChoice(question, selected);
    setResult(r);
    setPrompted(false);
    if (r.correct) onCorrect();
  };

  return (
    <div className={styles.task}>
      {label && <p className={styles.label}>{label}</p>}
      {question.scenario && <p className={styles.scenario}>{question.scenario}</p>}
      <fieldset className={styles.fieldset} disabled={solved}>
        <legend className={styles.prompt}>{question.prompt}</legend>
        {question.options.map((o) => (
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
        {prompted && <Feedback tone="info">Choose an answer first.</Feedback>}
        {result && <Feedback tone={result.correct ? 'right' : 'wrong'}>{result.feedback}</Feedback>}
        {result && !result.correct && <p className={styles.retry}>Have another go. You can try as many times as you like.</p>}
        {hint && !solved && <Feedback tone="hint">{question.hint}</Feedback>}
      </div>
      <div className={styles.actions}>
        {!solved && (
          <button type="button" className={styles.primary} onClick={submit}>
            Check my answer
          </button>
        )}
        {!solved && !hint && (
          <button type="button" className={styles.quiet} onClick={() => setHint(true)}>
            Show a hint
          </button>
        )}
        {solved && next && (
          <button type="button" className={styles.primary} onClick={next.onClick}>
            {next.label}
          </button>
        )}
      </div>
    </div>
  );
}
