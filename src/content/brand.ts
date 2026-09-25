export const APP_NAME = 'BaranosAI Educational Quest';
export const APP_SUBTITLE = 'Six cases. Discover how verifiable AI works.';
export const SITE_URL = 'https://baranosaieducationalquest.netlify.app/';
export const ISSUER = 'BaranosAI Educational Quest — Community Learning Initiative';

export const SIMULATION_NOTE =
  'The cases use fictional examples, and Case 01 uses a toy calculation, all running in your browser. They illustrate how BaranosAI works but do not run real BaranosAI jobs or send blockchain transactions.';

export const REQUIREMENTS_NOTE =
  'To earn your certificate, complete all six cases and submit one use case of your own.';

export const FINAL_STEP_NOTE = 'One final step: submit your own use case to earn your certificate.';

export const SUBMISSION_NOTICE =
  'Submitting sends your certificate name, your X handle if you gave one, and your use case to the quest organiser. They’re kept privately by the organiser and never published.';

export type CertificateVariant = 'current' | 'earlier';

export const CERTIFICATE = {
  heading: 'Certificate of Completion',
  program: 'BaranosAI Whitepaper — Core Concepts',
  cases: 'All 6 cases completed',
  useCase: 'Personal use-case study submitted',
  body: (name: string) =>
    `Presented to ${name} in recognition of completing the BaranosAI Educational Quest, demonstrating a foundational understanding of the BaranosAI whitepaper concepts covered in the quest, and applying those concepts through a personal use-case study.`,
  bodyAfterName:
    'in recognition of completing the BaranosAI Educational Quest, demonstrating a foundational understanding of the BaranosAI whitepaper concepts covered in the quest, and applying those concepts through a personal use-case study.',
  /** Wording of certificates earned under curriculum 2 (six cases, before the use-case step). */
  earlierBodyAfterName:
    'in recognition of completing all six cases of the BaranosAI Educational Quest and demonstrating a foundational understanding of the BaranosAI whitepaper concepts covered in this quest, including reproducible AI computation, verification, settlement and the limits of AI conclusions.',
  footnote:
    'A community learning reward. The use case has not been reviewed, validated or endorsed by the BaranosAI team. Not an official credential or onchain record.',
  earlierFootnote: 'A community learning reward issued in this browser. Not an official BaranosAI credential, accreditation or onchain record.',
};

/** Default, editable X post. The participant reviews it; nothing is posted automatically. */
export function sharePost(useCaseTitle: string): string {
  return `I completed the ${APP_NAME} and explored how verifiable AI could help with ${useCaseTitle}.\nSix cases, a use case of my own, and a better understanding of why checking AI computation matters.\nTry the quest: ${SITE_URL}`;
}

export function xComposeUrl(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
