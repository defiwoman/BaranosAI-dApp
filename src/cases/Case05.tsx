import { CASE05, CASE05_LETTER, CASE05_OUTPUT, CASE05_POLICY, CASE05_SAFER_SPEC } from '../content/case05';
import { EvidenceDoc, EvidenceGrid, FactList, Quote, StatusTag } from '../components/evidence/Evidence';
import { StagedCase } from './StagedCase';
import type { CaseProps } from './types';

function Packet({ flagged, showOutput }: { flagged: boolean; showOutput: boolean }) {
  return (
    <EvidenceGrid>
      <EvidenceDoc kind="Harbor’s agreed policy" title="Job H-0503">
        <FactList
          rows={[
            ['Task', CASE05_POLICY.task],
            ['Allowed outputs', CASE05_POLICY.outputs.join(' · ')],
            ['Otherwise', CASE05_POLICY.rule],
            ...(showOutput ? ([['Posted output', <StatusTag>{CASE05_OUTPUT}</StatusTag>]] as [string, React.ReactNode][]) : []),
          ]}
        />
      </EvidenceDoc>
      <EvidenceDoc kind="Evidence" title="Venue letter">
        <Quote lines={CASE05_LETTER} flagged={flagged ? 2 : undefined} />
      </EvidenceDoc>
    </EvidenceGrid>
  );
}

function SaferSpec() {
  return (
    <EvidenceDoc kind="Draft" title="Safer job specification (H-0503-b)">
      <ul>
        {CASE05_SAFER_SPEC.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </EvidenceDoc>
  );
}

export function Case05(props: CaseProps) {
  return (
    <StagedCase
      {...props}
      content={CASE05}
      evidence={(stage) =>
        stage >= 2 ? (
          <SaferSpec />
        ) : (
          <Packet flagged={stage >= 1} showOutput={stage >= 1} />
        )
      }
    />
  );
}
