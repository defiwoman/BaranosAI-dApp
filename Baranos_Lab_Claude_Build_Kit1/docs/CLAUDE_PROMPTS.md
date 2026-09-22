# Claude Code prompts

Use these after committing the kit to the selected GitHub repository. Complete one stage before starting the next. The working title can be changed without altering the learning design.

## Prompt 1: implement the first playable case

```text
Read CLAUDE.md, docs/BUILD_SPEC.md, docs/CASEBOOK.md and docs/SOURCES.md. Build Stage A of Baranos Lab: The Verification Files. Implement the application now; do not stop at a plan.

Use React, TypeScript, Vite and scoped CSS. Set up compatible stable dependencies and a lockfile. Use the original public/brand/baranos-logo.png. Match the defined navy shell, pale-blue evidence surfaces and restrained serif case titles.

Build an entry screen, a compact six-case directory preview, the complete Case 01 investigation and its resolution, and a notebook entry. Include the exact toy inputs, trace, wrong-choice feedback, selected-step replay and corrected score from the casebook. The replay must be caused by the player's action. Explain that this is a learning simulation using a toy arithmetic model. Later cases are previews, not fake completed features.

Allow immediate guest play. Store versioned local progress and recover from malformed data. Support keyboard navigation, mobile layout, reduced motion and retry. Keep mission content and pure domain functions separate from components. Do not add wallet dependencies, a chatbot or a paid AI API at this stage.

Verify the correct and incorrect challenge paths, refresh recovery and the production build. Inspect the UI at 390px and 1280px if browser tools are available. Add a Netlify-ready production configuration and setup instructions. Work in a reviewable branch and report what runs, what is simulated, the actual validation commands/results, and any remaining issues.
```

## Prompt 2: implement the full adventure

```text
Continue the existing Baranos Lab implementation. Read the repository instructions and current code before changing it. Complete Stage B using all six cases in docs/CASEBOOK.md.

Make the cases a connected investigation with short Mira briefings, distinct interactions, useful feedback and notebook entries. Keep protocol explanations source-linked and optional technical details expandable. Preserve the difference between changed evidence, unavailable evidence, execution errors and model/evidence limitations.

Implement progression, review and replay. Replayed cases must not duplicate achievements. Add an optional share card using only the user's actual local progress. Keep the first case's visual quality throughout. Do not add fake users, token rewards, generic marketing dashboards or live integration claims.

Verify that a new user can finish the story, resume after refresh, revisit completed material and solve the final transfer scenario. Check sources, keyboard behavior, narrow layouts, content accuracy and the production build. Provide a reviewable branch with screenshots where available and a concise report of what changed.
```

## Prompt 3: implement the Fogo testnet learning dApp

```text
Implement Stage C from docs/BUILD_SPEC.md. This is our learning completion program, separate from the Baranos inference protocol.

First inspect the actual Fogo tooling and wallet documentation, confirm compatible versions and document the chosen network configuration. Build a minimal Anchor program, backend attempt validation and a wallet-aware frontend milestone flow. Keep guest play working.

Implement issuer-authorized, versioned completion records and duplicate protection. The server must grade real submitted answers for a fresh, wallet-bound attempt, enforce expiry and consume claims atomically in durable storage. The contract must validate the configured issuer and the chosen user-authorization scheme. Define its exact instruction/account structure before connecting the UI. Never trust localStorage or a client score as authority.

Protect signing credentials. If co-signing transactions, construct or strictly validate only the permitted program instruction and accounts. Do not sign arbitrary client transactions. Use genuine program IDs and transaction signatures only. Support rejection, RPC failure, expiry, duplicate claims and confirmation tracking. A submitted transaction is not a completed milestone.

Write meaningful authorization/replay-protection tests and run the available local program checks. Prepare the deployable program and exact deployment instructions. When the configured testnet deployment credentials and authorization are available, deploy and verify a real completion transaction. If they are missing, finish the implementation and identify the precise missing configuration without inventing a successful deployment.

Fogo Sessions sponsorship is optional and requires actual onboarding. Keep it disabled until the necessary domain/program/paymaster configuration exists. Report exactly what has been built, tested and deployed.
```

## Prompt 4: connect the live lab and prepare launch

```text
Review docs/TEAM_INPUTS.md and any developer materials the owner has added. Implement Stage D only against the actual Baranos interface supplied by the team. Preserve the existing simulation and Fogo learning program as separate features.

Verify the interface with a minimal real job before building the live screen. Use documented request schemas, network, model commitments, authentication, fees and settlement states. Show the actual job parameters, status, result and transaction references. Handle pending, challenged, failed and unavailable states. Never substitute a generic LLM provider or a mock result for a live Baranos result.

If access is not yet available, complete all independent frontend launch work and document the missing integration inputs. Do not invent an API or silently enable a simulated live mode.

Prepare Netlify deployment using the current official documentation and the repository's actual build. Document frontend environment settings, backend storage, issuer configuration, program ID and hosting/chain deployment steps separately. Check routing, mobile layout, accessibility, progress recovery and chain failure states. Create a release report separating simulated functionality, confirmed testnet functionality and live Baranos functionality. Publish only when the required hosting/deployment authorization and configuration are available; otherwise deliver the verified build and exact next steps.
```
