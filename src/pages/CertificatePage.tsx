import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { APP_NAME, CERTIFICATE, ISSUER, formatDate, shareMessage } from '../content/brand';
import { CASES } from '../content/quest';
import { useProgress } from '../progressContext';
import { certificateEligibility, completedCases, nextCase } from '../domain/progress';
import { certificateFilename, certificatePdf, certificatePng, downloadBlob, renderCertificate } from '../adapters/certificate';
import { Link } from '../router';
import { ProfileForm } from '../components/ProfileForm';
import { completedLabel } from '../components/QuestProgress';
import styles from './CertificatePage.module.css';

export function CertificatePage() {
  const { progress } = useProgress();
  const eligibility = certificateEligibility(progress);
  return eligibility.eligible ? (
    <Earned name={eligibility.name} completedAt={eligibility.completedAt} />
  ) : (
    <NotYet remaining={eligibility.remaining} />
  );
}

function NotYet({ remaining }: { remaining: string[] }) {
  const { progress } = useProgress();
  const next = nextCase(progress);
  return (
    <div className={styles.page}>
      <h1 data-page-heading tabIndex={-1} className={styles.title}>
        Your certificate isn’t ready yet
      </h1>
      <p>
        The certificate unlocks when all six cases are complete. You have {completedLabel(completedCases(progress).length)}; still to go:
      </p>
      <ul className={styles.remaining}>
        {CASES.filter((c) => remaining.includes(c.id)).map((c) => (
          <li key={c.id}>
            Case {Number(c.id)}: {c.title}
          </li>
        ))}
      </ul>
      {next && (
        <Link to={`/case/${next}`} className={styles.primaryLink}>
          Continue quest
        </Link>
      )}
    </div>
  );
}

type Status = { kind: 'idle' } | { kind: 'busy'; what: string } | { kind: 'done'; text: string } | { kind: 'error'; text: string };

function Earned({ name, completedAt }: { name: string; completedAt: string }) {
  const { progress, saveProfile } = useProgress();
  const [preview, setPreview] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [editing, setEditing] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  // Draw once per name/date. The preview, PNG, PDF and print all use the same pixels.
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setPreview(null);
    renderCertificate({ name, completedAt })
      .then(async (c) => {
        if (cancelled) return;
        canvas.current = c;
        url = URL.createObjectURL(await certificatePng(c));
        if (!cancelled) setPreview(url);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [name, completedAt]);

  /** Every action re-checks the shared eligibility rule before producing anything. */
  const guarded = async (what: string, action: (c: HTMLCanvasElement) => Promise<void> | void) => {
    const check = certificateEligibility(progress);
    if (!check.eligible || !canvas.current) {
      setStatus({ kind: 'error', text: 'The certificate is not available.' });
      return;
    }
    setStatus({ kind: 'busy', what });
    try {
      await action(canvas.current);
      setStatus({ kind: 'done', text: `${what} ready.` });
    } catch {
      setStatus({ kind: 'error', text: `Sorry, ${what.toLowerCase()} didn’t work in this browser.` });
    }
  };

  const copy = async () => {
    const text = shareMessage();
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ kind: 'done', text: 'Message copied. Paste it into a post on X whenever you like.' });
    } catch {
      setShowMessage(true);
      setStatus({ kind: 'error', text: 'Copying isn’t allowed here. Select the message below and copy it yourself.' });
    }
  };

  const alt = `Certificate of Completion from ${APP_NAME}, presented to ${name}. ${CERTIFICATE.program}. ${CERTIFICATE.cases}. Completed on ${formatDate(completedAt)}. Issued by ${ISSUER}.`;
  const ready = preview !== null;

  return (
    <div className={styles.page}>
      <header className={styles.celebrate}>
        <p className={styles.badge} aria-hidden="true">
          ★
        </p>
        <h1 data-page-heading tabIndex={-1} className={styles.title}>
          Quest complete. Your certificate is ready.
        </h1>
        <p className={styles.lead}>You followed the evidence, challenged the results, and completed all six cases.</p>
      </header>

      {/* A print-only copy outside the app layout, so printing gives exactly one page with no interface. */}
      {preview && createPortal(<img src={preview} alt="" className="print-only-certificate" />, document.body)}
      <div className={styles.preview}>
        {failed ? (
          <p className={styles.error}>This browser couldn’t draw the certificate. Try another browser to download it.</p>
        ) : preview ? (
          <img src={preview} alt={alt} className={styles.image} />
        ) : (
          <p className={styles.loading}>Preparing your certificate…</p>
        )}
      </div>

      <div className={styles.controls} role="group" aria-label="Certificate actions">
        <button
          type="button"
          className={styles.primary}
          disabled={!ready}
          onClick={() => guarded('PDF', async (c) => downloadBlob(await certificatePdf(c), certificateFilename(name, 'pdf')))}
        >
          Download PDF
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => guarded('PNG', async (c) => downloadBlob(await certificatePng(c), certificateFilename(name, 'png')))}
        >
          Download PNG
        </button>
        <button type="button" disabled={!ready} onClick={() => guarded('Print', () => window.print())}>
          Print
        </button>
        <button type="button" onClick={copy}>
          Copy message for X
        </button>
        <Link to="/cases" className={styles.link}>
          Revisit the lessons
        </Link>
      </div>
      <p aria-live="polite" className={status.kind === 'error' ? styles.error : styles.status}>
        {status.kind === 'busy' ? `Preparing ${status.what}…` : status.kind === 'idle' ? '' : status.text}
      </p>
      {showMessage && (
        <label className={styles.message}>
          Message for X
          <textarea readOnly value={shareMessage()} rows={3} onFocus={(e) => e.currentTarget.select()} />
        </label>
      )}
      <p className={styles.note}>
        Nothing is posted for you. The message is only copied when you choose, and you decide where to share it.
      </p>

      <section className={styles.name} aria-labelledby="name-heading">
        <h2 id="name-heading">Name on the certificate</h2>
        {editing ? (
          <ProfileForm
            initial={progress.profile}
            submitLabel="Update certificate"
            onSave={(p) => {
              saveProfile(p);
              setEditing(false);
              setStatus({ kind: 'done', text: 'Name updated. Your completion date stays the same.' });
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <p>
            <span className={styles.currentName}>{name}</span>{' '}
            <button type="button" className={styles.quiet} onClick={() => setEditing(true)}>
              Correct the name
            </button>
          </p>
        )}
      </section>

      <p className={styles.note}>
        This is a community learning reward generated in your browser. It is not an official BaranosAI credential, an
        accreditation or an onchain record, and it does not certify mastery of the whole whitepaper.
      </p>
    </div>
  );
}
