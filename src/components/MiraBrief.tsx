import styles from './MiraBrief.module.css';

export function MiraBrief({ lines, caseLabel }: { lines: string[]; caseLabel: string }) {
  return (
    <section className={styles.brief} aria-label={`${caseLabel} briefing`}>
      <p className={styles.speaker}>
        <span aria-hidden="true" className={styles.initial}>
          M
        </span>
        Mira, review desk
      </p>
      <blockquote className={styles.quote}>
        {lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </blockquote>
    </section>
  );
}
