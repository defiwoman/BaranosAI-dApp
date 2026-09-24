import { AppShell } from './components/AppShell';
import { useRouter } from './router';
import { EntryPage } from './pages/EntryPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { CasePage } from './pages/CasePage';
import { NotebookPage } from './pages/NotebookPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SummaryPage } from './pages/SummaryPage';

function Route() {
  const { path } = useRouter();
  if (path === '/') return <EntryPage />;
  if (path === '/cases') return <DirectoryPage />;
  if (path === '/notebook') return <NotebookPage />;
  if (path === '/summary') return <SummaryPage />;
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
