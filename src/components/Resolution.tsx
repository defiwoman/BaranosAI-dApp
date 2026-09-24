import { useEffect, useRef, type ReactNode } from 'react';
import type { TechnicalNote } from '../content/types';
import { TechNote } from './TechNote';
import { SourceList } from './SourceList';
import { Link } from '../router';
import styles from './Resolution.module.css';

interface Props {
  verdict: ReactNode;
  consequence: ReactNode;
  explanation: string[];
  relation: TechnicalNote;
  notebook?: string;
  hook?: string;
  nextAction: ReactNode;
  extraActions?: ReactNode;
}

export function Resolution({ verdict, consequence, explanation, relation, notebook, hook, nextAction, extraActions }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section className={styles.resolution} aria-labelledby="resolution-heading">
      <h2 id="resolution-heading" ref={heading} tabIndex={-1} className={styles.heading}>
        Resolution
      </h2>
      {verdict}
      <div className={styles.consequence}>{consequence}</div>
      {explanation.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <TechNote note={relation} showSources={false} />
      <SourceList refs={relation.sources} label="Source references" />
      {notebook && (
        <p className={styles.notebook}>
          <span aria-hidden="true">✎ </span>Notebook entry added: <strong>{notebook}</strong>.{' '}
          <Link to="/notebook">Open the notebook</Link>
        </p>
      )}
      {hook && (
        <p className={styles.hook}>
          <strong>Mira:</strong> “{hook}”
        </p>
      )}
      <div className={styles.actions}>
        {nextAction}
        {extraActions}
      </div>
    </section>
  );
}
