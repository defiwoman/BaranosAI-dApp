import { useState, type ReactNode } from 'react';
import { Link, useRouter } from '../router';
import { useProgress } from '../progressContext';
import { APP_NAME, APP_SUBTITLE, SIMULATION_NOTE } from '../content/brand';
import styles from './AppShell.module.css';

const NAV = [
  { to: '/cases', label: 'Cases' },
  { to: '/notebook', label: 'Notebook' },
  { to: '/summary', label: 'Progress' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { path } = useRouter();
  const { recovered, dismissRecovered } = useProgress();
  const [simOpen, setSimOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link to="/" className={styles.brand} aria-label={`${APP_NAME} home`}>
          <img src="/brand/baranos-logo.png" alt="" className={styles.logo} width={40} height={40} />
          <span className={styles.brandText}>
            <span className={styles.brandTitle}>{APP_NAME}</span>
            <span className={styles.brandSub}>{APP_SUBTITLE}</span>
          </span>
        </Link>
        <nav aria-label="Main" className={styles.nav}>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={styles.navLink}
              aria-current={path === item.to || (item.to === '/cases' && path.startsWith('/case/')) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            className={styles.mode}
            aria-expanded={simOpen}
            aria-controls="sim-note"
            onClick={() => setSimOpen((o) => !o)}
          >
            Learning simulation
          </button>
        </nav>
      </header>
      {simOpen && (
        <p id="sim-note" className={styles.simNote}>
          {SIMULATION_NOTE}
        </p>
      )}

      {recovered && (
        <div className={styles.notice} role="status">
          <p>Saved progress in this browser could not be read, so it was reset. You can start again from the first case.</p>
          <button type="button" className={styles.noticeButton} onClick={dismissRecovered}>
            Dismiss
          </button>
        </div>
      )}

      <main id="main" className={styles.main}>
        {children}
      </main>

      <footer className={styles.footer}>
        <p>
          {APP_NAME} is a community-built learning experience for the Fogo community. Cases use fictional examples and a
          toy calculation; nothing here runs a BaranosAI job or a blockchain transaction. Not an official BaranosAI product,
          and not yet reviewed by the BaranosAI team.
        </p>
        <p>Your name and progress are saved only in this browser.</p>
      </footer>
    </div>
  );
}
