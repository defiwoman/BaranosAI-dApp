import { useEffect, useRef, useState } from 'react';
import { SUBMISSION_NOTICE, formatDate } from '../content/brand';
import { useProgress } from '../progressContext';
import { canWriteUseCase, completedCases, nextCase } from '../domain/progress';
import { CURRICULUM_VERSION } from '../domain/curriculum';
import {
  ANSWER_FIELDS,
  DRAFT_FIELDS,
  STUDIO_STEPS,
  composeAnswers,
  firstOpenStep,
  validateDraft,
  validateStep,
  type DraftErrors,
  type DraftField,
  type UseCaseAnswers,
  type UseCaseDraft,
} from '../domain/useCase';
import { newSubmissionId, submitUseCase } from '../adapters/submission';
import { Link, useRouter } from '../router';
import { completedLabel } from '../components/QuestProgress';
import { consoleStyles as cs } from '../components/console/SystemParts';
import styles from './UseCasePage.module.css';

const PREVIEW = STUDIO_STEPS.length - 1;

export function UseCasePage() {
  const { progress } = useProgress();
  if (progress.useCase.submission) return <Submitted />;
  if (!canWriteUseCase(progress)) return <CasesFirst />;
  return <Studio />;
}

function Intro() {
  return (
    <header className={styles.intro}>
      <p className={styles.kicker}>PROTOCOL ARCHITECT // DESIGN MODE</p>
      <h1 data-page-heading tabIndex={-1} className={styles.title}>
        Your idea for verifiable AI
      </h1>
      <p className={styles.lead}>You’ve inspected, verified and challenged AI decisions. Now design one.</p>
      <p className={styles.sub}>Describe one useful application for BaranosAI. A few sentences are enough.</p>
    </header>
  );
}

function CasesFirst() {
  const { progress } = useProgress();
  const next = nextCase(progress);
  return (
    <div className={styles.page}>
      <Intro />
      <section className={styles.card}>
        <h2>Solve the six cases first</h2>
        <p>
          <span aria-hidden="true">🔒 </span>Design mode unlocks after Case 06. You have {completedLabel(completedCases(progress).length)} so far.
        </p>
        {next && (
          <Link to={`/case/${next}`} className={styles.primaryLink}>
            Continue quest
          </Link>
        )}
      </section>
    </div>
  );
}

/** Four short design steps, then a preview rendered as a system card, then submit. */
function Studio() {
  const { progress, saveDraft, setSubmissionId, recordSubmission } = useProgress();
  const { navigate } = useRouter();
  const draft = progress.useCase.draft;
  const profile = progress.profile!;
  // Resume at the first unfinished step; completed drafts open on the preview.
  const [step, setStep] = useState(() => firstOpenStep(draft));
  const [firstStep] = useState(step);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const prevStep = useRef(step);

  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    stepHeading.current?.focus();
  }, [step]);

  const update = (id: DraftField, value: string) => {
    saveDraft({ ...draft, [id]: value });
    if (errors[id]) setErrors({ ...errors, [id]: undefined });
  };

  const focusFirst = (errs: DraftErrors) => {
    const first = DRAFT_FIELDS.find((f) => errs[f.id]);
    if (first) requestAnimationFrame(() => document.getElementById(`uc-${first.id}`)?.focus());
  };

  const goTo = (i: number) => {
    setErrors({});
    setSubmitError(null);
    setStep(i);
  };

  const next = () => {
    const errs = validateStep(step, draft);
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirst(errs);
    goTo(step + 1);
  };

  const submit = async () => {
    if (inFlight.current) return; // No duplicate submissions while a request is running.
    const errs = validateDraft(draft);
    if (Object.keys(errs).length) {
      const at = firstOpenStep(draft);
      goTo(at);
      setErrors(validateStep(at, draft));
      focusFirst(errs);
      return;
    }
    const id = progress.useCase.submissionId ?? newSubmissionId();
    setSubmissionId(id);
    inFlight.current = true;
    setBusy(true);
    setSubmitError(null);
    const answers = composeAnswers(draft);
    const submittedAt = new Date().toISOString();
    const result = await submitUseCase({
      submissionId: id,
      displayName: profile.name,
      xHandle: profile.xHandle,
      answers,
      curriculumVersion: CURRICULUM_VERSION,
      submittedAt,
    });
    inFlight.current = false;
    setBusy(false);
    if (result.ok) {
      recordSubmission({ id, submittedAt, curriculumVersion: CURRICULUM_VERSION, answers });
      navigate('/certificate');
    } else {
      setSubmitError(result.error);
    }
  };

  const current = STUDIO_STEPS[step];
  const migrated = progress.useCase.legacyDraft || progress.useCase.threeFieldDraft;

  return (
    <div className={styles.page}>
      <Intro />

      <ol className={styles.steps} aria-label="Design steps">
        {STUDIO_STEPS.map((s, i) => {
          const spec = DRAFT_FIELDS.find((f) => f.id === s.fields[s.fields.length - 1]);
          const label = s.id === 'preview' ? 'Preview' : spec!.label;
          return (
            <li key={s.id} className={i === step ? styles.stepNow : i < step ? styles.stepDone : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="mono">{s.id === 'preview' ? '05' : spec!.step}</span> {label}
            </li>
          );
        })}
      </ol>

      <section className={styles.card} aria-labelledby="step-heading">
        {migrated && step === firstStep && (
          <p className={styles.migrated}>Your earlier answers have been placed into these steps, so nothing is lost. Edit them however you like.</p>
        )}

        {current.id !== 'preview' ? (
          <>
            <h2 id="step-heading" ref={stepHeading} tabIndex={-1} className={styles.stepHeading}>
              <span className={styles.stepCount}>
                {DRAFT_FIELDS.find((f) => f.id === current.fields[current.fields.length - 1])!.step} // STEP {step + 1} OF {STUDIO_STEPS.length}
              </span>
              {DRAFT_FIELDS.find((f) => f.id === current.fields[current.fields.length - 1])!.label}
            </h2>
            {current.fields.map((id) => (
              <Field key={id} id={id} value={draft[id]} error={errors[id]} onChange={(v) => update(id, v)} />
            ))}
            <div className={styles.nav}>
              {step > 0 && (
                <button type="button" className={styles.secondary} onClick={() => goTo(step - 1)}>
                  Back
                </button>
              )}
              <button type="button" className={styles.primary} onClick={next}>
                {step === PREVIEW - 1 ? 'Preview system' : 'Continue'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="step-heading" ref={stepHeading} tabIndex={-1} className={styles.stepHeading}>
              <span className={styles.stepCount}>05 // PREVIEW</span>
              Your verifiable AI system
            </h2>
            <SystemCard draft={draft} onEdit={goTo} />
            <p className={styles.who}>
              Submitting as <strong>{profile.name}</strong>
              {profile.xHandle ? <> (@{profile.xHandle})</> : null}, from your certificate details.
            </p>
            <p className={styles.notice}>{SUBMISSION_NOTICE}</p>
            <div aria-live="assertive">
              {submitError && (
                <p role="alert" className={styles.submitError}>
                  {submitError}
                </p>
              )}
            </div>
            <div className={styles.nav}>
              <button type="button" className={styles.secondary} onClick={() => goTo(step - 1)} disabled={busy}>
                Back
              </button>
              <button type="button" className={styles.primary} onClick={submit} disabled={busy} aria-busy={busy}>
                {busy ? 'Submitting…' : 'Submit use case'}
              </button>
            </div>
          </>
        )}
        <p className={styles.saved}>
          Draft saved in this browser as you type. <Link to="/cases">Back to cases</Link>
        </p>
      </section>
    </div>
  );
}

function Field({ id, value, error, onChange }: { id: DraftField; value: string; error?: string; onChange: (v: string) => void }) {
  const spec = DRAFT_FIELDS.find((f) => f.id === id)!;
  const props = {
    id: `uc-${id}`,
    value,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': `uc-${id}-help${error ? ` uc-${id}-error` : ''}`,
    required: true,
  } as const;
  return (
    <div className={styles.field}>
      <label htmlFor={`uc-${id}`}>{spec.label}</label>
      <p id={`uc-${id}-help`} className={styles.help}>
        {spec.help} <span className={styles.example}>{spec.example}</span>
      </p>
      {spec.multiline ? (
        <textarea {...props} rows={4} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...props} type="text" onChange={(e) => onChange(e.target.value)} />
      )}
      {error && (
        <p id={`uc-${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

/** The design rendered as a system object: what's committed, what the AI decides, what remains a risk. */
function SystemCard({ draft, onEdit }: { draft: UseCaseDraft; onEdit: (step: number) => void }) {
  const rows: [string, DraftField, number, 'ok' | 'warn' | 'info'][] = [
    ['WHO NEEDS IT', 'who', 0, 'info'],
    ['AI DECIDES', 'decides', 1, 'info'],
    ['COMMITTED & VERIFIABLE', 'verifiable', 2, 'ok'],
    ['STILL AT RISK', 'risks', 3, 'warn'],
  ];
  return (
    <div className={styles.system}>
      <div className={styles.systemHead}>
        <span className={cs.label}>SYSTEM</span>
        <strong className={styles.systemName}>{draft.title.trim() || 'Untitled system'}</strong>
        <button type="button" className={styles.edit} onClick={() => onEdit(0)}>
          Edit<span className="visually-hidden">: name</span>
        </button>
      </div>
      <dl className={styles.systemRows}>
        {rows.map(([label, id, step, tone]) => (
          <div key={id} className={styles.systemRow}>
            <dt className={cs[`tone_${tone}`]}>
              {tone === 'ok' ? '✓ ' : tone === 'warn' ? '⚠ ' : '› '}
              {label}
            </dt>
            <dd>{draft[id]}</dd>
            <button type="button" className={styles.edit} onClick={() => onEdit(step)}>
              Edit<span className="visually-hidden">: {DRAFT_FIELDS.find((f) => f.id === id)!.label}</span>
            </button>
          </div>
        ))}
      </dl>
      <p className={styles.systemFoot}>
        <span className={cs.label}>STATUS</span> READY TO SUBMIT
      </p>
    </div>
  );
}

function Answers({ answers }: { answers: UseCaseAnswers }) {
  return (
    <dl className={styles.answers}>
      {ANSWER_FIELDS.filter((f) => f.id !== 'title').map((f) => (
        <div key={f.id} className={styles.answer}>
          <dt>{f.label}</dt>
          <dd>{answers[f.id]}</dd>
        </div>
      ))}
    </dl>
  );
}

function Submitted() {
  const { progress } = useProgress();
  const submission = progress.useCase.submission!;
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.kicker}>PROTOCOL ARCHITECT // SUBMITTED</p>
        <h1 data-page-heading tabIndex={-1} className={styles.title}>
          Your submitted case study
        </h1>
        <p className={styles.lead}>
          Received by the quest organiser on {formatDate(submission.submittedAt)}. This is the copy saved in your browser.
        </p>
      </header>
      <section className={styles.card}>
        <h2 className={styles.submittedTitle}>{submission.answers.title}</h2>
        <Answers answers={submission.answers} />
      </section>
      <Link to="/certificate" className={styles.primaryLink}>
        View my certificate
      </Link>
    </div>
  );
}
