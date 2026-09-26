import { useEffect, useState } from 'react';
import type { SysObject } from '../../content/console';
import styles from './Console.module.css';

interface Props {
  object: SysObject;
  expanded: boolean;
  onToggle: () => void;
  /** e.g. "ANALYST". When set, the card is locked at the learner's clearance. */
  lockedUntil?: string;
  /** Overrides the status line, e.g. "⚠ HASH MISMATCH". */
  statusOverride?: { text: string; tone: 'ok' | 'warn' | 'fail' };
  /** Changing this value flashes the card (a mismatch or change drew attention to it). */
  flashKey?: number;
}

/** A system object (model, evidence, rules). Short on words; the detail opens in place. */
export function ObjectCard({ object, expanded, onToggle, lockedUntil, statusOverride, flashKey }: Props) {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!flashKey) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 700);
    return () => clearTimeout(t);
  }, [flashKey]);

  const detailId = `obj-${object.kind}-detail`;
  return (
    <div>
      <button
        type="button"
        className={`${styles.object} ${flash ? styles.flash : ''}`}
        aria-expanded={lockedUntil ? undefined : expanded}
        aria-controls={lockedUntil ? undefined : detailId}
        disabled={!!lockedUntil}
        onClick={onToggle}
      >
        <span className={styles.objectKind}>{object.kind}</span>
        <span className={styles.objectName}>{object.name}</span>
        {lockedUntil ? (
          <span className={`${styles.objectStatus} ${styles.tone_muted}`}>
            <span>
              <span aria-hidden="true">🔒 </span>REQUIRES {lockedUntil} CLEARANCE
            </span>
          </span>
        ) : (
          <>
            <dl className={styles.fields}>
              {object.fields.map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <span className={styles.objectStatus}>
              {statusOverride ? (
                <span className={styles[`tone_${statusOverride.tone}`]}>{statusOverride.text}</span>
              ) : (
                <span className={styles.tone_ok}>{object.status} ✓</span>
              )}
              <span className={styles.lockHint} aria-hidden="true">
                {object.kind === 'MODEL' ? 'Fingerprint locked' : expanded ? 'Close' : 'Inspect'}
              </span>
            </span>
          </>
        )}
      </button>
      {expanded && !lockedUntil && (
        <p id={detailId} className={styles.detail}>
          {object.detail}
        </p>
      )}
    </div>
  );
}
