import { useEffect, useRef, useState } from 'react';
import { useProgress } from '../progressContext';
import { summaryFrom } from '../domain/summary';
import { downloadCanvas, renderShareCard } from '../adapters/shareCard';
import { Link } from '../router';
import styles from './SummaryPage.module.css';

export function SummaryPage() {
  const { progress, reset } = useProgress();
  const data = summaryFrom(progress);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [card, setCard] = useState<'idle' | 'ready' | 'failed'>('idle');
  const [confirmReset, setConfirmReset] = useState(false);
  const finished = data.completed === data.total;

  useEffect(() => {
    setCard('idle');
  }, [data.completed]);

  const makeCard = async () => {
    if (!canvas.current) return;
    try {
      await renderShareCard(canvas.current, data);
      setCard('ready');
    } catch {
      setCard('failed');
    }
  };

  return (
    <div className={styles.page}>
      <h1 data-page-heading tabIndex={-1} className={styles.title}>
        {finished ? 'Case summary: all files closed' : 'Case summary'}
      </h1>
      <p className={styles.meta}>
        {data.completed} of {data.total} cases complete · Rank: {data.rank}
      </p>

      {data.completed === 0 ? (
        <p>
          Nothing to summarise yet. <Link to="/case/01">Open the first case</Link>.
        </p>
      ) : (
        <>
          <section className={styles.panel} aria-labelledby="concepts">
            <h2 id="concepts">Concepts explored</h2>
            <ul className={styles.concepts}>
              {data.concepts.map((c) => (
                <li key={c.id}>
                  <span className="num">{c.id}</span> <strong>{c.concept}</strong>
                  <span className={styles.links}>
                    <Link to={`/case/${c.id}`}>Replay “{c.title}”</Link> ·{' '}
                    <Link to={`/notebook#case-${c.id}`}>Review notes</Link>
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.justified}>
              Decisions justified on the first attempt: <strong className="num">{data.justified}</strong> of{' '}
              <span className="num">{data.decisions}</span>. Recorded on each case’s first completion; replays don’t
              change it.
            </p>
            {finished && (
              <p>
                You checked job identity, evidence, execution, settlement and policy, and you named what verification
                cannot tell you. That is how an application should decide whether it may use an AI result.
              </p>
            )}
          </section>

          <section className={styles.panel} aria-labelledby="share">
            <h2 id="share">Share card (optional)</h2>
            <p>
              Generates an image from your progress in this browser. Nothing is uploaded; you choose whether to save or
              share it.
            </p>
            <div className={styles.actions}>
              <button type="button" onClick={makeCard}>
                {card === 'ready' ? 'Regenerate card' : 'Generate card'}
              </button>
              {card === 'ready' && (
                <button type="button" onClick={() => canvas.current && downloadCanvas(canvas.current, 'baranos-lab-progress.png')}>
                  Download PNG
                </button>
              )}
            </div>
            {card === 'failed' && <p role="alert">This browser could not draw the card.</p>}
            <canvas
              ref={canvas}
              className={card === 'ready' ? styles.canvas : styles.hidden}
              role="img"
              aria-label={`Share card: ${data.completed} of ${data.total} case files, rank ${data.rank}. Concepts: ${data.concepts.map((c) => c.concept).join('; ')}.`}
            />
          </section>
        </>
      )}

      <section className={styles.reset} aria-labelledby="reset">
        <h2 id="reset">Start over</h2>
        <p>Clears the progress saved in this browser.</p>
        {confirmReset ? (
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => {
                reset();
                setConfirmReset(false);
              }}
            >
              Yes, clear my progress
            </button>
            <button type="button" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <div className={styles.actions}>
            <button type="button" onClick={() => setConfirmReset(true)}>
              Clear progress…
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
