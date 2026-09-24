import { useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { useRouter } from './router';
import { useProgress } from './progressContext';
import { APP_NAME } from './content/brand';
import { caseById } from './content/quest';
import { isCaseId } from './domain/types';
import { EntryPage } from './pages/EntryPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { CasePage } from './pages/CasePage';
import { NotebookPage } from './pages/NotebookPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SummaryPage } from './pages/SummaryPage';
import { CertificatePage } from './pages/CertificatePage';

/** Cases and the certificate need a certificate name first. The URL is kept, so the participant lands there afterwards. */
function needsProfile(path: string): boolean {
  return path.startsWith('/case/') || path === '/certificate';
}

function pageTitle(path: string): string {
  const m = /^\/case\/([^/]+)$/.exec(path);
  if (m && isCaseId(m[1])) return `Case ${Number(m[1])}: ${caseById(m[1]).title} · ${APP_NAME}`;
  const titles: Record<string, string> = {
    '/cases': 'Cases',
    '/notebook': 'Notebook',
    '/summary': 'Your progress',
    '/certificate': 'Your certificate',
  };
  return titles[path] ? `${titles[path]} · ${APP_NAME}` : APP_NAME;
}

function Route() {
  const { path } = useRouter();
  const { progress } = useProgress();
  useEffect(() => {
    document.title = pageTitle(path);
  }, [path]);

  if (!progress.profile && needsProfile(path)) return <EntryPage redirectTo={path} />;
  if (path === '/') return <EntryPage />;
  if (path === '/cases') return <DirectoryPage />;
  if (path === '/notebook') return <NotebookPage />;
  if (path === '/summary') return <SummaryPage />;
  if (path === '/certificate') return <CertificatePage />;
  const caseMatch = /^\/case\/([^/]+)$/.exec(path);
  if (caseMatch) return <CasePage id={caseMatch[1]} />;
  return <NotFoundPage />;
}

export function App() {
  return (
    <AppShell>
      <Route />
    </AppShell>
  );
}
