/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Netlify sets CONTEXT during builds (production, deploy-preview, branch-deploy). Only this
  // non-secret label reaches the bundle; no other environment variable is exposed.
  const context = loadEnv(mode, '.', '').CONTEXT || 'local';
  return {
    plugins: [react()],
    define: { __DEPLOY_CONTEXT__: JSON.stringify(context) },
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      css: { modules: { classNameStrategy: 'non-scoped' } },
    },
  };
});
