import { useId, useState } from 'react';
import styles from './Console.module.css';

/** "Would you trust this AI decision?" A visual slider, not a 1–10 quiz. */
export function TrustMeter({ question, submitLabel, onSubmit, initial = 50 }: { question: string; submitLabel: string; onSubmit: (v: number) => void; initial?: number }) {
  const [value, setValue] = useState(initial);
  const id = useId();
  return (
    <div className={styles.trust}>
      <label htmlFor={id} className={styles.trustQuestion}>
        {question}
      </label>
      <div className={styles.trustScale}>
        <span aria-hidden="true">NO TRUST</span>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          className={styles.range}
          aria-valuetext={`${value}% trust`}
          onChange={(e) => setValue(Number(e.target.value))}
        />
        <span aria-hidden="true">TRUST</span>
      </div>
      <div className={styles.row} style={{ justifyContent: 'space-between' }}>
        <p className={styles.trustValue} aria-hidden="true">
          {value}%
        </p>
        <button type="button" className={`${styles.cmd} ${styles.cmdPrimary}`} onClick={() => onSubmit(value)}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

/** Before → after, with the marker moving from the first value to the second. */
export function TrustShiftView({ before, after, insight }: { before: number; after: number; insight: string }) {
  return (
    <div>
      <div className={styles.shiftNumbers}>
        <span>
          INITIAL TRUST <strong>{before}%</strong>
        </span>
        <span>
          AFTER VERIFICATION <strong>{after}%</strong>
        </span>
      </div>
      <div className={styles.shift} aria-hidden="true">
        <div className={styles.shiftTrack} />
        <span className={styles.shiftMark} style={{ left: `${before}%` }} />
        <span className={`${styles.shiftMark} ${styles.shiftAfter}`} style={{ left: `${after}%`, ['--from' as string]: `${before}%` }} />
      </div>
      <p style={{ margin: '6px 0 0' }}>{insight}</p>
    </div>
  );
}
