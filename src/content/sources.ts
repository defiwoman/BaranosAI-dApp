import type { Source, SourceId } from './types';

/**
 * Source register. From the build environment, baranos.ai and x.com were blocked by the
 * network policy; claims used in lessons are limited to what docs/SOURCES.md records as
 * confirmed. The whitepaper is linked as a whole document: no section numbers are cited
 * because none could be checked against the PDF.
 */
export const SOURCES: Record<SourceId, Source> = {
  B1: {
    id: 'B1',
    title: 'BaranosAI whitepaper',
    author: 'BaranosAI',
    url: 'https://www.baranos.ai/assets/baranos-whitepaper.pdf?v=20260914',
    date: 'v1.6, Sep 2026',
    boundary: 'Further reading. Linked as a whole document; no section numbers are cited.',
  },
  B2: {
    id: 'B2',
    title: 'BaranosAI website',
    author: 'BaranosAI',
    url: 'https://www.baranos.ai/',
    date: 'Sep 2026',
    boundary:
      'Public description of committed jobs, Confirmation mode (offchain inference, onchain verification and disputed-step replay), Replay mode, settlement and the limits of verification.',
  },
  B3: {
    id: 'B3',
    title: 'Introducing BaranosAI',
    author: 'BaranosAI blog',
    url: 'https://www.baranos.ai/blog/introducing-baranos-ai/',
    date: 'Sep 2026',
    boundary: 'Product introduction. Roadmap statements are plans, not deployed features.',
  },
  B4: {
    id: 'B4',
    title: 'BaranosAI resources',
    author: 'BaranosAI',
    url: 'https://www.baranos.ai/resources/',
    date: 'Sep 2026',
    boundary: 'Index of the official introduction, explainer, overview, deck and whitepaper.',
  },
  R1: {
    id: 'R1',
    title: 'Post on X about enterprise adoption',
    author: 'Robert Sagurton (@RobertSagurton)',
    url: 'https://x.com/RobertSagurton/status/2102032754401501303',
    date: '21 Sep 2026',
    boundary: 'A future thesis about enterprise adoption. Not a description of current usage or customers.',
  },
  R2: {
    id: 'R2',
    title: 'Follow-up post on X',
    author: 'Robert Sagurton (@RobertSagurton)',
    url: 'https://x.com/RobertSagurton/status/2102364792631570570',
    date: '22 Sep 2026',
    boundary: 'A future thesis about enterprise adoption. Not a description of current usage or customers.',
  },
  D1: {
    id: 'D1',
    title: 'Post on X reporting an LLM run entirely onchain on Fogo testnet',
    author: 'Doug Colkitt (@0xdoug)',
    url: 'https://x.com/0xdoug/status/2100453150737961089',
    date: '17 Sep 2026',
    boundary: 'A reported research demonstration under stated conditions. Not a benchmark of BaranosAI job latency.',
  },
  F1: {
    id: 'F1',
    title: 'Building on Fogo',
    author: 'Fogo documentation',
    url: 'https://docs.fogo.io/user-guides/building-on-fogo.html',
    date: 'Checked 22 Sep 2026',
    boundary: 'SVM and Anchor development support on Fogo. Not used by this release.',
  },
  F2: {
    id: 'F2',
    title: 'Integrating Fogo Sessions',
    author: 'Fogo documentation',
    url: 'https://docs.fogo.io/user-guides/integrating-fogo-sessions.html',
    date: 'Checked 22 Sep 2026',
    boundary: 'Session integration and onboarding requirements. Not used by this release.',
  },
};
