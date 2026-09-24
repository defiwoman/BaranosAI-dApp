# Baranos Lab: The Verification Files

A community-built learning simulation for the Fogo community. Players review fictional AI jobs for a demonstration app called Harbor and learn how an application can check an agreed computation, challenge incorrect execution and decide when it may use a result.

**What is simulated:** every case uses fictional jobs and a toy arithmetic model computed in the browser. Nothing in this release submits a Baranos job, connects a wallet or sends a blockchain transaction. Guest progress is stored only in the browser's `localStorage`.

## Status

- **Stage A** (first playable case) and **Stage B** (all six cases, notebook with search, review/replay, resumable progress, local share card) are implemented.
- **Not implemented:** wallet connection and testnet completion records (Stage C) and live Baranos jobs (Stage D). Neither is simulated as if it were live.

## Running locally

Tested with **Node 22.22.2** and npm 10.9.7. `.nvmrc` and `netlify.toml` pin the same version; Vite 8 requires Node ≥ 20.19 or ≥ 22.12.

```bash
npm ci          # install from the committed lockfile
npm run dev     # development server at http://localhost:5173
npm test        # unit and component tests (Vitest + Testing Library)
npm run build   # type check (tsc -b) and production build into dist/
npm run preview # serve dist/ locally
```

No environment variables are needed for the simulation.

## Deploying to Netlify

`netlify.toml` at the repository root configures everything; the app lives at the repository root, so leave **Base directory** empty.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | `22.22.2` (set by `NODE_VERSION` in `netlify.toml`, matching `.nvmrc`) |
| Route refreshes | `/* → /index.html 200` redirect in `netlify.toml` |

Steps: in Netlify choose *Add new site → Import an existing project*, connect this GitHub repository, pick the branch, and accept the settings read from `netlify.toml`. Netlify's Vite guide: https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/

Hosting the frontend is separate from any future Fogo program deployment. A hosted preview is not an onchain release.

## Project layout

| Path | Contents |
| --- | --- |
| `src/content/` | Case text, fixtures, notebook entries and the source register (no React) |
| `src/domain/` | Pure functions: toy model, case state machines, progress schema |
| `src/adapters/` | `simulation` execution adapter and browser storage |
| `src/cases/` | One component per case |
| `src/components/`, `src/pages/` | Shared UI and routed pages |
| `public/brand/baranos-logo.png` | The supplied logo, unchanged |

---

# Build kit

Claude Code build kit · Draft 1 · 22 September 2026

A community-built learning adventure for the Fogo community, with explanations suitable for people new to verifiable AI. The owner chose investigative missions within a continuing story, the supplied Baranos logo, and the whitepaper's visual direction. Development will take place in Claude Code in the browser. The owner is in contact with the Baranos team.

This package contains design and implementation instructions. It is not an implemented or deployed dApp.

## Start here

1. Create a GitHub repository named `baranos-lab`. A private repository is a reasonable starting choice while the team reviews the content.
2. Extract this ZIP. Upload the **contents** of the extracted directory into the repository root, preserving `docs/` and `public/`. Do not upload just the ZIP. Commit the files.
3. Open https://claude.ai/code, connect GitHub and select the repository. If a private repository is missing, check the Claude GitHub App's repository access.
4. Paste Prompt 1 from `docs/CLAUDE_PROMPTS.md`. Ask Claude to implement it in a branch and return the working build and validation results.
5. Review the first playable case before using Prompt 2. Continue in order; each later prompt builds on the previous stage.

The official browser workflow is documented at https://code.claude.com/docs/en/web-quickstart. The session works from repository contents, so files on your computer or attachments in this ChatGPT conversation are not automatically available to Claude. The supplied logo is already in this kit at `public/brand/baranos-logo.png`.

## Included

| File | Purpose |
| --- | --- |
| `CLAUDE.md` | Persistent project instructions for Claude |
| `docs/BUILD_SPEC.md` | Product, visual design, architecture and acceptance criteria |
| `docs/CASEBOOK.md` | Six connected missions and the detailed first case |
| `docs/CLAUDE_PROMPTS.md` | Four implementation prompts in order |
| `docs/TEAM_INPUTS.md` | Precise information to request from the Baranos team |
| `docs/SOURCES.md` | Source references, versions and claim boundaries |
| `public/brand/baranos-logo.png` | The supplied, unchanged 400 × 400 logo |

## Intended releases

- **Playable preview:** one case, then the complete six-case adventure; browser-saved progress; explicitly described as a simulation.
- **Fogo testnet learning dApp:** a deployed learning program and independently inspectable completion records. This records our app's assessment of a completed exercise.
- **Live Baranos demonstration:** a separate feature, enabled only after actual integration details and successful transactions are verified.

Hosting the frontend and deploying the Fogo program are separate operations. A hosted preview alone is not the completed onchain release.

Netlify is the suggested frontend host because it fits the owner's existing project workflow. The build specification also works with another suitable static host. Budget, deadline and any sponsored fees remain to be set; the first playable case requires no paid AI API.
