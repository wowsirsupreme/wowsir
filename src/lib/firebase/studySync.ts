/**
 * studySync.ts
 * Seeds pre-set question banks from ALL grade data files into Firestore
 * so they are selectable in the teacher quiz builder and student practice mode.
 *
 * `seedStudyQuestions()` — legacy Grade 7 study questions (backwards-compat)
 * `seedGradeBank(grade?)` — seed one or all grade banks
 * `seedAllGrades()` — convenience: seed every grade at once
 *
 * All seeding is idempotent:
 *  - Questions with `teacherModified: true` are NEVER overwritten.
 *  - All other questions are upserted via setDoc({ merge: true }) using
 *    their stable deterministic ID (e.g. gr7-ch1-numbers-q001).
 */

import { getFirebaseInstances } from './config';
import { STUDY_CHAPTERS, GRADE_CHAPTERS } from '@/data/studyContent';

function getAllStudyQuestions() {
  return Object.values(GRADE_CHAPTERS).flatMap(chs => chs.flatMap(c => c.questions));
}
import {
  gr4Questions,
  gr5Questions,
  gr6Questions,
  gr7Questions,
  gr8Questions,
  gr9csQuestions,
  gr9dtQuestions,
  gr10csQuestions,
  gr11csQuestions,
} from '@/data/grades';
import type { Question } from '@/types/question';

// ── Types ────────────────────────────────────────────────────────────────────

export type SeedResult = { written: number; skipped: number; protected: number };

// ── Helpers ──────────────────────────────────────────────────────────────────

async function upsertQuestions(
  db: import('firebase/firestore').Firestore,
  questions: Omit<Question, 'quizId'>[],
): Promise<SeedResult> {
  const { doc, setDoc, getDoc, collection } = await import('firebase/firestore');

  let written = 0;
  let skipped = 0;
  let protectedCount = 0;

  for (const q of questions) {
    try {
      const ref = doc(collection(db, 'questions'), q.id);

      // Guard: never overwrite a teacher-modified question
      const existing = await getDoc(ref);
      if (existing.exists() && existing.data()?.teacherModified === true) {
        protectedCount++;
        continue;
      }

      await setDoc(
        ref,
        {
          ...q,
          quizId: null,
          source: 'builtin',
          approvalStatus: 'approved',   // builtin questions auto-approved on seed
          createdAt: q.createdAt ?? Date.now(),
        },
        { merge: true },
      );
      written++;
    } catch {
      skipped++;
    }
  }

  return { written, skipped, protected: protectedCount };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Legacy: upsert Grade 7 study questions from studyContent.ts.
 * Kept for backwards compatibility — AdminPanel already calls this.
 */
export async function seedStudyQuestions(): Promise<{ written: number; skipped: number }> {
  const instances = getFirebaseInstances();
  const db = instances?.fs;
  if (!db) throw new Error('Firestore is not initialised. Configure Firebase first.');

  const { doc, setDoc, collection } = await import('firebase/firestore');

  const all = getAllStudyQuestions();
  if (all.length === 0) return { written: 0, skipped: 0 };

  let written = 0;
  let skipped = 0;

  for (const q of all) {
    try {
      const ref = doc(collection(db, 'questions'), q.id);
      await setDoc(ref, { ...q, source: 'builtin', createdAt: q.createdAt ?? Date.now() }, { merge: true });
      written++;
    } catch {
      skipped++;
    }
  }

  return { written, skipped };
}

/**
 * Seed a specific grade's question bank, or all grades if grade is omitted.
 */
export async function seedGradeBank(
  grade?: 4 | 5 | 6 | 7 | 8 | 9 | '9dt' | 10 | 11,
): Promise<SeedResult> {
  const instances = getFirebaseInstances();
  const db = instances?.fs;
  if (!db) throw new Error('Firestore is not initialised. Configure Firebase first.');

  const bankMap: Record<string, Omit<Question, 'quizId'>[]> = {
    '4':   gr4Questions,
    '5':   gr5Questions,
    '6':   gr6Questions,
    '7':   gr7Questions,
    '8':   gr8Questions,
    '9':   gr9csQuestions,
    '9dt': gr9dtQuestions,
    '10':  gr10csQuestions,
    '11':  gr11csQuestions,
  };

  if (grade === undefined) {
    // Seed all grades
    const results = await Promise.all(
      Object.values(bankMap).map(qs => upsertQuestions(db, qs)),
    );
    return results.reduce(
      (acc, r) => ({
        written: acc.written + r.written,
        skipped: acc.skipped + r.skipped,
        protected: acc.protected + r.protected,
      }),
      { written: 0, skipped: 0, protected: 0 },
    );
  }

  const key = String(grade);
  const questions = bankMap[key];
  if (!questions) throw new Error(`No question bank for grade "${grade}"`);

  return upsertQuestions(db, questions);
}

/**
 * Convenience: seed every grade bank at once.
 */
export async function seedAllGrades(): Promise<SeedResult> {
  return seedGradeBank(undefined);
}

// ── Stats helpers (no Firestore needed) ─────────────────────────────────────

/**
 * Returns a count of how many study questions each chapter has.
 * Useful for showing a "X questions loaded" badge in the teacher panel.
 */
export function getStudyChapterStats(): { key: string; title: string; count: number }[] {
  return STUDY_CHAPTERS.map(ch => ({
    key: ch.key,
    title: ch.shortTitle,
    count: ch.questions.length,
  }));
}

/**
 * Total study questions available across all chapters.
 */
export function getTotalStudyQuestionCount(): number {
  return getAllStudyQuestions().length;
}

/**
 * Returns question counts per grade from the local data files.
 */
export function getGradeBankStats(): { grade: string; subject: string; count: number }[] {
  return [
    { grade: '4',   subject: 'Grade 4 Computing',              count: gr4Questions.length },
    { grade: '5',   subject: 'Grade 5 Computing',              count: gr5Questions.length },
    { grade: '6',   subject: 'Grade 6 Computing',              count: gr6Questions.length },
    { grade: '7',   subject: 'Grade 7 Computing',              count: gr7Questions.length },
    { grade: '8',   subject: 'Grade 8 Computing',              count: gr8Questions.length },
    { grade: '9',   subject: 'Grade 9 CS (IGCSE 0478)',        count: gr9csQuestions.length },
    { grade: '9dt', subject: 'Grade 9 DT (IGCSE 0445)',        count: gr9dtQuestions.length },
    { grade: '10',  subject: 'Grade 10 CS (IGCSE 0478 Year 2)',count: gr10csQuestions.length },
    { grade: '11',  subject: 'Grade 11 CS (A-Level 9618)',     count: gr11csQuestions.length },
  ];
}

/**
 * Total questions across all grade banks.
 */
export function getTotalGradeBankCount(): number {
  return (
    gr4Questions.length +
    gr5Questions.length +
    gr6Questions.length +
    gr7Questions.length +
    gr8Questions.length +
    gr9csQuestions.length +
    gr9dtQuestions.length +
    gr10csQuestions.length +
    gr11csQuestions.length
  );
}
