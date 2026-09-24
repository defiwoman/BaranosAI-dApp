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
| N1 | https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/ | Suggested frontend deployment workflow; checked 22 September |

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
