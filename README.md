# BaranosAI Educational Quest

*Six cases. Discover how verifiable AI works.*

A community-built learning quest for the Fogo community. With Mira as their guide, participants solve six short investigative cases for a fictional app called Harbor. They finish knowing what BaranosAI does, why it matters, and what verification does not guarantee. Completing all six cases earns a personalised, community-issued certificate.

Live review deployment: https://baranosaieducationalquest.netlify.app/

**What is simulated:** every case uses fictional examples, and Case 01 uses a toy calculation, all computed in the browser. Nothing here submits a BaranosAI job, connects a wallet or sends a blockchain transaction.

## How it works

- **Entry form:** a certificate name (required; any script, up to 60 characters) and an optional X handle. No email, password or wallet. Saving it also sends a registration to the quest organiser in the background (see *Organiser notifications*); the quest never waits for it. The note under the form, repeated in the footer, says so before the participant registers: “Your progress is saved in this browser. When you register or submit a case study, your name, optional X handle and submitted answers are shared privately with the quest organiser.” Returning visits send nothing; a participant who registered before notifications existed is identified by the name and X handle in their case study.
- **Six cases:** each has a short scenario, one task, one challenge with unlimited retries and an optional hint, then *Why this matters*, *How BaranosAI helps* and *Your takeaway*, plus an optional *Explore further* section and source links.
- **Final review (Case 06):** three questions on reproducibility, settlement and the limits of verified results.
- **Your use case (final requirement):** after Case 06, one short page ("Your idea for verifiable AI") with three questions: *Name your idea*, *Who would it help, and what would the AI do?*, *Why does verification matter?*. It reuses the saved certificate name and X handle, autosaves the draft, and applies basic completeness checks (no scoring or approval). Submitting sends it to the quest organiser via Netlify Forms.
- **Certificate:** unlocked only when all six cases are complete **and** a use case has been received. A single rule, `certificateEligibility` in `src/domain/progress.ts`, is used by the progress page, the reward screen and every download. The certificate is drawn once on a canvas and offered as PNG and as a one-page PDF (the same image). Sharing on X is optional, with an editable post. It is a browser-generated learning reward, not a tamper-proof credential.
- **Saved data:** profile, participant ID, unsent registrations, progress, use-case draft and completion date are stored in `localStorage` under the original key `baranos-lab:progress`, schema version 5 (curriculum 3.1). Version 4 saves migrate in place; an existing profile receives its participant ID once, at that moment. Drafts from the earlier five-step form are folded into the three fields without losing text (problem + AI task; verification + agreed rules + limitations, as separate paragraphs), and the original draft is kept as a backup. Older saves migrate in place and keep their completed cases. A certificate earned under curriculum 2 (six cases only) is kept and still downloadable; its owner is asked only for the use case to earn the updated certificate.

## Organiser notifications (Netlify Forms)

Submissions use [Netlify Forms](https://docs.netlify.com/forms/setup/), the service the app already used. There is no custom backend, API key or email provider.

### Which forms send a notification

| Form (Netlify name) | Sent when | Email subject |
| --- | --- | --- |
| **registration** | The entry form is saved: a new participant, a returning participant with earlier progress, or a later *Edit certificate name* / *Correct the name* that changes the name or X handle. An unchanged save sends nothing. | `[BaranosAI Quest] Registration: <name> (<@handle or Not provided>)`, or `… Profile update: …` |
| **use-case** | The final case study is submitted. | `[BaranosAI Quest] Case study: “<idea title>” by <name> (<@handle or Not provided>)` |

On a deploy preview or branch deploy the prefix becomes `[BaranosAI Quest · Deploy preview]` (or `· Branch deploy`). Nothing is sent on keystrokes, draft autosaves, page visits, case answers or reloads.

Every submission carries: `formType`, `displayName`, `xHandle` (`@handle` or `Not provided`), `participantId`, `submissionId`, `submittedAt` (UTC), `environment` and `siteHost`. The use case adds `title`, `whoAndWhat`, `whyVerify` and `curriculumVersion`; the registration adds `registrationType`. `readableSubmission` repeats everything as one plain-text block with readable labels, and the answers appear in full with their line breaks, so a single case-study email is complete without matching it to the registration.

### How it links participants

- A random participant ID (UUID) is created when the entry form is first saved, never derived from the name. Name edits and *Reset progress* keep it. Existing profiles get one when their save migrates to version 5.
- Each registration is a snapshot taken when the button was pressed, so a later name change never rewrites an earlier record.
- The use case sends the current name, X handle and the same participant ID.

### Reliability

- **Stored first:** the app treats a submission as stored only when Netlify answers with that form's own confirmation page (`/registration-received.html` or `/use-case-received.html`, each with a marker). A 404, a generic SPA page or a bare `200` is not trusted.
- **Registrations** go into an outbox in `localStorage` and are removed only after that confirmation. Failures are retried after 15 s, 1 min and 5 min, whenever the browser comes back online, and on the next visit, always with the same submission ID. The quest never waits for them.
- **Use case:** unchanged behaviour. The button is disabled while sending, retries reuse the submission ID, the draft is kept on failure, and the certificate unlocks only after the confirmed store. Email delivery happens after storage, so a slow email never blocks the certificate.
- **Duplicates:** if a response is lost after Netlify stored it, the retry can create a second record with the **same** submission ID. Use that ID to spot duplicates. Two open tabs could also each send the same queued registration.
- The recipient address lives only in Netlify's notification settings, never in the code or the browser.

### Setup in the Netlify dashboard (one time)

1. *Site configuration → Forms → Form detection*: enable it if it is not already on.
2. Deploy this branch (or merge it and let production build). After the deploy, *Forms* should list **registration** and **use-case**. The existing **use-case** form keeps its name and history.
3. *Site configuration → Notifications → Emails and webhooks → Form submission notifications → Add notification → Email notification*. Event: *New form submission*. Email: the organiser's address. Form: **registration**. Save.
4. Repeat step 3 for the **use-case** form (or choose *Any form* once).
5. Submit a test registration and a test case study on the deployed site. Check that both appear under *Forms* and that the emails arrive; check spam the first time.

Notes: submissions Netlify flags as spam are stored under *Spam submissions* and do not trigger emails. Netlify's plans include a monthly submission allowance. Netlify builds its own email from the submitted fields; the `subject` field sets its subject line.

### If submitting shows "Use-case submissions aren’t switched on for this site yet"

Netlify returned 404 or a page without the confirmation marker, meaning it did not register the form for that deploy. Check, in order:

1. Form detection is enabled for the site.
2. The deploy you're testing was built *after* detection was enabled (re-run the deploy or push a commit).
3. *Forms* lists the form as active (a deleted form returns 404 for good; recreate it by redeploying).

Registrations fail the same way silently and stay queued in the participant's browser until the forms are active.

Submissions are visible only to site members in the Netlify dashboard. Nothing is published.

## Status

- The learning quest and certificate are implemented.
- **Not implemented:** wallet connection and testnet completion records (Stage C in `docs/BUILD_SPEC.md`), and live BaranosAI jobs (Stage D). Neither is simulated as if it were live.

## Running locally

Tested with **Node 22.22.2** and npm 10.9.7. `.nvmrc` and `netlify.toml` pin the same version; Vite 8 requires Node ≥ 20.19 or ≥ 22.12.

```bash
npm ci          # install from the committed lockfile
npm run dev     # development server at http://localhost:5173
npm test        # unit and component tests (Vitest + Testing Library)
npm run build   # type check (tsc -b) and production build into dist/
npm run preview # serve dist/ locally
```

No environment variables are needed. During Netlify builds, the non-secret `CONTEXT` value (production, deploy-preview, branch-deploy) is read by `vite.config.ts` to label submissions; locally it is "Local development".

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
| `src/content/` | Lessons (`quest.ts`), branding and certificate wording (`brand.ts`), Case 01 fixtures and the source register (no React) |
| `src/domain/` | Pure functions: toy model, Case 01 state machine, question grading, profile validation, progress schema and migration, certificate eligibility, PDF writer |
| `src/adapters/` | `simulation` execution adapter, browser storage and certificate rendering |
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
