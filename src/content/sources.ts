import type { Source, SourceId } from './types';

/**
 * Source register. The Baranos website and the X posts could not be opened from the
 * build environment (network egress blocked); see docs/SOURCES.md for what was
 * checked and how. Keep every claim in the game inside these boundaries.
 */
export const SOURCES: Record<SourceId, Source> = {
  B1: {
    id: 'B1',
    title: 'Baranos whitepaper v1.6',
    author: 'Baranos',
    url: 'https://www.baranos.ai/assets/baranos-whitepaper.pdf?v=20260914',
    date: '14 Sep 2026',
    boundary: 'Protocol design reference, linked as a whole document. Section numbers are not cited because they could not be checked against the PDF.',
  },
  B2: {
    id: 'B2',
    title: 'Baranos AI — Verifiable intelligence (website)',
    author: 'Baranos',
    url: 'https://www.baranos.ai/',
    date: 'Retrieved Sep 2026',
    boundary:
      'Public description of Confirmation (offchain inference, onchain verification, disputed-step replay) and Replay modes, and of what verification does not establish.',
  },
  B3: {
    id: 'B3',
    title: 'Introducing Baranos AI',
    author: 'Baranos blog',
    url: 'https://www.baranos.ai/blog/introducing-baranos-ai/',
    date: 'Sep 2026',
    boundary: 'Product introduction. Roadmap statements are plans, not deployed features.',
  },
  R1: {
    id: 'R1',
    title: 'Post on X about Baranos and enterprise adoption',
    author: 'Robert Sagurton (@RobertSagurton)',
    url: 'https://x.com/RobertSagurton/status/2102032754401501303',
    date: '21 Sep 2026',
    boundary: 'A future thesis about enterprise adoption. It is not a description of current usage or customers.',
  },
  R2: {
    id: 'R2',
    title: 'Follow-up post on X',
    author: 'Robert Sagurton (@RobertSagurton)',
    url: 'https://x.com/RobertSagurton/status/2102364792631570570',
    date: '22 Sep 2026',
    boundary: 'A future thesis about enterprise adoption. It is not a description of current usage or customers.',
  },
  D1: {
    id: 'D1',
    title: 'Post on X reporting an LLM run entirely onchain on Fogo testnet',
    author: 'Doug Colkitt (@0xdoug)',
    url: 'https://x.com/0xdoug/status/2100453150737961089',
    date: '17 Sep 2026',
    boundary:
      'A reported research demonstration under stated conditions. It is not a benchmark of Baranos job latency and not a measurement made by this app.',
  },
  F1: {
    id: 'F1',
    title: 'Building on Fogo',
    author: 'Fogo documentation',
    url: 'https://docs.fogo.io/user-guides/building-on-fogo.html',
    date: 'Checked 22 Sep 2026',
    boundary: 'SVM and Anchor development support on Fogo.',
  },
  F2: {
    id: 'F2',
    title: 'Integrating Fogo Sessions',
    author: 'Fogo documentation',
    url: 'https://docs.fogo.io/user-guides/integrating-fogo-sessions.html',
    date: 'Checked 22 Sep 2026',
    boundary: 'Session integration and its onboarding requirements. Not used by this release.',
  },
};
