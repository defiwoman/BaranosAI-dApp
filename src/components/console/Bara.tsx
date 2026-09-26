import { useEffect, useState } from 'react';
import styles from './Bara.module.css';

interface Props {
  /** The latest reaction. A new message makes the core pulse. */
  message: { id: number; text: string } | null;
  onHint: () => void;
}

/**
 * BARA: a small living inference node. No face, no avatar, no chat. It reacts to what the
 * learner does and gives one short hint on request. On small screens it collapses to its core.
 */
export function Bara({ message, onHint }: Props) {
  const wide = () => typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(min-width: 601px)').matches;
  // On phones BARA starts as a small node so it never covers the case; new messages show a dot.
  const [open, setOpen] = useState(wide);
  const [unread, setUnread] = useState(false);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (!message) return;
    setPulse((p) => p + 1);
    if (wide()) setOpen(true);
    else setUnread(true);
  }, [message]);

  return (
    <aside className={`${styles.bara} ${open ? styles.open : ''}`} aria-label="BARA inference node">
      {open && (
        <div className={styles.bubble}>
          <p className={styles.name}>BARA</p>
          <p className={styles.text} aria-live="polite">
            {message?.text ?? 'Listening to the system.'}
          </p>
          <button type="button" className={styles.hint} onClick={onHint}>
            ASK BARA FOR A HINT
          </button>
        </div>
      )}
      <button
        type="button"
        className={styles.coreButton}
        aria-expanded={open}
        aria-label={open ? 'Minimise BARA' : unread ? 'Open BARA (new message)' : 'Open BARA'}
        onClick={() => {
          setOpen((o) => !o);
          setUnread(false);
        }}
      >
        {unread && !open && <span className={styles.unread} aria-hidden="true" />}
        <span key={pulse} className={`${styles.core} ${pulse ? styles.pulse : ''}`} aria-hidden="true">
          <span className={styles.ring} />
          <span className={styles.frag} />
          <span className={styles.frag} />
          <span className={styles.frag} />
        </span>
      </button>
    </aside>
  );
}
