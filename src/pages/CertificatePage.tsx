import { useEffect, useRef, useState } from 'react';
import { APP_NAME, CERTIFICATE, FINAL_STEP_NOTE, ISSUER, formatDate, sharePost, xComposeUrl, type CertificateVariant } from '../content/brand';
import { CASES } from '../content/quest';
import { useProgress } from '../progressContext';
import { certificateEligibility, completedCases, nextCase, type Progress } from '../domain/progress';
import { certificateFilename, certificatePdf, certificatePng, downloadBlob, renderCertificate } from '../adapters/certificate';
import { Link } from '../router';
import { ProfileForm } from '../components/ProfileForm';
import { completedLabel } from '../components/QuestProgress';
import type { CaseId } from '../domain/types';
import styles from './CertificatePage.module.css';

export function CertificatePage() {
  const { progress } = useProgress();
  const eligibility = certificateEligibility(progress);
  if (eligibility.eligible) {
    return <Earned name={eligibility.name} completedAt={eligibility.completedAt} useCaseTitle={eligibility.useCaseTitle} />;
  }
  return <NotYet remaining={eligibility.remaining} />;
}

/** Draws the certificate once per name/date/variant; preview and downloads use the same pixels. */
function useCertificate(name: string, completedAt: string, variant: CertificateVariant) {
  const [preview, setPreview] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setPreview(null);
    renderCertificate({ name, completedAt, variant })
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
  }, [name, completedAt, variant]);
  return { preview, failed, canvas };
}

type Status = { kind: 'idle' } | { kind: 'busy'; what: string } | { kind: 'done'; text: string } | { kind: 'error'; text: string };

/** Downloads re-check a rule against the latest progress before producing a file. */
function useDownloads(name: string, allowed: (p: Progress) => boolean, canvas: React.RefObject<HTMLCanvasElement | null>) {
  const { progress } = useProgress();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const run = async (what: 'PDF' | 'PNG') => {
    if (!allowed(progress) || !canvas.current) {
      setStatus({ kind: 'error', text: 'The certificate is not available.' });
      return;
    }
    setStatus({ kind: 'busy', what });
    try {
      const blob = what === 'PDF' ? await certificatePdf(canvas.current) : await certificatePng(canvas.current);
      downloadBlob(blob, certificateFilename(name, what === 'PDF' ? 'pdf' : 'png'));
      setStatus({ kind: 'done', text: `${what} downloaded.` });
    } catch {
      setStatus({ kind: 'error', text: `Sorry, the ${what} download didn’t work in this browser.` });
    }
  };
  return { status, setStatus, run };
}

function StatusLine({ status }: { status: Status }) {
  return (
    <p aria-live="polite" className={status.kind === 'error' ? styles.error : styles.status}>
      {status.kind === 'busy' ? `Preparing ${status.what}…` : status.kind === 'idle' ? '' : status.text}
    </p>
  );
}

function Preview({ preview, failed, alt }: { preview: string | null; failed: boolean; alt: string }) {
  return (
    <div className={styles.preview}>
      {failed ? (
        <p className={styles.error}>This browser couldn’t draw the certificate. Try another browser to download it.</p>
      ) : preview ? (
        <img src={preview} alt={alt} className={styles.image} />
      ) : (
        <p className={styles.loading}>Preparing your certificate…</p>
      )}
    </div>
  );
}

function NotYet({ remaining }: { remaining: CaseId[] }) {
  const { progress } = useProgress();
  const next = nextCase(progress);
  const started = Object.values(progress.useCase.draft).some((v) => (Array.isArray(v) ? v.length > 0 : v.trim() !== ''));
  return (
    <div className={styles.page}>
      {remaining.length === 0 ? (
        <>
          <h1 data-page-heading tabIndex={-1} className={styles.title}>
            {FINAL_STEP_NOTE}
          </h1>
          <p className={styles.lead}>You’ve solved all six cases. Now it’s your turn to imagine what BaranosAI could make possible.</p>
          <Link to="/use-case" className={styles.primaryLink}>
            {started ? 'Continue my use case' : 'Create my use case'}
          </Link>
        </>
      ) : (
        <>
          <h1 data-page-heading tabIndex={-1} className={styles.title}>
            Your certificate isn’t ready yet
          </h1>
          <p>
            To earn your certificate, complete all six cases and submit one use case of your own. You have{' '}
            {completedLabel(completedCases(progress).length)}; still to go:
          </p>
          <ul className={styles.remaining}>
            {CASES.filter((c) => remaining.includes(c.id)).map((c) => (
              <li key={c.id}>
                Case {Number(c.id)}: {c.title}
              </li>
            ))}
            <li>Your own use case</li>
          </ul>
          {next && (
            <Link to={`/case/${next}`} className={styles.primaryLink}>
              Continue quest
            </Link>
          )}
        </>
      )}
      {progress.earlierCertificate && progress.profile && (
        <EarlierCertificate name={progress.profile.name} completedAt={progress.earlierCertificate.completedAt} />
      )}
    </div>
  );
}

/** A certificate earned before the use-case step existed. It stays available with its original wording and date. */
function EarlierCertificate({ name, completedAt }: { name: string; completedAt: string }) {
  const { preview, failed, canvas } = useCertificate(name, completedAt, 'earlier');
  const { status, run } = useDownloads(name, (p) => p.earlierCertificate !== null, canvas);
  return (
    <section className={styles.earlier} aria-labelledby="earlier-heading">
      <h2 id="earlier-heading">Your earlier certificate</h2>
      <p>
        You earned this on {formatDate(completedAt)}, before the use-case step was added. It’s still yours to download.
        Submitting a use case earns the updated certificate.
      </p>
      <div className={styles.earlierPreview}>
        <Preview preview={preview} failed={failed} alt={`Earlier certificate of completion for ${name}, completed on ${formatDate(completedAt)}.`} />
      </div>
      <div className={styles.controls}>
        <button type="button" disabled={!preview} onClick={() => run('PDF')}>
          Download earlier certificate — PDF
        </button>
        <button type="button" disabled={!preview} onClick={() => run('PNG')}>
          Download earlier certificate — PNG
        </button>
      </div>
      <StatusLine status={status} />
    </section>
  );
}

function Earned({ name, completedAt, useCaseTitle }: { name: string; completedAt: string; useCaseTitle: string }) {
  const { progress, saveProfile } = useProgress();
  const { preview, failed, canvas } = useCertificate(name, completedAt, 'current');
  const { status, setStatus, run } = useDownloads(name, (p) => certificateEligibility(p).eligible, canvas);
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [post, setPost] = useState(() => sharePost(useCaseTitle));
  const [copyState, setCopyState] = useState<string>('');

  const copyPost = async () => {
    try {
      await navigator.clipboard.writeText(post);
      setCopyState('Post copied. Paste it into X whenever you’re ready.');
    } catch {
      setCopyState('Copying isn’t allowed here. Select the text above and copy it yourself.');
    }
  };

  const alt = `Certificate of Completion from ${APP_NAME}, presented to ${name}. ${CERTIFICATE.program}. ${CERTIFICATE.cases}. ${CERTIFICATE.useCase}. Completed on ${formatDate(completedAt)}. Issued by ${ISSUER}.`;

  return (
    <div className={styles.page}>
      <header className={styles.celebrate}>
        <p className={styles.badge} aria-hidden="true">
          ★
        </p>
        <h1 data-page-heading tabIndex={-1} className={styles.title}>
          Quest complete. You’ve earned your certificate.
        </h1>
        <p className={styles.lead}>You explored verifiable AI, solved all six cases, and developed a use case of your own.</p>
      </header>

      <Preview preview={preview} failed={failed} alt={alt} />

      <div className={styles.controls} role="group" aria-label="Certificate actions">
        <button type="button" className={styles.primary} disabled={!preview} onClick={() => run('PDF')}>
          Download certificate — PDF
        </button>
        <button type="button" disabled={!preview} onClick={() => run('PNG')}>
          Download certificate — PNG
        </button>
        <button type="button" aria-expanded={sharing} aria-controls="share-panel" onClick={() => setSharing((s) => !s)}>
          Share achievement on X
        </button>
        <Link to="/use-case" className={styles.link}>
          View my submitted case study
        </Link>
      </div>
      <StatusLine status={status} />

      {sharing && (
        <section id="share-panel" className={styles.share} aria-labelledby="share-heading">
          <h2 id="share-heading">Share on X (optional)</h2>
          <p>Edit the post however you like. Nothing is posted unless you post it yourself.</p>
          <label htmlFor="share-text" className={styles.shareLabel}>
            Your post
          </label>
          <textarea id="share-text" value={post} rows={8} onChange={(e) => setPost(e.target.value)} />
          <p className={styles.tip}>
            <strong>Add your certificate image:</strong> download the certificate PNG above, then attach it to your post on X.
            Opening X doesn’t attach the image for you.
          </p>
          <div className={styles.controls}>
            <button type="button" onClick={copyPost}>
              Copy post
            </button>
            <a href={xComposeUrl(post)} target="_blank" rel="noopener noreferrer" className={styles.link}>
              Open X with this text<span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </div>
          <p aria-live="polite" className={styles.shareStatus}>
            {copyState}
          </p>
        </section>
      )}

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
        This is a community learning reward generated in your browser. It recognises your learning and your completed quest.
        It does not mean your use case has been validated, built or endorsed by the BaranosAI team, and it is not an official
        credential or an onchain record.
      </p>
      <p className={styles.note}>
        <Link to="/cases">Revisit the lessons</Link>
      </p>
    </div>
  );
}
