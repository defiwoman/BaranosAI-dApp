import { SIMULATION_NOTE } from '../content/brand';
import styles from './SimulationNote.module.css';

export function SimulationNote() {
  return (
    <details className={styles.note}>
      <summary>Learning simulation: what does this mean?</summary>
      <p>{SIMULATION_NOTE}</p>
    </details>
  );
}
