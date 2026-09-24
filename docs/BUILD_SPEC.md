# Build specification

## 1. Product decision

Working title: **Baranos Lab: The Verification Files**.

The player joins a fictional review desk investigating disputed AI jobs for a demonstration application. One connected incident becomes six cases. Each case teaches a useful distinction through an action. Completing the adventure should let a newcomer explain why a computation needs a fixed specification, how a challenge differs from disagreeing with an answer, and what verification cannot establish.

The first case should take about two minutes. The six-case adventure should target roughly 12–18 minutes including short explanations. These are design targets to validate with users, not guarantees.

English is the initial language. The experience supports phones and desktop browsers. Add languages through the content model later if requested.

## 2. Narrative and interaction

- The player is a new investigator. A fictional colleague, Mira, introduces each case in at most two short sentences.
- The demonstration application's result cannot be accepted until the player inspects the relevant evidence.
- The repeating loop is: brief → inspect → decide → replay or reveal → explanation → notebook entry.
- Users earn local progress and descriptive ranks: Observer, Investigator, Challenger. These are game achievements.
- Every wrong choice provides specific feedback and a retry. No forced timer or speed bonus in the first version.
- The last case reuses the earlier knowledge in a different scenario, so passing requires applying an idea rather than remembering a button position.
- Optional replay changes the toy inputs while preserving the learning objective. Deterministic fixtures make failures reproducible.

## 3. Screens

### Entry

Show the logo, title, a single-sentence premise and `Open the first case`. Place `Continue investigation` prominently for returning players. A short footer identifies the project as a community-built learning experience. Wallet connection is not part of the first visit.

### Case directory

Six ordered case entries display title, learning objective and progress. Later cases can be previewed; completing earlier cases unlocks the connected story. Provide `Review concept` access to completed explanations. Use a vertical list on mobile rather than a wide map.

### Investigation desk

Desktop layout: compact dark case navigation, main evidence workspace, and a short finding panel. Mobile order: brief, evidence, decision controls, finding. Use a persistent case title but no fixed overlay that hides content.

Evidence is revealed by selecting labeled tabs or records. Keep the primary decision visible. Put hints next to the task, not behind a chat widget. The user can inspect all necessary information without hover, drag precision or audio.

### Resolution

Show the affected step and its consequence. Distinguish `Challenge upheld` from `Execution matches the job`; neither should be labeled `The AI is true`. Explain the specific choice in two or three sentences. Let users open `How this relates to Baranos` and the source reference.

### Notebook

Unlock concise entries as users play. Organize them under model, evidence, execution rules, commitments, challenges, settlement and limitations. Add a keyword search once there are enough entries to justify it. Each technical claim has a source reference and curriculum version.

### Learning passport (onchain stage)

Show local progress separately from recorded testnet milestones. A milestone can be `Not recorded`, `Awaiting signature`, `Submitted`, `Confirmed` or `Failed`. Only a confirmed transaction produces an explorer link and an onchain completion mark.

## 4. Visual design

Use the whitepaper's dark cover and pale paper pages as two complementary surfaces. The intended look is a quiet investigation desk with editorial typography, readable evidence and restrained animation.

These colors were sampled from the supplied raster logo and the previously rendered whitepaper contact sheet. They are implementation references, not a claim to be an official brand guide.

| Token | Value | Use |
| --- | --- | --- |
| Cover navy | `#060C2C` | Application shell and case directory |
| Logo navy | `#030B30` | Background surrounding the square logo |
| Paper | `#EEF3FB` | Evidence documents and reading panels |
| Logo light | `#E2EBFC` | Text on the dark surface |
| Powder blue | `#BFD3F6` | Quiet accents and selected details |
| Ink | `#182746` | Primary text on paper |
| Secondary ink | `#4C5D79` | Secondary text on paper |
| Success ink | `#17644F` | Valid result, always paired with text/icon |
| Error ink | `#993E45` | Invalid step, always paired with text/icon |

- Use a restrained serif such as Georgia for case titles and a system sans-serif for controls and explanations. Use tabular numerals for the toy trace.
- Retain the logo as supplied, with generous space. Use the full square image; do not crop the mark.
- Controls should look like controls. Keep evidence rows flat and use spacing and fine rules for structure.
- Animate only the selected step, its correction or a change of state. No constantly moving background, flashing green numbers or automatic audio.
- Minimum readable body size 16px in the implemented app. Target WCAG AA contrast and roughly 44px touch targets.
- Honor reduced motion. Never require color perception to solve a case.

## 5. Scope and architecture

### Stage A: first playable case

React + TypeScript + Vite, scoped CSS, local deterministic fixtures and local storage. Include one complete case, a small directory preview and one notebook entry. No network dependency is needed for the lesson.

Suggested structure: `src/content/`, `src/domain/`, `src/components/`, `src/pages/`, `src/adapters/`, `public/brand/`. Content objects should include case ID/version, objective, brief, evidence, decision rules, feedback, notebook entry and source references.

Local game functions are separate from UI rendering. An adapter identifies its mode explicitly: `simulation` or `live`. Stage A implements only the simulation adapter.

### Stage B: complete adventure

Add all cases, durable guest progress, review mode and an optional share image generated locally from the user's actual completed cases. No fabricated leaderboard or user count. First-party learning events may be added without storing evidence text, wallet addresses or other identifying data by default.

### Stage C: Fogo testnet learning dApp

Create our own small SVM/Anchor learning program. It is separate from the Baranos protocol. A backend validates a fresh mission attempt, then authorizes a completion record bound to a wallet, case and curriculum version. The program verifies the configured issuer authorization and required user authorization, and prevents duplicate records for the same milestone/version.

The issuer is our application, so the record attests that our app accepted the exercise. It does not establish a person's identity, prove they learned the material or constitute Baranos-verified inference. A public exercise can be automated; introduce no financial reward system on the strength of these records.

The backend must issue unpredictable attempt IDs, bind attempts to an authenticated wallet session, enforce expiry, grade the actual submitted answers server-side and consume successful claims atomically. Client-submitted scores never authorize a record. Durable storage is necessary for attempts and replay protection; serverless process memory is insufficient.

Use a reviewed wallet integration compatible with the selected Fogo network. Obtain current official configuration, program IDs, explorer URLs and SDK versions. Wallet rejection, insufficient testnet balance, RPC failure, transaction expiry and duplicate submission must each have recoverable UI states. Confirm transaction success from the chain before displaying completion.

Server co-signing, if used, must construct/validate only the exact allowed learning-program instruction and accounts; never sign an arbitrary client-supplied transaction. Keep issuer keys outside the frontend. Define authority rotation and preserve old records by curriculum version.

Fee sponsorship through Fogo Sessions is an optional improvement. Official docs currently require team involvement for domain/paymaster setup and the permitted-program registry. Standard wallet flow can proceed if this onboarding is unavailable. Do not show a gasless claim unless sponsorship is actually configured.

### Stage D: live Baranos demonstration

Enable only after the team supplies an executable integration path. Requirements are in `TEAM_INPUTS.md`. It should submit an actual bounded job, show its real status and result, and link to the relevant transactions. Keep it a separate `Live lab` area. If the API is unavailable, the six educational cases and learning program remain usable.

Do not replace Baranos with a generic LLM API and label the result Baranos-verified. Do not invent a live provider from the whitepaper's conceptual objects.

## 6. Deployment

Suggested frontend target: Netlify. Provide a production Vite build, `dist` publish directory, SPA route fallback if using client routing, and documented environment variables. Verify current hosting documentation during implementation. API routes and the selected durable database are configured separately when Stage C is introduced.

A Fogo program deployment needs its own build, network configuration, deployment authority and verification. Store the actual program ID and deployment transaction in a deployment note. A frontend URL is not evidence that the program exists.

The first release uses testnet. Keep testnet status visible when wallet actions are available. Supply `.env.example` with descriptions and placeholders, never credentials. Keep the guest simulation usable when chain configuration is missing.

## 7. Acceptance criteria

Stage A is ready when a new visitor can complete the first investigation without connecting a wallet, the wrong paths teach useful distinctions, and the resolution explains the evidence. Test the case at 390px and 1280px widths, with keyboard navigation and reduced motion. Refresh restores progress; malformed storage resets safely. Production build and type checking pass.

Stage B adds: all six cases work in order; replay does not corrupt completion; a final scenario tests transfer of learning; sources open correctly; explanatory text is accurate and concise. Ask a few community members to explain the mechanism after playing and use their misunderstandings to improve the cases.

Stage C adds: an unauthorized issuer cannot record a completion; altered wallet/case/version/attempt fields fail; expired and reused claims fail; duplicate concurrent claims are idempotent; a user sees success only after confirmation. Test the happy path and wallet/RPC failures on Fogo testnet. Record measured behavior without turning it into a Baranos benchmark.

Stage D adds: a real job can be reproduced from recorded parameters; output and settlement evidence can be inspected; unavailable, pending, disputed and failed states are handled using documented semantics.

## 8. Product decisions left open

Budget, release date, team brand feedback, available integration access and fee sponsorship remain open. They do not block the first playable case. Leaderboards, rewards, public campaigns and a conversational AI tutor are later product decisions, not automatic requirements.
