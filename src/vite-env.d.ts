/// <reference types="vite/client" />

/** Netlify build context (production, deploy-preview, branch-deploy) or "local". Set in vite.config.ts. */
declare const __DEPLOY_CONTEXT__: string;
