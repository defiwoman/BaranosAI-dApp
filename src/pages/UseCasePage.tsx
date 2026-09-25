import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SUBMISSION_NOTICE, formatDate } from '../content/brand';
import { CASES } from '../content/quest';
import { useProgress } from '../progressContext';
import { canWriteUseCase, completedCases, nextCase } from '../domain/progress';
import { CURRICULUM_VERSION } from '../domain/curriculum';
import {
  USE_CASE_FIELDS,
  USE_CASE_STEPS,
  cleanDraft,
  firstInvalidStep,
  validateStep,
  type DraftErrors,
  type UseCaseDraft,
  type UseCaseField,
} from '../domain/useCase';
import { newSubmissionId, submitUseCase } from '../adapters/submission';
import { Link, useRouter } from '../router';
import { completedLabel } from '../components/QuestProgress';
import type { CaseId } from '../domain/types';
import styles from './UseCasePage.module.css';

const PREVIEW = USE_CASE_STEPS.length - 1;

export function UseCasePage() {
  const { progress } = useProgress();
  if (progress.useCase.submission) return <Submitted />;
  if (!canWriteUseCase(progress)) return <CasesFirst />;
  return <UseCaseForm />;
}

function Intro({ children }: { children?: ReactNode }) {
  return (
    <header className={styles.intro}>
      <h1 data-page-heading tabIndex={-1} className={styles.title}>
        Your idea for verifiable AI
      </h1>
      <p className={styles.lead}>
        Think of a problem where people need to check how an AI reached its result. Explain how you would use BaranosAI to help.
      </p>
      {children}
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
          Your use case builds on what the cases teach. You have {completedLabel(completedCases(progress).length)} so far.
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

function UseCaseForm() {
  const { progress, saveDraft, setSubmissionId, recordSubmission } = useProgress();
  const { navigate } = useRouter();
  const draft = progress.useCase.draft;
  const step = progress.useCase.step;
  const [errors, setErrors] = useState<DraftErrors>({});
  const [returnToPreview, setReturnToPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const prevStep = useRef(step);

  // Move focus to the step heading whenever the step changes.
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    stepHeading.current?.focus();
  }, [step]);

  const update = (patch: Partial<UseCaseDraft>) => {
    saveDraft({ ...draft, ...patch }, step);
    const cleared = { ...errors };
    for (const k of Object.keys(patch)) delete cleared[k as keyof DraftErrors];
    setErrors(cleared);
  };

  const goTo = (target: number) => {
    setErrors({});
    setSubmitError(null);
    saveDraft(draft, target);
  };

  const focusFirstError = (errs: DraftErrors) => {
    const first = Object.keys(errs)[0];
    requestAnimationFrame(() => document.getElementById(first === 'concepts' ? 'concept-01' : `uc-${first}`)?.focus());
  };

  const next = () => {
    const errs = validateStep(step, draft);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs);
      return;
    }
    if (returnToPreview) {
      setReturnToPreview(false);
      goTo(PREVIEW);
    } else {
      goTo(step + 1);
    }
  };

  const submit = async () => {
    if (inFlight.current) return; // No double submissions while a request is running.
    const invalid = firstInvalidStep(draft);
    if (invalid !== null) {
      setReturnToPreview(true);
      goTo(invalid);
      const errs = validateStep(invalid, draft);
      setErrors(errs);
      focusFirstError(errs);
      return;
    }
    const profile = progress.profile!;
    const id = progress.useCase.submissionId ?? newSubmissionId();
    setSubmissionId(id);
    inFlight.current = true;
    setBusy(true);
    setSubmitError(null);
    const answers = cleanDraft(draft);
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

  const current = USE_CASE_STEPS[step];

  return (
    <div className={styles.page}>
      <Intro>
        <p className={styles.small}>
          Short answers in your own words are perfect. No essay, code or working app needed.
        </p>
      </Intro>

      <ol className={styles.steps} aria-label="Steps">
        {USE_CASE_STEPS.map((s, i) => (
          <li key={s.id} className={i === step ? styles.stepNow : i < step ? styles.stepDone : ''} aria-current={i === step ? 'step' : undefined}>
            <span className="num">{i + 1}</span> {s.title}
          </li>
        ))}
      </ol>

      <section className={styles.card} aria-labelledby="step-heading">
        <h2 id="step-heading" ref={stepHeading} tabIndex={-1} className={styles.stepHeading}>
          <span className={styles.stepCount}>
            Step {step + 1} of {USE_CASE_STEPS.length}
          </span>
          {current.title}
        </h2>

        {current.fields.map((id) => (
          <Field key={id} id={id} value={draft[id]} error={errors[id]} onChange={(v) => update({ [id]: v })} />
        ))}

        {current.id === 'concepts' && <Concepts value={draft.concepts} error={errors.concepts} onChange={(c) => update({ concepts: c })} />}

        {current.id === 'preview' && <Preview draft={draft} onEdit={(i) => (setReturnToPreview(true), goTo(i))} />}

        {current.id === 'preview' && (
          <>
            <p className={styles.notice}>{SUBMISSION_NOTICE}</p>
            <div aria-live="assertive">
              {submitError && (
                <p role="alert" className={styles.submitError}>
                  {submitError}
                </p>
              )}
            </div>
          </>
        )}

        <div className={styles.nav}>
          {step > 0 && !returnToPreview && (
            <button type="button" className={styles.secondary} onClick={() => goTo(step - 1)} disabled={busy}>
              Back
            </button>
          )}
          {current.id === 'preview' ? (
            <button type="button" className={styles.primary} onClick={submit} disabled={busy} aria-busy={busy}>
              {busy ? 'Submitting…' : 'Submit and unlock my certificate'}
            </button>
          ) : (
            <button type="button" className={styles.primary} onClick={next}>
              {returnToPreview ? 'Save and return to review' : 'Continue'}
            </button>
          )}
        </div>
        <p className={styles.saved}>Your draft is saved in this browser as you type.</p>
      </section>
    </div>
  );
}

function Field({ id, value, error, onChange }: { id: UseCaseField; value: string; error?: string; onChange: (v: string) => void }) {
  const spec = USE_CASE_FIELDS.find((f) => f.id === id)!;
  const describedBy = `uc-${id}-help${error ? ` uc-${id}-error` : ''}`;
  return (
    <div className={styles.field}>
      <label htmlFor={`uc-${id}`}>{spec.label}</label>
      <p id={`uc-${id}-help`} className={styles.help}>
        {spec.help} <span className={styles.example}>{spec.example}</span>
      </p>
      {spec.multiline ? (
        <textarea
          id={`uc-${id}`}
          value={value}
          rows={3}
          maxLength={spec.max + 50}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={`uc-${id}`}
          type="text"
          value={value}
          maxLength={spec.max + 20}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && (
        <p id={`uc-${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

function Concepts({ value, error, onChange }: { value: CaseId[]; error?: string; onChange: (v: CaseId[]) => void }) {
  return (
    <fieldset className={styles.concepts} aria-describedby={error ? 'concepts-error' : undefined}>
      <legend>Which lessons does your idea use? Choose any that apply.</legend>
      <p className={styles.help}>The links reopen each lesson. Your draft stays saved while you look.</p>
      {CASES.map((c, i) => (
        <div key={c.id} className={styles.concept}>
          <label>
            <input
              id={`concept-${c.id}`}
              type="checkbox"
              checked={value.includes(c.id)}
              onChange={(e) => onChange(e.target.checked ? [...value, c.id] : value.filter((x) => x !== c.id))}
            />
            <span>
              <strong>{c.concept}</strong>
              <span className={styles.conceptCase}>
                Case {i + 1}: {c.title}
              </span>
            </span>
          </label>
          <Link to={`/case/${c.id}`} className={styles.lessonLink}>
            Revisit lesson<span className="visually-hidden">: {c.title}</span>
          </Link>
        </div>
      ))}
      {error && (
        <p id="concepts-error" className={styles.error}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

function AnswerList({ draft, onEdit }: { draft: UseCaseDraft; onEdit?: (step: number) => void }) {
  return (
    <dl className={styles.answers}>
      {USE_CASE_FIELDS.map((f) => {
        const stepIndex = USE_CASE_STEPS.findIndex((s) => s.fields.includes(f.id));
        return (
          <div key={f.id} className={styles.answer}>
            <dt>{f.label}</dt>
            <dd>{draft[f.id].trim() || <em>Not answered yet</em>}</dd>
            {onEdit && (
              <button type="button" className={styles.edit} onClick={() => onEdit(stepIndex)}>
                Edit<span className="visually-hidden">: {f.label}</span>
              </button>
            )}
          </div>
        );
      })}
      <div className={styles.answer}>
        <dt>Lessons used</dt>
        <dd>
          {draft.concepts.length === 0 ? (
            <em>None chosen yet</em>
          ) : (
            <ul>
              {CASES.filter((c) => draft.concepts.includes(c.id)).map((c) => (
                <li key={c.id}>{c.concept}</li>
              ))}
            </ul>
          )}
        </dd>
        {onEdit && (
          <button type="button" className={styles.edit} onClick={() => onEdit(USE_CASE_STEPS.findIndex((s) => s.id === 'concepts'))}>
            Edit<span className="visually-hidden">: lessons used</span>
          </button>
        )}
      </div>
    </dl>
  );
}

function Preview({ draft, onEdit }: { draft: UseCaseDraft; onEdit: (step: number) => void }) {
  return (
    <>
      <p>Here’s your use case. Edit anything you like before you submit.</p>
      <AnswerList draft={draft} onEdit={onEdit} />
    </>
  );
}

function Submitted() {
  const { progress } = useProgress();
  const submission = progress.useCase.submission!;
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h1 data-page-heading tabIndex={-1} className={styles.title}>
          Your submitted case study
        </h1>
        <p className={styles.lead}>
          Received by the quest organiser on {formatDate(submission.submittedAt)}. This is the copy saved in your browser.
        </p>
      </header>
      <section className={styles.card}>
        <h2 className={styles.submittedTitle}>{submission.answers.title}</h2>
        <AnswerList draft={submission.answers} />
      </section>
      <Link to="/certificate" className={styles.primaryLink}>
        View my certificate
      </Link>
    </div>
  );
}
