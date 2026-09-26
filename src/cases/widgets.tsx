import { useState, type ReactElement } from 'react';
import type { MissionFlags } from '../domain/mission';
import type { BaraEvent } from '../domain/bara';
import { CASE05_LETTER_LINES } from '../content/console';
import { consoleStyles as styles, Pill } from '../components/console/SystemParts';
import type { CaseId } from '../domain/types';

/** What a case widget can do to the console. */
export interface WidgetApi {
  flags: MissionFlags;
  log: (text: string, tone?: 'info' | 'ok' | 'warn' | 'fail') => void;
  react: (event: BaraEvent) => void;
  config: (matches: boolean) => void;
  sourceChecked: () => void;
  settled: () => void;
  /** Runs the shared replay trace with the case's own steps. */
  replay: () => void;
}

// ---------------------------------------------------------------- Case 02
/** Committed job vs. the reviewer's setup. Swapping anything breaks the match, visibly. */
const COMMITTED = { model: 'r3', doc: 'v1', random: false };
const MODEL_HASH: Record<string, string> = { r3: '0x7C1E…A90F', r4: '0xD93A…0C41' };
const DOC_HASH: Record<string, string> = { v1: '0x3B9D…41C2', v2: '0x5F02…E7AA' };

export function ReproduceSandbox({ api }: { api: WidgetApi }) {
  const [cfg, setCfg] = useState({ model: 'r4', doc: 'v2', random: true });
  const matches = cfg.model === COMMITTED.model && cfg.doc === COMMITTED.doc && cfg.random === COMMITTED.random;

  const change = (next: typeof cfg, what: 'model' | 'doc' | 'random') => {
    setCfg(next);
    const ok = next.model === COMMITTED.model && next.doc === COMMITTED.doc && next.random === COMMITTED.random;
    if (what === 'model') {
      api.log('Model fingerprinting…');
      api.log(next.model === COMMITTED.model ? 'Model hash confirmed' : '⚠ Model hash no longer matches', next.model === COMMITTED.model ? 'ok' : 'warn');
    } else if (what === 'doc') {
      api.log(next.doc === COMMITTED.doc ? 'Evidence committed ✓' : 'Evidence commitment mismatch', next.doc === COMMITTED.doc ? 'ok' : 'warn');
    } else {
      api.log('Execution policy changed', next.random === COMMITTED.random ? 'ok' : 'warn');
    }
    api.config(ok);
    api.react(ok ? 'configMatch' : 'configMismatch');
  };

  const Row = ({ label, committed, current, ok }: { label: string; committed: string; current: string; ok: boolean }) => (
    <tr>
      <th scope="row" className="mono" style={{ textAlign: 'left', paddingRight: 12, color: 'var(--shell-muted)', fontWeight: 400 }}>
        {label}
      </th>
      <td className="mono">{committed}</td>
      <td className={`mono ${ok ? styles.tone_ok : styles.tone_warn}`}>
        {current} {ok ? '✓' : '⚠'}
        <span className="visually-hidden">{ok ? ' matches' : ' does not match'}</span>
      </td>
    </tr>
  );

  return (
    <div>
      <p className={styles.label}>Reviewer’s setup: make it reproduce the committed job</p>
      <div className={styles.row} style={{ margin: '8px 0 12px' }}>
        <button type="button" className={styles.cmd} onClick={() => change({ ...cfg, model: cfg.model === 'r3' ? 'r4' : 'r3' }, 'model')}>
          Swap model → {cfg.model === 'r3' ? 'r4' : 'r3'}
        </button>
        <button type="button" className={styles.cmd} onClick={() => change({ ...cfg, doc: cfg.doc === 'v1' ? 'v2' : 'v1' }, 'doc')}>
          Swap evidence → {cfg.doc === 'v1' ? 'v2' : 'v1'}
        </button>
        <button type="button" className={styles.cmd} onClick={() => change({ ...cfg, random: !cfg.random }, 'random')}>
          Randomness {cfg.random ? 'off' : 'on'}
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="mono" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <caption className="visually-hidden">Committed job compared with the reviewer’s setup</caption>
          <thead>
            <tr style={{ color: 'var(--shell-muted)', textAlign: 'left' }}>
              <th scope="col">OBJECT</th>
              <th scope="col">COMMITTED</th>
              <th scope="col">REVIEWER</th>
            </tr>
          </thead>
          <tbody>
            <Row label="MODEL" committed={`r3 ${MODEL_HASH.r3}`} current={`${cfg.model} ${MODEL_HASH[cfg.model]}`} ok={cfg.model === 'r3'} />
            <Row label="EVIDENCE" committed={`v1 ${DOC_HASH.v1}`} current={`${cfg.doc} ${DOC_HASH[cfg.doc]}`} ok={cfg.doc === 'v1'} />
            <Row label="POLICY" committed="randomness off" current={`randomness ${cfg.random ? 'on' : 'off'}`} ok={!cfg.random} />
          </tbody>
        </table>
      </div>
      <p style={{ margin: '12px 0 8px' }}>
        {matches ? (
          <Pill tone="ok">✓ Configuration matches commitment</Pill>
        ) : (
          <Pill tone="warn">⚠ Not the committed job</Pill>
        )}
      </p>
      <button
        type="button"
        className={`${styles.cmd} ${styles.cmdPrimary}`}
        onClick={() => {
          if (matches) api.replay();
          else {
            api.log('Reproducing computation…');
            api.log('Verification divergence detected: different task', 'fail');
            api.react('configMismatch');
          }
        }}
      >
        Run reviewer’s job
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- Case 03
/** Posted → challenge window → settled. The learner advances time and watches the state. */
export function SettlementClock({ api }: { api: WidgetApi }) {
  const [epoch, setEpoch] = useState(0);
  const settled = epoch >= 3;
  const state = settled ? 'SETTLED' : epoch === 0 ? 'POSTED · CHALLENGE WINDOW OPEN' : `CHALLENGE WINDOW OPEN · ${epoch}/3`;
  return (
    <div>
      <p className={styles.label}>Result status (illustrative epochs, no real durations)</p>
      <ol className="mono" style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: '0.75rem', margin: '8px 0' }}>
        {['COMPUTED OFFCHAIN', 'POSTED ONCHAIN', 'CHALLENGE WINDOW', 'SETTLED'].map((s, i) => {
          const reached = i < 2 || (i === 2 && epoch >= 0) || (i === 3 && settled);
          return (
            <li key={s} className={reached ? styles.tone_ok : styles.tone_muted} style={{ border: '1px solid currentColor', borderRadius: 4, padding: '3px 8px' }}>
              {reached ? '✓' : '○'} {s}
            </li>
          );
        })}
      </ol>
      <div className={styles.row}>
        <Pill tone={settled ? 'ok' : 'warn'}>{state}</Pill>
        {!settled && (
          <button
            type="button"
            className={styles.cmd}
            onClick={() => {
              const next = epoch + 1;
              setEpoch(next);
              if (next >= 3) {
                api.settled();
                api.react('settled');
              } else api.log(`Challenge window: epoch ${next}/3, no valid challenge`);
            }}
          >
            Advance epoch
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Case 04
export function SourceCheck({ api }: { api: WidgetApi }) {
  return (
    <div>
      <p className={styles.label}>Evidence source</p>
      {api.flags.sourceChecked ? (
        <table className="mono" style={{ fontSize: '0.8rem', borderCollapse: 'collapse' }}>
          <caption className="visually-hidden">Committed evidence compared with the organiser’s final list</caption>
          <tbody>
            <tr>
              <th scope="row" style={{ textAlign: 'left', paddingRight: 16, color: 'var(--shell-muted)' }}>COMMITTED</th>
              <td>households 7 · draft · 12 Jun</td>
            </tr>
            <tr>
              <th scope="row" style={{ textAlign: 'left', paddingRight: 16, color: 'var(--shell-muted)' }}>ORGANISER</th>
              <td className={styles.tone_warn}>households 9 · signed final · 15 Jun ⚠</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <button
          type="button"
          className={styles.cmd}
          disabled={!api.flags.inferenceReplayed}
          onClick={() => {
            api.sourceChecked();
            api.react('sourceChecked');
          }}
        >
          Cross-check evidence source
        </button>
      )}
      {!api.flags.inferenceReplayed && <p className={styles.label} style={{ marginTop: 6 }}>Replay first</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Case 05
export function LetterViewer() {
  return (
    <div>
      <p className={styles.label}>Evidence document · venue letter</p>
      <ol className="mono" style={{ margin: '8px 0 0', paddingLeft: '2.2em', fontSize: '0.85rem', display: 'grid', gap: 4 }}>
        {CASE05_LETTER_LINES.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ol>
    </div>
  );
}

/** Which widget a case shows in the verify phase, and when its finding may be submitted. */
export const CASE_WIDGETS: Partial<Record<CaseId, { Widget: (p: { api: WidgetApi }) => ReactElement; label: string; afterReplay?: boolean }>> = {
  '02': { Widget: ReproduceSandbox, label: 'Reproduce the job' },
  '03': { Widget: SettlementClock, label: 'Settlement' },
  '04': { Widget: SourceCheck, label: 'Cross-check', afterReplay: true },
  '05': { Widget: LetterViewer, label: 'Evidence' },
};

export function findingReady(caseId: CaseId, f: MissionFlags): boolean {
  switch (caseId) {
    case '01':
      return true;
    case '02':
      return f.inferenceReplayed || f.configChanged;
    case '03':
      return f.inferenceReplayed || f.settled;
    case '04':
      return f.sourceChecked;
    default:
      return f.inferenceReplayed;
  }
}
