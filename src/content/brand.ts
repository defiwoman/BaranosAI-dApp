export const APP_NAME = 'BaranosAI Educational Quest';
export const APP_SUBTITLE = 'Six cases. Discover how verifiable AI works.';
export const SITE_URL = 'https://baranosaieducationalquest.netlify.app/';
export const ISSUER = 'BaranosAI Educational Quest — Community Learning Initiative';

export const SIMULATION_NOTE =
  'The cases use fictional examples, and Case 01 uses a toy calculation, all running in your browser. They illustrate how BaranosAI works but do not run real BaranosAI jobs or send blockchain transactions.';

export const CERTIFICATE = {
  heading: 'Certificate of Completion',
  program: 'BaranosAI Whitepaper — Core Concepts',
  cases: 'All 6 cases completed',
  /** The whitepaper concepts named here are the ones taught and assessed in the six cases. */
  body: (name: string) =>
    `Presented to ${name} in recognition of completing all six cases of the BaranosAI Educational Quest and demonstrating a foundational understanding of the BaranosAI whitepaper concepts covered in this quest, including reproducible AI computation, verification, settlement and the limits of AI conclusions.`,
  bodyAfterName:
    'in recognition of completing all six cases of the BaranosAI Educational Quest and demonstrating a foundational understanding of the BaranosAI whitepaper concepts covered in this quest, including reproducible AI computation, verification, settlement and the limits of AI conclusions.',
  footnote: 'A community learning reward issued in this browser. Not an official BaranosAI credential, accreditation or onchain record.',
};

export function shareMessage(): string {
  return `I completed the ${APP_NAME}: six short cases on reproducible AI computation, verification, settlement and the limits of AI conclusions. ${SITE_URL}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
