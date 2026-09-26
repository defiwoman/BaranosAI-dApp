import { useState } from 'react';
import { APP_NAME, APP_SUBTITLE, REQUIREMENTS_NOTE } from '../content/brand';
import { CASES } from '../content/quest';
import { CONSOLE } from '../content/console';
import { useProgress } from '../progressContext';
import { certificateEligibility, completedCases, nextCase } from '../domain/progress';
import { architectAccess, clearanceFor } from '../domain/clearance';
import { Link, useRouter } from '../router';
import { ProfileForm } from '../components/ProfileForm';
import { SystemMap } from '../components/SystemMap';
import { completedLabel } from '../components/QuestProgress';
import { ComputationLine, StatusPill } from '../components/console/SystemParts';
import styles from './EntryPage.module.css';

/**
 * The verification network's front door. New participants request access (certificate name);
 * returning ones see their clearance, the active case and the system map. When shown in place of
 * a gated route (`redirectTo`), the participant lands on that route after saving.
 */
export function EntryPage({ redirectTo }: { redirectTo?: string }) {
  const { progress, saveProfile } = useProgress();
  const { navigate } = useRouter();
  const [editing, setEditing] = useState(false);
  const done = completedCases(progress);
  const next = nextCase(progress);
  const eligible = certificateEligibility(progress).eligible;
  const continueTo = next ? `/case/${next}` : eligible ? '/certificate' : '/use-case';
  const hasProgress = progress.passedChecks.length > 0;
  const profile = progress.profile;
  const clearance = clearanceFor(progress);

  return (
    <div className={styles.entry}>
      <header className={styles.hero}>
        <img src="/brand/baranos-logo.png" alt="BaranosAI logo" className={styles.logo} width={400} height={400} />
        <div className={styles.heroText}>
          <p className={styles.kicker}>BARANOS // VERIFICATION SYSTEM</p>
          <h1 data-page-heading tabIndex={-1} className={styles.title}>
            {APP_NAME}
          </h1>
          <p className={styles.subtitle}>{APP_SUBTITLE}</p>
          <ComputationLine stages={['AI DECISION', 'COMMITMENT', 'REPLAY', 'VERIFIED']} running={false} lit={4} />
        </div>
      </header>

      {profile && (
        <dl className={styles.status} aria-label="System status">
          <div>
            <dt>SYSTEM STATUS</dt>
            <dd>
              <span className={styles.online} aria-hidden="true" /> ONLINE · SIMULATION
            </dd>
          </div>
          <div>
            <dt>YOUR CLEARANCE</dt>
            <dd>{clearance}</dd>
          </div>
          <div>
            <dt>CASES RESOLVED</dt>
            <dd>{String(done.length).padStart(2, '0')} / 06</dd>
          </div>
          <div>
            <dt>{next ? 'ACTIVE CASE' : 'NEXT'}</dt>
            <dd>{next ? next : eligible ? 'CERTIFICATE' : 'DESIGN'}</dd>
          </div>
        </dl>
      )}

      {!profile ? (
        <section className={styles.card} aria-labelledby="start-heading">
          <p className={styles.cardKicker}>{hasProgress ? 'SESSION RESTORED' : 'ACCESS REQUEST'}</p>
          <h2 id="start-heading" className={styles.cardTitle}>
            {hasProgress ? 'Welcome back to your quest.' : 'Your quest starts here.'}
          </h2>
          <p>
            {hasProgress
              ? `Your earlier progress is saved (${completedLabel(done.length)}). Add the name for your certificate and pick up where you left off.`
              : 'Inspect AI decisions, replay their computation and challenge what doesn’t hold up, across six short cases.'}
          </p>
          <p className={styles.requirement}>{REQUIREMENTS_NOTE}</p>
          <ProfileForm
            submitLabel={hasProgress ? 'Continue my quest' : 'Start my quest'}
            onSave={(p) => {
              saveProfile(p);
              navigate(redirectTo ?? continueTo);
            }}
          />
        </section>
      ) : (
        <section className={styles.active} aria-labelledby="active-heading">
          {next ? (
            <>
              <p className={styles.cardKicker}>
                CASE {next} <span aria-hidden="true">//</span> AI DECISION RECEIVED
              </p>
              <h2 id="active-heading" className={styles.cardTitle}>
                {CASES.find((c) => c.id === next)!.title}
              </h2>
              <div className={styles.activeRow}>
                <span className={styles.decision}>{CONSOLE[next].output.decision}</span>
                <StatusPill status="UNVERIFIED" />
              </div>
            </>
          ) : eligible ? (
            <>
              <p className={styles.cardKicker}>PROTOCOL ARCHITECT // CERTIFICATE ISSUED</p>
              <h2 id="active-heading" className={styles.cardTitle}>
                You’ve completed the quest.
              </h2>
            </>
          ) : (
            <>
              <p className={styles.cardKicker}>ARCHITECT ACCESS PENDING</p>
              <h2 id="active-heading" className={styles.cardTitle}>
                {architectAccess(progress) ? 'You’ve inspected, verified and challenged AI decisions. Now design one.' : 'Continue your quest.'}
              </h2>
            </>
          )}
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
                {next ? 'Open case' : eligible ? 'See my certificate' : 'Create my use case'}
              </Link>
              <button type="button" className={styles.secondary} onClick={() => setEditing(true)}>
                Edit certificate name
              </button>
            </div>
          )}
          <p className={styles.operator}>
            OPERATOR: <span className={styles.name}>{profile.name}</span>
          </p>
        </section>
      )}

      <section aria-labelledby="map-heading" className={styles.mapSection}>
        <h2 id="map-heading" className={styles.mapTitle}>
          SYSTEM MAP
        </h2>
        {!profile && <p className={styles.requirementSmall}>{REQUIREMENTS_NOTE}</p>}
        <SystemMap progress={progress} />
      </section>
    </div>
  );
}
