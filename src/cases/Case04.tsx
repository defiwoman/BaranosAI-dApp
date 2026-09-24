import { CASE04, CASE04_CORRECTED_JOB, CASE04_EVIDENCE, CASE04_JOB, CASE04_TRACE } from '../content/case04';
import { canonicalScore, formatStep } from '../domain/toyModel';
import { EvidenceDoc, EvidenceGrid, FactList, Quote, StatusTag } from '../components/evidence/Evidence';
import { StagedCase } from './StagedCase';
import type { CaseProps } from './types';

function JobAndTrace() {
  const { inputs, weights } = CASE04_JOB;
  return (
    <EvidenceGrid>
      <EvidenceDoc kind="Agreed job" title={`${CASE04_JOB.id} · ${CASE04_JOB.model}`}>
        <FactList
          rows={[
            ['Rule', <span className="num">attendance = w1 × households + w2 × group bookings</span>],
            ['Weights', <span className="num">w1 = {weights.w1}, w2 = {weights.w2}</span>],
            ['Committed inputs', <span className="num">households = {inputs.x1}, group bookings = {inputs.x2}</span>],
            ['Status', <StatusTag>Settled</StatusTag>],
          ]}
        />
      </EvidenceDoc>
      <EvidenceDoc kind="Submitted trace" title="Execution">
        <FactList rows={CASE04_TRACE.map((s) => [`Step ${s.index}`, <span className="num">{formatStep(s)}</span>])} />
      </EvidenceDoc>
    </EvidenceGrid>
  );
}

function EvidenceRecords() {
  return (
    <>
      <EvidenceDoc kind="Harbor’s evidence policy" title="Attendance planning">
        <ul>
          {CASE04_EVIDENCE.policy.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </EvidenceDoc>
      <EvidenceGrid>
        {[CASE04_EVIDENCE.used, CASE04_EVIDENCE.final, CASE04_EVIDENCE.forum].map((d) => (
          <EvidenceDoc key={d.title} kind="Record" title={d.title}>
            <Quote lines={d.lines} />
          </EvidenceDoc>
        ))}
      </EvidenceGrid>
    </>
  );
}

function ProposedJob() {
  const { inputs, weights } = CASE04_CORRECTED_JOB;
  return (
    <EvidenceDoc kind="Proposed new job" title={`${CASE04_CORRECTED_JOB.id} · ${CASE04_CORRECTED_JOB.model}`}>
      <FactList
        rows={[
          ['Evidence', 'Organiser’s signed final export (new commitment)'],
          ['Inputs', <span className="num">households = {inputs.x1}, group bookings = {inputs.x2}</span>],
          [
            'Expected under the rules',
            <span className="num">
              {weights.w1} × {inputs.x1} + {weights.w2} × {inputs.x2} = {canonicalScore(CASE04_CORRECTED_JOB)} (computed
              locally for illustration)
            </span>,
          ],
          ['Status', <StatusTag>Not yet run: needs its own execution and settlement</StatusTag>],
          ['H-0412', 'Unchanged: 26 under its original specification'],
        ]}
      />
    </EvidenceDoc>
  );
}

export function Case04(props: CaseProps) {
  const stages = CASE04.stages.length;
  return (
    <StagedCase
      {...props}
      content={CASE04}
      evidence={(stage) => (
        <>
          {stage < stages && <JobAndTrace />}
          {stage >= 1 && stage < stages && <EvidenceRecords />}
        </>
      )}
      resolutionExtra={<ProposedJob />}
    />
  );
}
