import { CASES } from '../content/quest';
import { CONSOLE } from '../content/console';
import { CLEARANCES, CLEARANCE_INFO, clearanceFor, architectAccess } from '../domain/clearance';
import { certificateEligibility, isCompleted, isUnlocked, nextCase, type Progress } from '../domain/progress';
import { Link } from '../router';
import styles from './SystemMap.module.css';

type NodeState = 'resolved' | 'active' | 'open' | 'locked';

/** The case progression as a network of nodes, grouped by clearance tier. */
export function SystemMap({ progress }: { progress: Progress }) {
  const current = clearanceFor(progress);
  const next = nextCase(progress);
  const submitted = !!progress.useCase.submission;
  const architectOpen = architectAccess(progress);

  return (
    <ol className={styles.map} aria-label="System map">
      {CLEARANCES.map((tier) => {
        const reached = CLEARANCES.indexOf(current) >= CLEARANCES.indexOf(tier);
        const info = CLEARANCE_INFO[tier];
        return (
          <li key={tier} className={`${styles.tier} ${reached ? styles.tierReached : ''}`}>
            <div className={styles.tierHead}>
              <span className={styles.tierName}>{tier}</span>
              <span className={styles.tierState}>{reached ? (tier === current ? 'CURRENT' : 'GRANTED') : 'LOCKED'}</span>
            </div>
            <ul className={styles.nodes}>
              {info.cases.map((id) => {
                const c = CASES.find((x) => x.id === id)!;
                const state: NodeState = isCompleted(progress, id) ? 'resolved' : id === next ? 'active' : isUnlocked(progress, id) ? 'open' : 'locked';
                const label = { resolved: 'RESOLVED ✓', active: 'AI DECISION RECEIVED', open: 'OPEN', locked: 'LOCKED' }[state];
                const body = (
                  <>
                    <span className={styles.nodeDot} aria-hidden="true" />
                    <span className={styles.nodeId}>CASE {id}</span>
                    <span className={styles.nodeTitle}>{c.title}</span>
                    <span className={styles.nodeMeta}>
                      {CONSOLE[id].event} · {label}
                    </span>
                  </>
                );
                return (
                  <li key={id} className={`${styles.node} ${styles[state]}`}>
                    {state === 'locked' ? <span className={styles.nodeInner}>{body}</span> : <Link to={`/case/${id}`} className={styles.nodeInner}>{body}</Link>}
                  </li>
                );
              })}
              {tier === 'PROTOCOL ARCHITECT' && (
                <li className={`${styles.node} ${styles[submitted ? 'resolved' : architectOpen ? 'active' : 'locked']}`}>
                  {architectOpen ? (
                    <Link to={submitted && certificateEligibility(progress).eligible ? '/certificate' : '/use-case'} className={styles.nodeInner}>
                      <span className={styles.nodeDot} aria-hidden="true" />
                      <span className={styles.nodeId}>DESIGN</span>
                      <span className={styles.nodeTitle}>Your verifiable AI system</span>
                      <span className={styles.nodeMeta}>{submitted ? 'SUBMITTED ✓ · CERTIFICATE ISSUED' : 'ARCHITECT ACCESS PENDING'}</span>
                    </Link>
                  ) : (
                    <span className={styles.nodeInner}>
                      <span className={styles.nodeDot} aria-hidden="true" />
                      <span className={styles.nodeId}>DESIGN</span>
                      <span className={styles.nodeTitle}>Your verifiable AI system</span>
                      <span className={styles.nodeMeta}>LOCKED · UNLOCKS AFTER CASE 06</span>
                    </span>
                  )}
                </li>
              )}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
