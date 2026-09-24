# Sources and claim boundaries

Prepared 22 September 2026. This is a build specification and original educational game design, not an audit of Baranos.

## Source register

| ID | Primary reference | Used for |
| --- | --- | --- |
| B1 | https://www.baranos.ai/assets/baranos-whitepaper.pdf?v=20260914 | Whitepaper v1.6, 14 pages; reviewed in the preceding research on 21 September |
| B2 | https://www.baranos.ai/ | Public explanation of the two modes and the limits of verification; retrieved again on 22 September |
| B3 | https://www.baranos.ai/blog/introducing-baranos-ai/ | Product introduction reviewed in the preceding research |
| F1 | https://docs.fogo.io/user-guides/building-on-fogo.html | SVM and Anchor development support; checked 22 September |
| F2 | https://docs.fogo.io/user-guides/integrating-fogo-sessions.html | Session integration and permissioned onboarding requirements; checked 22 September |
| C1 | https://code.claude.com/docs/en/web-quickstart | Browser workflow using a GitHub repository and a cloud development environment; checked 22 September |
| B4 | https://www.baranos.ai/resources/ | Official resources index (introduction, explainer, overview, deck, whitepaper); linked from lessons |
| N1 | https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/ | Suggested frontend deployment workflow; checked 22 September |
| R1 | https://x.com/RobertSagurton/status/2102032754401501303 | Robert Sagurton (Fogo co-founder), 21 Sep 2026: enterprise-adoption narrative, presented in the game as a future thesis only |
| R2 | https://x.com/RobertSagurton/status/2102364792631570570 | Robert Sagurton, 22 Sep 2026: follow-up, same boundary as R1 |
| D1 | https://x.com/0xdoug/status/2100453150737961089 | Doug Colkitt, 17 Sep 2026: reported demonstration of an LLM run entirely onchain on Fogo testnet |

### Access during the Stage A/B build (24 September 2026)

The build environment's network policy blocked `www.baranos.ai` and `x.com`, so B2, B3, R1, R2 and D1 could not be opened directly. What the game relies on came from search-engine excerpts of those pages and is marked here so a reviewer can check it:

- **B2 (excerpts):** offchain inference, onchain verification and disputed-step replay on Fogo; in Confirmation mode a Merkle root commits to the weights while the weights remain offchain, and a challenged portion is replayed and adjudicated onchain under the committed rules; each job fixes the model, evidence and execution rules; open-weight models let independent executors reproduce a job; commitments, challenges and replay are used without a zero-knowledge proof for every inference.
- **D1 (excerpt):** "For the first time, an LLM ran entirely on the blockchain. Weights, activations, attention, tokens all loaded and calculated onchain… Every step in the process was a standard SVM transaction." Qwen3.5-4B on Fogo testnet, 30-token prompt, 52-token completion, about 300 seconds per decode token at roughly 30% chain utilisation. Used in Case 03 only as an attributed, dated, conditioned report. It is not a benchmark and not a Baranos job latency. **Verify these figures against the post before public release.**
- **R1/R2:** post text not retrieved. The game states only the owner's characterisation, an enterprise-adoption narrative, and labels it a future thesis. Dates come from the X post IDs.
- **B1/B3:** could not be opened (egress blocked on 24 September, again on the Netlify-readiness pass). The app links the whitepaper as a whole document and cites no section numbers; the casebook's reading map remains a planning aid only. Add section references in `src/content/` only after checking them against the PDF.

The Baranos team has not reviewed the curriculum. The game does not claim that it has.

Some direct Baranos URL requests failed on 22 September; prior retrieved content and the successfully retrieved public homepage provide the current planning basis. A technical team review and real integration test remain necessary before presenting this as an implementation reference.

## Factual basis for the curriculum

Baranos specifies reproducible jobs by binding the model, inputs and execution configuration. Its normal Confirmation path computes offchain and uses an optimistic onchain settlement process with replay for disputed computation. Replay mode starts execution onchain. The result can be consumed by another application. This establishes conformity to a computation; it does not establish the truth of the model's conclusion. The whitepaper also discusses registries, security assumptions, economics, benchmarks and a developer-interface roadmap. [B1, B2, B3]

The game illustrates these ideas through original, simplified scenarios. Its three-step arithmetic trace, UI states, grading, fictional story and proposed learning program are our design choices. They must not be described as the deployed protocol's internal implementation.

## Boundaries to preserve

- “Every normal inference runs fully onchain” is not an accurate description of Confirmation mode.
- A cryptographic commitment alone is not evidence of correct inference or data availability.
- Chain block interval is not end-to-end AI latency or settlement time.
- Comparative speed claims require a defined, reproducible benchmark.
- Live availability, permissionless access, sponsorship and SDK interfaces must be checked rather than inferred from a roadmap.
- The app's completion record is issued by the learning application; it is not a Baranos inference receipt.

The proposed visual tokens were sampled from the user's unchanged logo and the previously rendered whitepaper pages. No official color specification was supplied.

### Quest rewrite (24 September 2026)

`www.baranos.ai` (home, blog, /resources and the whitepaper PDF), `x.com` and the Netlify deployment were again blocked from the build environment. The lessons use only these points, confirmed through search-index excerpts of baranos.ai:

- Each job fixes the model, evidence and execution rules; the model, evidence, runtime and execution policy are committed before the job runs, so independent participants can reproduce the computation and challenge the result.
- BaranosAI uses open-weight models; a Merkle root commits to the weights while the weights remain offchain (Confirmation mode).
- Confirmation mode: inference offchain, onchain verification and replay of disputed steps under the committed rules. Replay mode: execution onchain from the start.
- Settled results become onchain state that applications can read.
- Verification concerns conformity to the computation, not the truth of the conclusion (kit source notes, B2).

**Still to check against the originals before public release:**

1. The Case 03 *Explore further* figures attributed to Doug Colkitt (D1): Qwen3.5-4B, 30-token prompt, 52-token completion, about 300 s per decode token, about 30% utilisation, 17 September 2026.
2. The characterisation of Robert Sagurton's posts (R1, R2) as an enterprise-adoption thesis, and their dates, which were derived from the post IDs.
3. The phrase "Settled results become onchain state that applications can read" (Case 03, Case 06) against baranos.ai.
4. Whether the whitepaper uses the terms *Confirmation mode*, *Replay mode* and *Merkle root* as the lessons do. No whitepaper section numbers are cited anywhere in the app.
