import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './SystemParts';
import styles from './Console.module.css';

interface Props {
  original: string[];
  replay: string[];
  /** Starts the replay when it changes to true. */
  running: boolean;
  onDone: (diverged: boolean, step: number | null) => void;
  /** Labels for the two outcomes. */
  confirmedLabel?: string;
  divergedLabel?: string;
}

/** Index of the first step where replay and original differ, or null if identical. */
export function firstDivergence(original: string[], replay: string[]): number | null {
  const n = Math.max(original.length, replay.length);
  for (let i = 0; i < n; i++) if (original[i] !== replay[i]) return i;
  return null;
}

/**
 * ORIGINAL vs REPLAY, step by step. An educational abstraction of re-running a committed
 * computation: it stops at the first divergent step and highlights it.
 */
export function VerificationTrace({
  original,
  replay,
  running,
  onDone,
  confirmedLabel = 'DETERMINISTIC REPLAY CONFIRMED',
  divergedLabel = 'DISPUTED STEP ISOLATED',
}: Props) {
  const reduced = usePrefersReducedMotion();
  const divergence = firstDivergence(original, replay);
  const last = divergence ?? replay.length - 1;
  const [shown, setShown] = useState(-1);
  const finished = shown >= last;
  const reported = useRef(false);

  useEffect(() => {
    if (!running) return;
    if (reduced) {
      setShown(last);
      return;
    }
    setShown(-1);
    let i = -1;
    const t = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= last) clearInterval(t);
    }, 380);
    return () => clearInterval(t);
  }, [running, reduced, last]);

  useEffect(() => {
    if (running && finished && !reported.current) {
      reported.current = true;
      onDone(divergence !== null, divergence);
    }
  }, [running, finished, divergence, onDone]);

  const stages = ['INPUT', 'MODEL', ...original.map((_, i) => `S${String(i + 1).padStart(2, '0')}`), 'OUTPUT'];

  return (
    <div>
      <div className={styles.traceRows} aria-label="Verification trace">
        <div className={styles.traceRow}>
          <span className={styles.traceTag}>ORIGINAL</span>
          <span className={styles.step}>COMMITTED INPUT</span>
          <span className={styles.arrow}>→</span>
          <span className={styles.step}>MODEL HASH</span>
          {original.map((s, i) => (
            <span key={i} style={{ display: 'contents' }}>
              <span className={styles.arrow}>→</span>
              <span className={styles.step}>
                {String(i + 1).padStart(2, '0')} · {s}
              </span>
            </span>
          ))}
        </div>
        <div className={styles.traceRow}>
          <span className={styles.traceTag}>REPLAY</span>
          <span className={`${styles.step} ${shown >= -1 && running ? styles.stepMatch : styles.stepPending}`}>COMMITTED INPUT</span>
          <span className={styles.arrow}>→</span>
          <span className={`${styles.step} ${running ? styles.stepMatch : styles.stepPending}`}>MODEL HASH</span>
          {replay.map((s, i) => {
            if (divergence !== null && i > divergence) return null;
            const visible = running && i <= shown;
            const bad = visible && divergence === i;
            return (
              <span key={i} style={{ display: 'contents' }}>
                <span className={styles.arrow}>→</span>
                <span className={`${styles.step} ${!visible ? styles.stepPending : bad ? styles.stepDiverge : styles.stepMatch}`}>
                  {visible ? `${String(i + 1).padStart(2, '0')} · ${s}` : '··'}
                  {bad && <span className="visually-hidden"> (diverges from original)</span>}
                </span>
              </span>
            );
          })}
        </div>
      </div>
      <span className="visually-hidden">Stages: {stages.join(', ')}</span>
      {running && finished && (
        <p className={`${styles.traceResult} ${divergence === null ? styles.tone_ok : styles.tone_fail}`}>
          {divergence === null ? `✓ ${confirmedLabel}` : `✕ ${divergedLabel} · STEP ${String(divergence + 1).padStart(2, '0')}`}
        </p>
      )}
    </div>
  );
}
