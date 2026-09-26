import { useEffect, useState, type ReactNode } from 'react';
import type { LogEntry, LogTone, SystemStatus } from '../../domain/mission';
import type { CheckState } from '../../content/console';
import { CLEARANCE_INFO, type Clearance } from '../../domain/clearance';
import styles from './Console.module.css';

export function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

const GLYPH: Record<LogTone, string> = { info: '›', ok: '✓', warn: '⚠', fail: '✕' };

const STATUS_TONE: Record<SystemStatus, LogTone | 'muted'> = {
  UNVERIFIED: 'muted',
  'UNDER REVIEW': 'info',
  REPLAYING: 'info',
  VERIFIED: 'ok',
  CHALLENGED: 'warn',
  'DIVERGENCE DETECTED': 'fail',
};

export function StatusPill({ status, live }: { status: SystemStatus; live?: boolean }) {
  const tone = STATUS_TONE[status];
  return (
    <span className={`${styles.pill} ${styles[`tone_${tone}`]} ${live ? styles.live : ''}`}>
      <span className={styles.dot} aria-hidden="true" />
      STATUS: {status}
    </span>
  );
}

export function Pill({ tone, children }: { tone: LogTone | 'muted'; children: ReactNode }) {
  return <span className={`${styles.pill} ${styles[`tone_${tone}`]}`}>{children}</span>;
}

/** Compact machine log. The newest line is emphasised; screen readers get the toast instead. */
export function SystemLog({ entries }: { entries: LogEntry[] }) {
  return (
    <ol className={styles.log} aria-label="System log">
      {entries.map((e) => (
        <li key={e.id} className={styles[`tone_${e.tone}`]}>
          <span aria-hidden="true">{GLYPH[e.tone]}</span>
          <span>{e.text}</span>
        </li>
      ))}
    </ol>
  );
}

/** Small, self-dismissing reactions for the most recent system event. Announced politely. */
export function Toasts({ latest }: { latest: LogEntry | null }) {
  const [shown, setShown] = useState<LogEntry[]>([]);
  useEffect(() => {
    if (!latest) return;
    setShown((s) => [...s.filter((x) => x.id !== latest.id), latest].slice(-2));
    const t = setTimeout(() => setShown((s) => s.filter((x) => x.id !== latest.id)), 2600);
    return () => clearTimeout(t);
  }, [latest]);
  return (
    <div className={styles.toastRegion} role="status" aria-live="polite">
      {shown.map((e) => (
        <div key={e.id} className={`${styles.toast} ${styles[`tone_${e.tone}`]}`}>
          <span aria-hidden="true">{GLYPH[e.tone]} </span>
          {e.text}
        </div>
      ))}
    </div>
  );
}

/** A thin system line: INPUT → MODEL → INFERENCE → OUTPUT. Pulses travel while `running`. */
export function ComputationLine({ stages, running, lit }: { stages: string[]; running: boolean; lit: number }) {
  return (
    <div className={`${styles.line} ${running ? styles.running : ''}`} aria-hidden="true">
      {stages.map((s, i) => (
        <span key={s} style={{ display: 'contents' }}>
          {i > 0 && <span className={styles.wire} />}
          <span className={`${styles.node} ${i < lit ? styles.nodeLit : ''}`}>{s}</span>
        </span>
      ))}
    </div>
  );
}

const CHECK_GLYPH: Record<CheckState, string> = { ok: '✓', warn: '⚠', fail: '✕' };
const CHECK_TONE: Record<CheckState, LogTone> = { ok: 'ok', warn: 'warn', fail: 'fail' };

export function VerdictPanel({ title, checks, limit }: { title: string; checks: [string, CheckState][]; limit?: string }) {
  return (
    <section className={`${styles.panel} ${styles.verifyPulse}`} aria-labelledby="verdict-title">
      <p className={styles.label}>Verification result</p>
      <h2 id="verdict-title" className="mono" style={{ fontSize: '1.1rem', letterSpacing: '0.06em' }}>
        {title}
      </h2>
      <ul className={styles.checks}>
        {checks.map(([label, state]) => (
          <li key={label} className={styles[`tone_${CHECK_TONE[state]}`]}>
            {label} {CHECK_GLYPH[state]}
            <span className="visually-hidden">{state === 'ok' ? ' confirmed' : state === 'warn' ? ' disputed' : ' failed'}</span>
          </li>
        ))}
      </ul>
      {limit && (
        <p className={styles.limit}>
          <strong aria-hidden="true">⚠</strong>
          <span>
            <span className="visually-hidden">Limitation: </span>
            {limit}
          </span>
        </p>
      )}
    </section>
  );
}

/** Access expanding, rather than a celebration. */
export function ClearanceUpgrade({ from, to, pending }: { from: Clearance; to: Clearance; pending?: boolean }) {
  return (
    <section className={`${styles.panel} ${styles.upgrade}`} aria-label="Clearance upgrade">
      <p className={styles.label}>{pending ? 'Access pending' : 'Clearance upgrade'}</p>
      <p className={styles.upgradeLine}>
        {from} <span aria-hidden="true">→</span>
        <span className="visually-hidden"> to </span> {to}
      </p>
      {pending ? (
        <p style={{ margin: 0 }}>Design one verifiable AI system to complete Protocol Architect clearance.</p>
      ) : (
        <ul className={styles.caps} aria-label="New capabilities">
          {CLEARANCE_INFO[to].capabilities.map((c) => (
            <li key={c} className={styles.tone_ok}>
              + {c}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Panel({ label, children, right }: { label: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className={styles.panel} aria-label={label}>
      <div className={styles.panelHead}>
        <p className={styles.label}>{label}</p>
        {right}
      </div>
      {children}
    </section>
  );
}

export { styles as consoleStyles };
