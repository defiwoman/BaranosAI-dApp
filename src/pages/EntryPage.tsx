import { useState } from 'react';
import { APP_NAME, APP_SUBTITLE } from '../content/brand';
import { CASES, STORY_PREMISE } from '../content/quest';
import { useProgress } from '../progressContext';
import { completedCases, isCompleted, nextCase } from '../domain/progress';
import { Link, useRouter } from '../router';
import { ProfileForm } from '../components/ProfileForm';
import { completedLabel } from '../components/QuestProgress';
import styles from './EntryPage.module.css';

/**
 * Welcome screen. New participants enter a certificate name before their first case;
 * returning participants continue. When shown in place of a gated route (`redirectTo`),
 * the participant lands on that route after saving.
 */
export function EntryPage({ redirectTo }: { redirectTo?: string }) {
  const { progress, saveProfile } = useProgress();
  const { navigate } = useRouter();
  const [editing, setEditing] = useState(false);
  const done = completedCases(progress);
  const next = nextCase(progress);
  const continueTo = next ? `/case/${next}` : '/certificate';
  const hasProgress = progress.passedChecks.length > 0;
  const profile = progress.profile;

  return (
    <div className={styles.entry}>
      <section className={styles.hero}>
        <img src="/brand/baranos-logo.png" alt="BaranosAI logo" className={styles.logo} width={400} height={400} />
        <div className={styles.heroText}>
          <p className={styles.kicker}>Learning simulation</p>
          <h1 data-page-heading tabIndex={-1} className={styles.title}>
            {APP_NAME}
          </h1>
          <p className={styles.subtitle}>{APP_SUBTITLE}</p>
          <p className={styles.premise}>{STORY_PREMISE}</p>
        </div>
      </section>

      {!profile ? (
        <section className={styles.card} aria-labelledby="start-heading">
          <h2 id="start-heading" className={styles.cardTitle}>
            {hasProgress ? 'Welcome back to your quest.' : 'Your quest starts here.'}
          </h2>
          <p>
            {hasProgress
              ? `Your earlier progress is saved (${completedLabel(done.length)}). Add the name for your certificate and pick up where you left off.`
              : 'Follow the clues, solve six short cases, and discover why verifiable AI matters. Complete the quest to earn your personalised certificate.'}
          </p>
          <ProfileForm
            submitLabel={hasProgress ? 'Continue my quest' : 'Start my quest'}
            onSave={(p) => {
              saveProfile(p);
              navigate(redirectTo ?? continueTo);
            }}
          />
        </section>
      ) : (
        <section className={styles.card} aria-labelledby="welcome-heading">
          <h2 id="welcome-heading" className={styles.cardTitle}>
            Welcome back, <span className={styles.name}>{profile.name}</span>.
          </h2>
          <p>{done.length === CASES.length ? 'You’ve completed every case. Your certificate is ready.' : completedLabel(done.length) + '.'}</p>
          {editing ? (
            <ProfileForm
              initial={profile}
              submitLabel="Save my name"
              onSave={(p) => {
                saveProfile(p);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div className={styles.ctas}>
              <Link to={redirectTo ?? continueTo} className={styles.primary}>
                {next ? 'Continue my quest' : 'See my certificate'}
              </Link>
              <button type="button" className={styles.secondary} onClick={() => setEditing(true)}>
                Edit certificate name
              </button>
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="cases-preview" className={styles.preview}>
        <h2 id="cases-preview">The six cases</h2>
        <ol className={styles.list}>
          {CASES.map((c, i) => (
            <li key={c.id} className={styles.item}>
              <span className={`num ${styles.id}`}>{i + 1}</span>
              <span className={styles.itemTitle}>{c.title}</span>
              <span className={styles.itemStatus}>{isCompleted(progress, c.id) ? '✓ Completed' : c.id === next ? 'Up next' : ''}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
