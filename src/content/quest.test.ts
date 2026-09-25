import { describe, expect, it } from 'vitest';
import { CASES, NOTEBOOK, QUEST } from './quest';
import { SOURCES } from './sources';
import { CERTIFICATE } from './brand';
import { REQUIRED_CHECKS, V1_COMPLETION_GRANTS } from '../domain/curriculum';
import { CASE_IDS } from '../domain/types';
import { correctIndex, validateQuestion } from '../domain/tasks';

const all = CASE_IDS.map((id) => QUEST[id]);
const text = (id: (typeof CASE_IDS)[number]) => JSON.stringify(QUEST[id]);

describe('quest content', () => {
  it('keeps the six route IDs and the new titles', () => {
    expect(CASES.map((c) => [c.id, c.title])).toEqual([
      ['01', 'Can you check the answer?'],
      ['02', 'Are we checking the same task?'],
      ['03', 'Is the result ready?'],
      ['04', 'What if the evidence is wrong?'],
      ['05', 'Instructions or evidence?'],
      ['06', 'Your final investigation'],
    ]);
  });

  it('asks exactly the checks each case requires', () => {
    expect(QUEST['01'].questions).toEqual([]);
    for (const id of CASE_IDS.slice(1)) {
      expect(QUEST[id].questions.map((q) => q.id)).toEqual([...REQUIRED_CHECKS[id]]);
    }
    for (const id of CASE_IDS) {
      V1_COMPLETION_GRANTS[id].forEach((c) => expect(REQUIRED_CHECKS[id]).toContain(c));
    }
  });

  it.each(all.flatMap((c) => c.questions).map((q) => [q.id, q] as const))(
    '%s has one right answer, a hint and its own explanation for every option',
    (_, q) => expect(validateQuestion(q)).toEqual([]),
  );

  it('varies where the right answer sits', () => {
    const positions = all.flatMap((c) => c.questions).map(correctIndex);
    expect(new Set(positions).size).toBeGreaterThanOrEqual(3);
    expect(QUEST['06'].questions.map(correctIndex)).toEqual([1, 2, 0]);
  });

  it('gives every case a short scenario, one task, the three explanations and sources', () => {
    for (const c of all) {
      expect(c.scenario.length).toBeGreaterThanOrEqual(1);
      expect(c.scenario.join(' ').split(/(?<=[.?!”])\s/).length).toBeLessThanOrEqual(4);
      expect(c.task.length).toBeGreaterThan(10);
      expect(c.lesson.why).not.toBe('');
      expect(c.lesson.how).toMatch(/BaranosAI/);
      expect(c.lesson.takeaway.length).toBeLessThan(90);
      expect(c.sources.length).toBeGreaterThan(0);
      for (const r of [...c.sources, ...c.explore.sources]) expect(SOURCES[r.id]).toBeDefined();
    }
  });

  it('cites no unverified section numbers', () => {
    expect(JSON.stringify([QUEST, NOTEBOOK])).not.toMatch(/§/);
    expect(all.flatMap((c) => [...c.sources, ...c.explore.sources]).filter((r) => r.locator)).toEqual([]);
  });

  it('has one notebook note per case', () => {
    expect(NOTEBOOK.map((n) => n.caseId)).toEqual([...CASE_IDS]);
  });
});

describe('factual boundaries', () => {
  it('Case 01 is labelled a toy analogy and ties to disputed-step replay', () => {
    expect(text('01')).toMatch(/toy analogy/i);
    expect(QUEST['01'].lesson.how).toMatch(/replayed onchain/);
  });

  it('Case 02 keeps the fingerprint-is-not-availability distinction', () => {
    expect(QUEST['02'].scenario.join(' ')).toContain('Another reviewer used a different document and got a different answer.');
    expect(QUEST['02'].lesson.how).toMatch(/fingerprint identifies a file, but it doesn’t hand anyone the file/);
  });

  it('Case 03 describes Confirmation (offchain compute, onchain verification and replay) and introduces Replay mode', () => {
    expect(QUEST['03'].lesson.how).toMatch(/Confirmation mode, the AI computation runs offchain/);
    expect(QUEST['03'].lesson.how).toMatch(/replayed onchain/);
    expect(QUEST['03'].lesson.how).toMatch(/none of them is the same as a single Fogo block/);
    expect(QUEST['03'].explore.paragraphs.join(' ')).toMatch(/Replay mode, where execution happens onchain from the start/);
  });

  it('Cases 04–06 say verification does not guarantee true answers or prevent prompt injection', () => {
    expect(QUEST['04'].lesson.takeaway).toBe('Verified execution isn’t verified truth.');
    expect(QUEST['05'].lesson.how).toMatch(/determinism alone doesn’t prevent prompt injection/);
    expect(QUEST['05'].explore.paragraphs.join(' ')).toMatch(/none of them eliminates it/);
    expect(QUEST['06'].questions[2].options.find((o) => o.correct)!.label).toMatch(/not whether the evidence is true/);
  });

  it('never claims guaranteed truth or complete security', () => {
    const everything = JSON.stringify(QUEST).toLowerCase();
    for (const phrase of ['guarantees the truth', 'always true', 'eliminates prompt injection', 'removes every', 'in one block', 'official certificate']) {
      expect(everything).not.toContain(phrase);
    }
  });

  it('names on the certificate only concepts the quest teaches and assesses', () => {
    const taught = CASES.map((c) => c.concept.toLowerCase()).join(' | ');
    expect(taught).toMatch(/reproducible ai computation/);
    expect(taught).toMatch(/replaying a disputed step/);
    expect(taught).toMatch(/settlement/);
    expect(taught).toMatch(/verified truth|deciding when a result may be used/);
    expect(CERTIFICATE.body('X')).toBe(
      'Presented to X in recognition of completing the BaranosAI Educational Quest, demonstrating a foundational understanding of the BaranosAI whitepaper concepts covered in the quest, and applying those concepts through a personal use-case study.',
    );
    expect(CERTIFICATE.footnote).toMatch(/not been reviewed, validated or endorsed by the BaranosAI team/);
  });

  it('keeps reported claims attributed and dated', () => {
    expect(QUEST['03'].explore.paragraphs.join(' ')).toMatch(/On 17 September 2026, Doug Colkitt reported/);
    expect(QUEST['06'].explore.paragraphs.join(' ')).toMatch(/thesis about the future/);
  });
});
