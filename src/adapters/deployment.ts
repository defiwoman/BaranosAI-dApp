import type { Environment } from '../domain/notification';

const LABELS: Record<string, string> = {
  production: 'Production',
  'deploy-preview': 'Deploy preview',
  'branch-deploy': 'Branch deploy',
  dev: 'Local development',
  local: 'Local development',
};

/** Where a submission came from. A deploy-preview hostname wins over the build context. */
export function environmentFor(context: string, host: string): Environment {
  if (/^deploy-preview-\d+--/.test(host)) return { label: 'Deploy preview', host };
  return { label: LABELS[context] ?? `Other (${context})`, host };
}

export function currentEnvironment(): Environment {
  const context = typeof __DEPLOY_CONTEXT__ === 'string' ? __DEPLOY_CONTEXT__ : 'local';
  const host = typeof window !== 'undefined' ? window.location.host : 'unknown';
  return environmentFor(context, host);
}
