import { useCallback, useState } from 'react';
import { caseById, QUEST } from '../content/quest';
import { CASE_IDS, isCaseId, type CaseId } from '../domain/types';
import { isCompleted, isUnlocked, missingChecks, nextCase } from '../domain/progress';
import { useProgress } from '../progressContext';
import { Link } from '../router';
import { MiraBrief } from '../components/MiraBrief';
import { LessonPanel } from '../components/LessonPanel';
import { QuestProgress } from '../components/QuestProgress';
import { SimulationNote } from '../components/SimulationNote';
import { Case01Challenge } from '../cases/Case01';
import { QuestionSequence } from '../cases/QuestionSequence';
import { NotFoundPage } from './NotFoundPage';
import styles from './CasePage.module.css';

export function CasePage({ id }: { id: string }) {
  if (!isCaseId(id)) return <NotFoundPage />;
  return <CaseView key={id} id={id} />;
}

function CaseView({ id }: { id: CaseId }) {
  const { progress, pass } = useProgress();
  const lesson = QUEST[id];
  const summary = caseById(id);
  // Fixed for this visit: was the case already complete when opened?
  const [replay] = useState(() => isCompleted(progress, id));
  const [missing] = useState(() => missingChecks(progress, id));
  const complete = isCompleted(progress, id);
  const onPass = useCallback((check: string) => pass(check), [pass]);

  const index = CASE_IDS.indexOf(id);
  const following = CASE_IDS[index + 1];

  return (
    <div className={styles.page}>
      <QuestProgress progress={progress} current={id} />
      <h1 data-page-heading tabIndex={-1} className={styles.title}>
        {summary.title}
      </h1>
      <SimulationNote />

      {!isUnlocked(progress, id) ? (
        <Locked />
      ) : (
        <>
          <MiraBrief caseLabel={`Case ${id}`} lines={lesson.scenario} />
          <section className={styles.task} aria-labelledby="task-heading">
            <h2 id="task-heading" className={styles.taskHeading}>
              Your task
            </h2>
            <p className={styles.taskText}>{lesson.task}</p>
            {lesson.terms.length > 0 && (
              <dl className={styles.terms} aria-label="New words">
                {lesson.terms.map((t) => (
                  <div key={t.term}>
                    <dt>{t.term}</dt>
                    <dd>{t.meaning}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          {id === '01' ? (
            <Case01Challenge onPass={onPass} missing={missing} replay={replay} />
          ) : (
            <QuestionSequence questions={lesson.questions} onPass={onPass} missing={missing} replay={replay} />
          )}

          {complete && (
            <LessonPanel
              lesson={lesson}
              focusOnMount={!replay}
              actions={
                following ? (
                  <>
                    <Link to={`/case/${following}`}>Next case</Link>
                    <Link to="/cases">All cases</Link>
                  </>
                ) : (
                  <>
                    <Link to="/certificate">See my certificate</Link>
                    <Link to="/cases">All cases</Link>
                  </>
                )
              }
            />
          )}
        </>
      )}
    </div>
  );
}

function Locked() {
  const { progress } = useProgress();
  const next = nextCase(progress);
  return (
    <section className={styles.locked}>
      <h2>This case unlocks later</h2>
      <p>Each case builds on the one before it. Finish the earlier cases first.</p>
      {next && (
        <Link to={`/case/${next}`} className={styles.button}>
          Go to Case {Number(next)}
        </Link>
      )}
    </section>
  );
}
