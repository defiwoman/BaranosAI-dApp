import { CASE06, CASE06_EVIDENCE, CASE06_QUESTION, CASE06_RESULTS, CASE06_STATUS_UPDATES } from '../content/case06';
import { EvidenceDoc, EvidenceGrid, FactList, RecordTable, StatusTag } from '../components/evidence/Evidence';
import { StagedCase } from './StagedCase';
import type { CaseProps } from './types';

function statusAt(stage: number) {
  return [...CASE06_STATUS_UPDATES].reverse().find((u) => u.fromStage <= stage)!;
}

function Dossier({ stage }: { stage: number }) {
  const status = statusAt(stage);
  return (
    <>
      <EvidenceDoc kind="Registered question" title={`${CASE06_QUESTION.id}: ${CASE06_QUESTION.question}`}>
        <FactList
          rows={[
            ['Registered job', CASE06_QUESTION.job],
            ['Agreed criteria', CASE06_QUESTION.criteria],
            ['Evidence policy', CASE06_QUESTION.evidencePolicy],
          ]}
        />
      </EvidenceDoc>
      <EvidenceGrid>
        <EvidenceDoc kind="Results" title="Posted results">
          <RecordTable
            caption="Results mentioning this workshop"
            head={['Result', 'Job', 'Answer', 'Status']}
            rows={CASE06_RESULTS.map((r) => [
              r.id,
              `${r.job} (${r.note})`,
              r.answer,
              r.id === 'R-88' ? status.status : r.status,
            ])}
          />
        </EvidenceDoc>
        <EvidenceDoc kind="Evidence" title="Available records">
          <FactList rows={CASE06_EVIDENCE.map((e) => [e.title, e.detail])} />
        </EvidenceDoc>
      </EvidenceGrid>
      <EvidenceGrid>
        <EvidenceDoc kind="Harbor’s action policy" title="What Harbor may do">
          <RecordTable caption="Action by status of the registered result" head={['Status', 'Permitted action']} rows={CASE06_QUESTION.actionPolicy.map((p) => [p.status, p.action])} />
        </EvidenceDoc>
        <EvidenceDoc kind="Live status (simulated)" title="R-88">
          <p>
            <StatusTag>{status.status}</StatusTag>
          </p>
          <p>{status.text}</p>
        </EvidenceDoc>
      </EvidenceGrid>
    </>
  );
}

export function Case06(props: CaseProps) {
  return <StagedCase {...props} content={CASE06} evidence={(stage) => <Dossier stage={stage} />} />;
}
