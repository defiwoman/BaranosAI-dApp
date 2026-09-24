import type { ReactNode } from 'react';
import { Link, useRouter } from '../router';
import { useProgress } from '../progressContext';
import { simulationAdapter } from '../adapters/simulation';
import styles from './AppShell.module.css';

const NAV = [
  { to: '/cases', label: 'Cases' },
  { to: '/notebook', label: 'Notebook' },
  { to: '/summary', label: 'Summary' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { path } = useRouter();
  const { recovered, dismissRecovered } = useProgress();

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link to="/" className={styles.brand} aria-label="Baranos Lab home">
          <img src="/brand/baranos-logo.png" alt="" className={styles.logo} width={40} height={40} />
          <span className={styles.brandText}>
            <span className={styles.brandTitle}>Baranos Lab</span>
            <span className={styles.brandSub}>The Verification Files</span>
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
        </nav>
        <span className={styles.mode} title="Every result in this app is computed locally from fictional fixtures.">
          {simulationAdapter.label}
        </span>
      </header>

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
          A community-built learning simulation for the Fogo community. Cases use fictional jobs and a toy arithmetic
          model; nothing here submits a Baranos job or a blockchain transaction. Not an official Baranos product, and not
          yet reviewed by the Baranos team.
        </p>
        <p>Progress is saved only in this browser.</p>
      </footer>
    </div>
  );
}
