import type { ReactNode } from 'react';
import styles from './Evidence.module.css';

/** A flat evidence document on the paper surface. */
export function EvidenceDoc({ title, kind, children }: { title: string; kind?: string; children: ReactNode }) {
  return (
    <section className={styles.doc} aria-label={title}>
      {kind && <p className={styles.kind}>{kind}</p>}
      <h3 className={styles.docTitle}>{title}</h3>
      {children}
    </section>
  );
}

export function FactList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className={styles.facts}>
      {rows.map(([k, v]) => (
        <div key={k} className={styles.factRow}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function RecordTable({ caption, head, rows }: { caption: string; head: string[]; rows: ReactNode[][] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {c}
                  </th>
                ) : (
                  <td key={j}>{c}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Quote({ lines, flagged }: { lines: string[]; flagged?: number }) {
  return (
    <blockquote className={styles.quote}>
      {lines.map((l, i) => (
        <p key={l} className={i === flagged ? styles.flagged : undefined}>
          {i === flagged && <span className={styles.flag}>Untrusted content: </span>}
          {l}
        </p>
      ))}
    </blockquote>
  );
}

export function EvidenceGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function StatusTag({ children }: { children: ReactNode }) {
  return <span className={styles.status}>{children}</span>;
}
