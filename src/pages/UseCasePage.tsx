import { useRef, useState } from 'react';
import { SUBMISSION_NOTICE, formatDate } from '../content/brand';
import { useProgress } from '../progressContext';
import { canWriteUseCase, completedCases, nextCase } from '../domain/progress';
import { CURRICULUM_VERSION } from '../domain/curriculum';
import { USE_CASE_FIELDS, cleanDraft, validateDraft, type DraftErrors, type UseCaseDraft, type UseCaseField } from '../domain/useCase';
import { newSubmissionId, submitUseCase } from '../adapters/submission';
import { Link, useRouter } from '../router';
import { completedLabel } from '../components/QuestProgress';
import styles from './UseCasePage.module.css';

export function UseCasePage() {
  const { progress } = useProgress();
  if (progress.useCase.submission) return <Submitted />;
  if (!canWriteUseCase(progress)) return <CasesFirst />;
  return <UseCaseForm />;
}

function Intro() {
  return (
    <header className={styles.intro}>
      <h1 data-page-heading tabIndex={-1} className={styles.title}>
        Your idea for verifiable AI
      </h1>
      <p className={styles.lead}>Describe one useful application for BaranosAI. A few sentences are enough.</p>
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
        <p>Your use case builds on what the cases teach. You have {completedLabel(completedCases(progress).length)} so far.</p>
        {next && (
          <Link to={`/case/${next}`} className={styles.primaryLink}>
            Continue quest
          </Link>
        )}
      </section>
    </div>
  );
}

/** One short page: three answers, autosaved, one submit button. */
function UseCaseForm() {
  const { progress, saveDraft, setSubmissionId, recordSubmission } = useProgress();
  const { navigate } = useRouter();
  const draft = progress.useCase.draft;
  const profile = progress.profile!;
  const [errors, setErrors] = useState<DraftErrors>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const update = (id: UseCaseField, value: string) => {
    saveDraft({ ...draft, [id]: value });
    if (errors[id]) setErrors({ ...errors, [id]: undefined });
  };

  const submit = async () => {
    if (inFlight.current) return; // No duplicate submissions while a request is running.
    const errs = validateDraft(draft);
    setErrors(errs);
    const firstInvalid = USE_CASE_FIELDS.find((f) => errs[f.id]);
    if (firstInvalid) {
      document.getElementById(`uc-${firstInvalid.id}`)?.focus();
      return;
    }
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

  return (
    <div className={styles.page}>
      <Intro />
      <form
        className={styles.card}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {progress.useCase.legacyDraft && (
          <p className={styles.migrated}>
            We’ve combined your earlier answers into these three boxes, so nothing is lost. Edit them however you like.
          </p>
        )}
        <p className={styles.who}>
          Submitting as <strong>{profile.name}</strong>
          {profile.xHandle ? <> (@{profile.xHandle})</> : null}, from your certificate details.
        </p>

        {USE_CASE_FIELDS.map((spec) => {
          const error = errors[spec.id];
          const describedBy = `uc-${spec.id}-help${error ? ` uc-${spec.id}-error` : ''}`;
          const common = {
            id: `uc-${spec.id}`,
            value: draft[spec.id],
            'aria-invalid': error ? true : undefined,
            'aria-describedby': describedBy,
            required: true,
          } as const;
          return (
            <div key={spec.id} className={styles.field}>
              <label htmlFor={`uc-${spec.id}`}>{spec.label}</label>
              <p id={`uc-${spec.id}-help`} className={styles.help}>
                {spec.help} <span className={styles.example}>{spec.example}</span>
              </p>
              {spec.multiline ? (
                <textarea {...common} rows={spec.id === 'whyVerify' ? 5 : 4} onChange={(e) => update(spec.id, e.target.value)} />
              ) : (
                <input {...common} type="text" onChange={(e) => update(spec.id, e.target.value)} />
              )}
              {error && (
                <p id={`uc-${spec.id}-error`} className={styles.error}>
                  {error}
                </p>
              )}
            </div>
          );
        })}

        <p className={styles.notice}>{SUBMISSION_NOTICE}</p>
        <div aria-live="assertive">
          {submitError && (
            <p role="alert" className={styles.submitError}>
              {submitError}
            </p>
          )}
        </div>
        <div className={styles.nav}>
          <button type="submit" className={styles.primary} disabled={busy} aria-busy={busy}>
            {busy ? 'Submitting…' : 'Submit and unlock my certificate'}
          </button>
        </div>
        <p className={styles.saved}>
          Your draft is saved in this browser as you type. <Link to="/cases">Back to cases</Link>
        </p>
      </form>
    </div>
  );
}

function Answers({ answers }: { answers: UseCaseDraft }) {
  return (
    <dl className={styles.answers}>
      {USE_CASE_FIELDS.map((f) => (
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
