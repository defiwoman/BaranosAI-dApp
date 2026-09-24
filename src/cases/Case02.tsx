import { CASE02, CASE02_JOB, CASE02_RETRIEVAL } from '../content/case02';
import { EvidenceDoc, FactList, RecordTable } from '../components/evidence/Evidence';
import { StagedCase } from './StagedCase';
import type { CaseProps } from './types';

function JobRecord() {
  return (
    <EvidenceDoc kind="Job record" title={`Job ${CASE02_JOB.id}`}>
      <FactList
        rows={[
          ['Task', CASE02_JOB.task],
          ['Posted result', CASE02_JOB.posted],
          ['Operator', 'Offline; cannot be contacted'],
          ['Reviewer', 'Independent; has only what you give them'],
        ]}
      />
    </EvidenceDoc>
  );
}

function RetrievalLog() {
  return (
    <EvidenceDoc kind="Reviewer’s log" title="Retrieval attempts">
      <RecordTable
        caption="What the reviewer could fetch"
        head={['Item', 'Committed', 'Retrieved', 'Note']}
        rows={CASE02_RETRIEVAL.map((r) => [r.item, r.committed, r.retrieved, r.note])}
      />
    </EvidenceDoc>
  );
}

export function Case02(props: CaseProps) {
  return (
    <StagedCase
      {...props}
      content={CASE02}
      evidence={(stage) => (stage === 0 ? <JobRecord /> : <RetrievalLog />)}
    />
  );
}
