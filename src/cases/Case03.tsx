import { CASE03, CASE03_POLICY, CASE03_ROUTES, CASE03_TIMELINE, type TimelineEvent } from '../content/case03';
import { EvidenceDoc, EvidenceGrid } from '../components/evidence/Evidence';
import { StagedCase } from './StagedCase';
import type { CaseProps } from './types';
import styles from './Case03.module.css';

const WHERE_LABEL: Record<TimelineEvent['where'], string> = {
  offchain: 'Offchain',
  onchain: 'Onchain',
  harbor: 'Harbor app',
};

function Timeline({ corrected }: { corrected: boolean }) {
  const events = corrected
    ? [...CASE03_TIMELINE.filter((e) => e.id !== 'act'), CASE03_TIMELINE.find((e) => e.id === 'act')!]
    : CASE03_TIMELINE;
  return (
    <EvidenceDoc kind="Illustrative timeline, no durations" title={corrected ? 'H-0305, corrected order' : 'H-0305 as it happened'}>
      <p className={styles.policy}>
        Harbor’s policy: <strong>{CASE03_POLICY}</strong>
      </p>
      <ol className={styles.timeline}>
        {events.map((e) => (
          <li key={e.id} className={`${styles.event} ${e.id === 'act' ? styles.harbor : ''} ${corrected && e.id === 'act' ? styles.moved : ''}`}>
            <span className={styles.where}>{WHERE_LABEL[e.where]}</span>
            <span>{e.label}</span>
            {corrected && e.id === 'act' && <span className={styles.note}>moved after settlement</span>}
          </li>
        ))}
      </ol>
    </EvidenceDoc>
  );
}

function Routes() {
  return (
    <EvidenceGrid>
      <EvidenceDoc kind="Route" title="Confirmation">
        <ol className={styles.route}>
          {CASE03_ROUTES.confirmation.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </EvidenceDoc>
      <EvidenceDoc kind="Route" title="Replay">
        <ol className={styles.route}>
          {CASE03_ROUTES.replay.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </EvidenceDoc>
    </EvidenceGrid>
  );
}

export function Case03(props: CaseProps) {
  return (
    <StagedCase
      {...props}
      content={CASE03}
      evidence={(stage) => (
        <>
          <Timeline corrected={stage >= 2} />
          {stage >= 2 && <Routes />}
        </>
      )}
    />
  );
}
