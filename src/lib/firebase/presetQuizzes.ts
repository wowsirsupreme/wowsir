/**
 * presetQuizzes.ts
 * CRUD helpers for the `presetQuizzes` Firestore collection.
 *
 * A PresetQuiz is a curated quiz template defined by the teacher/admin.
 * It references one or more topicKeys (unlike Quiz which only has one).
 * Students can launch practice sessions from preset quizzes without a
 * teacher creating a live session.
 */

import { getFirebaseInstances } from './config';
import type { Question } from '@/types/question';
import { getGradeBankStats } from './studySync';

// ── Types ────────────────────────────────────────────────────────────────────

export type PresetQuizDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

export interface PresetQuiz {
  id: string;
  title: string;
  description?: string;
  grade: number | string;           // e.g. 4, 7, '9dt', 10
  subject: string;                  // e.g. 'Grade 9 CS (IGCSE 0478)'
  topicKeys: string[];              // one or more topicKey values
  questionCount: number;            // how many questions to draw
  difficulty: PresetQuizDifficulty;
  timeLimitSeconds?: number;        // optional per-question time limit
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  createdBy: string;                // uid or 'system'
  createdAt: number;
  updatedAt?: number;
  isActive: boolean;                // false = hidden from students
}

// ── Firestore collection path ────────────────────────────────────────────────

const COLLECTION = 'presetQuizzes';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getDb() {
  const instances = getFirebaseInstances();
  const db = instances?.fs;
  if (!db) throw new Error('Firestore is not initialised.');
  return db;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Create or overwrite a preset quiz by its id.
 */
export async function savePresetQuiz(quiz: PresetQuiz): Promise<void> {
  const db = await getDb();
  const { doc, setDoc, collection } = await import('firebase/firestore');
  const ref = doc(collection(db, COLLECTION), quiz.id);
  await setDoc(ref, { ...quiz, updatedAt: Date.now() });
}

/**
 * Fetch a single preset quiz by id.
 */
export async function getPresetQuiz(id: string): Promise<PresetQuiz | null> {
  const db = await getDb();
  const { doc, getDoc, collection } = await import('firebase/firestore');
  const snap = await getDoc(doc(collection(db, COLLECTION), id));
  return snap.exists() ? (snap.data() as PresetQuiz) : null;
}

/**
 * List all active preset quizzes, optionally filtered by grade.
 */
export async function listPresetQuizzes(grade?: number | string): Promise<PresetQuiz[]> {
  const db = await getDb();
  const { collection, query, where, getDocs } = await import('firebase/firestore');

  // No orderBy — avoids requiring a composite Firestore index. Sort client-side.
  const constraints = grade !== undefined
    ? [where('isActive', '==', true), where('grade', '==', grade)]
    : [where('isActive', '==', true)];

  const q = query(collection(db, COLLECTION), ...constraints);
  const snap = await getDocs(q);

  const results = snap.docs.map(d => d.data() as PresetQuiz);

  // Sort: by grade (numerically), then by title alphabetically
  results.sort((a, b) => {
    const ga = String(a.grade);
    const gb = String(b.grade);
    if (ga !== gb) return ga.localeCompare(gb, undefined, { numeric: true });
    return a.title.localeCompare(b.title);
  });

  return results;
}

/**
 * Soft-delete: mark a preset quiz inactive.
 */
export async function deactivatePresetQuiz(id: string): Promise<void> {
  const db = await getDb();
  const { doc, updateDoc, collection } = await import('firebase/firestore');
  await updateDoc(doc(collection(db, COLLECTION), id), {
    isActive: false,
    updatedAt: Date.now(),
  });
}

/**
 * Hard-delete a preset quiz.
 */
export async function deletePresetQuiz(id: string): Promise<void> {
  const db = await getDb();
  const { doc, deleteDoc, collection } = await import('firebase/firestore');
  await deleteDoc(doc(collection(db, COLLECTION), id));
}

// ── Question sampling ────────────────────────────────────────────────────────

/**
 * Fetch questions for a preset quiz from the questions collection,
 * respecting topicKeys, difficulty, and count constraints.
 *
 * Returns a shuffled sample of `quiz.questionCount` questions.
 */
export async function fetchQuestionsForPreset(quiz: PresetQuiz): Promise<Question[]> {
  const db = await getDb();
  const { collection, query, where, getDocs } = await import('firebase/firestore');

  if (quiz.topicKeys.length === 0) return [];

  // Firestore `in` supports up to 30 items
  const chunks: string[][] = [];
  for (let i = 0; i < quiz.topicKeys.length; i += 30) {
    chunks.push(quiz.topicKeys.slice(i, i + 30));
  }

  const allQuestions: Question[] = [];
  for (const chunk of chunks) {
    let q = query(
      collection(db, 'questions'),
      where('topicKey', 'in', chunk),
      where('approvalStatus', '==', 'approved'),
    );

    if (quiz.difficulty !== 'mixed') {
      q = query(
        collection(db, 'questions'),
        where('topicKey', 'in', chunk),
        where('approvalStatus', '==', 'approved'),
        where('difficulty', '==', quiz.difficulty),
      );
    }

    const snap = await getDocs(q);
    snap.docs.forEach(d => allQuestions.push({ id: d.id, ...d.data() } as Question));
  }

  // Shuffle and cap to questionCount
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, quiz.questionCount);
}

// ── Initial catalog seed ─────────────────────────────────────────────────────

/**
 * Seed the initial preset quiz catalog into Firestore.
 * Safe to call repeatedly — uses stable IDs so it will upsert, not duplicate.
 */
export async function seedPresetQuizCatalog(): Promise<{ written: number }> {
  const catalog = buildPresetCatalog();
  let written = 0;
  for (const pq of catalog) {
    await savePresetQuiz(pq);
    written++;
  }
  return { written };
}

function buildPresetCatalog(): PresetQuiz[] {
  const now = Date.now();
  const sys = 'system';

  return [
    // ── Grade 4 ──────────────────────────────────────────────────
    {
      id: 'preset-gr4-all',
      title: 'Grade 4 Computing — Full Review',
      description: 'All Grade 4 Computing topics: peripherals, data, internet safety, PowerPoint, and more.',
      grade: 4, subject: 'Grade 4 Computing',
      topicKeys: ['gr4-ch1-peripherals','gr4-ch2-storage','gr4-ch3-internet-safety','gr4-ch4-word','gr4-ch5-excel','gr4-ch6-scratch1','gr4-ch7-scratch2','gr4-ch8-ppt1','gr4-ch9-ppt2'],
      questionCount: 15, difficulty: 'mixed', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    // ── Grade 5 ──────────────────────────────────────────────────
    {
      id: 'preset-gr5-all',
      title: 'Grade 5 Computing — Full Review',
      description: 'All Grade 5 Computing topics including data storage, programming, and Scratch.',
      grade: 5, subject: 'Grade 5 Computing',
      topicKeys: ['gr5-ch1-history','gr5-ch2-storage','gr5-ch3-safety','gr5-ch4-word-adv','gr5-ch5-excel-adv','gr5-ch6-scratch-adv','gr5-ch7-algorithms','gr5-ch8-scratch1','gr5-ch9-scratch2'],
      questionCount: 15, difficulty: 'mixed', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    // ── Grade 6 ──────────────────────────────────────────────────
    {
      id: 'preset-gr6-all',
      title: 'Grade 6 Computing — Full Review',
      description: 'All Grade 6 topics: robotics, mail merge, email, Excel, algorithms, flowcharts, Scratch, QB64.',
      grade: 6, subject: 'Grade 6 Computing',
      topicKeys: ['gr6-ch1-robotics','gr6-ch2-mailmerge','gr6-ch3-email','gr6-ch4-excel1','gr6-ch5-excel2','gr6-ch6-excel3','gr6-ch7-algorithms','gr6-ch8-scratch3','gr6-ch9-qb64'],
      questionCount: 15, difficulty: 'mixed', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    // ── Grade 7 ──────────────────────────────────────────────────
    {
      id: 'preset-gr7-html',
      title: 'Grade 7 — HTML Website Design',
      description: 'Practice HTML basics and next steps: tags, headings, lists, images, hyperlinks.',
      grade: 7, subject: 'Grade 7 Computing',
      topicKeys: ['gr7-ch6-html1','gr7-ch7-html2'],
      questionCount: 10, difficulty: 'mixed', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    {
      id: 'preset-gr7-python',
      title: 'Grade 7 — Python Basics',
      description: 'Introduction to Python: print, variables, strings, and simple programs.',
      grade: 7, subject: 'Grade 7 Computing',
      topicKeys: ['gr7-ch10-python'],
      questionCount: 8, difficulty: 'easy', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    {
      id: 'preset-gr7-all',
      title: 'Grade 7 Computing — Full Review',
      description: 'All Grade 7 topics: number systems, Excel, internet, HTML, AI, QB64, Python.',
      grade: 7, subject: 'Grade 7 Computing',
      topicKeys: ['gr7-ch1-numbers','gr7-ch2-excel-calc','gr7-ch3-excel-data','gr7-ch5-internet','gr7-ch6-html1','gr7-ch7-html2','gr7-ch8-ai','gr7-ch9-qb64','gr7-ch10-python'],
      questionCount: 20, difficulty: 'mixed', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    // ── Grade 8 ──────────────────────────────────────────────────
    {
      id: 'preset-gr8-python',
      title: 'Grade 8 — Python Programming',
      description: 'Selection, loops, functions, lists, and strings in Python.',
      grade: 8, subject: 'Grade 8 Computing',
      topicKeys: ['gr8-ch7-python-sel','gr8-ch8-python-loops','gr8-ch9-python-func','gr8-ch10-python-lists'],
      questionCount: 15, difficulty: 'mixed', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    {
      id: 'preset-gr8-networks',
      title: 'Grade 8 — Networks & Cyber Safety',
      description: 'LANs, routers, HTTP, firewalls, phishing, and password security.',
      grade: 8, subject: 'Grade 8 Computing',
      topicKeys: ['gr8-ch4-networks','gr8-ch2-cybersafety'],
      questionCount: 10, difficulty: 'mixed', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    {
      id: 'preset-gr8-all',
      title: 'Grade 8 Computing — Full Review',
      description: 'All Grade 8 topics: AI, cyber safety, Excel, networks, databases, CSS, Python, PowerPoint.',
      grade: 8, subject: 'Grade 8 Computing',
      topicKeys: ['gr8-ch1-ai','gr8-ch2-cybersafety','gr8-ch3-excel-adv','gr8-ch4-networks','gr8-ch5-database','gr8-ch6-css','gr8-ch7-python-sel','gr8-ch8-python-loops','gr8-ch9-python-func','gr8-ch10-python-lists','gr8-ch11-ppt-adv','gr8-ch12-python-proj'],
      questionCount: 20, difficulty: 'mixed', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    // ── Grade 9 CS ────────────────────────────────────────────────
    {
      id: 'preset-gr9cs-hardware',
      title: 'Grade 9 CS — Computer Hardware',
      description: 'CPU, FDE cycle, primary & secondary memory, I/O devices.',
      grade: 9, subject: 'Grade 9 CS (IGCSE 0478)',
      topicKeys: ['gr9-cpu','gr9-memory','gr9-data-rep','gr9-io-devices'],
      questionCount: 12, difficulty: 'mixed', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    {
      id: 'preset-gr9cs-programming',
      title: 'Grade 9 CS — Programming & Algorithms',
      description: 'Python, algorithms, pseudocode, sorting, searching.',
      grade: 9, subject: 'Grade 9 CS (IGCSE 0478)',
      topicKeys: ['gr9-algorithms','gr9-programming'],
      questionCount: 10, difficulty: 'mixed', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    {
      id: 'preset-gr9cs-all',
      title: 'Grade 9 CS — Full IGCSE Review',
      description: 'Complete Cambridge IGCSE 0478 Year 1 review: hardware, memory, networks, security, algorithms, Python.',
      grade: 9, subject: 'Grade 9 CS (IGCSE 0478)',
      topicKeys: ['gr9-cpu','gr9-memory','gr9-data-rep','gr9-io-devices','gr9-os','gr9-networks','gr9-cybersec','gr9-algorithms','gr9-programming'],
      questionCount: 25, difficulty: 'mixed', timeLimitSeconds: 30, shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    // ── Grade 9 DT ────────────────────────────────────────────────
    {
      id: 'preset-gr9dt-all',
      title: 'Grade 9 DT — Full IGCSE Review',
      description: 'Cambridge IGCSE D&T 0445: design process, materials, mechanisms, manufacturing, evaluation.',
      grade: '9dt', subject: 'Grade 9 DT (IGCSE 0445)',
      topicKeys: ['gr9dt-influences','gr9dt-materials','gr9dt-design-brief','gr9dt-developing','gr9dt-evaluation','gr9dt-manufacturing','gr9dt-health-safety','gr9dt-mechanisms'],
      questionCount: 15, difficulty: 'mixed', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    // ── Grade 10 CS ───────────────────────────────────────────────
    {
      id: 'preset-gr10cs-logic',
      title: 'Grade 10 CS — Boolean Logic & Encryption',
      description: 'Logic gates, Boolean algebra, AND/OR/NOT, encryption basics.',
      grade: 10, subject: 'Grade 10 CS (IGCSE 0478 Year 2)',
      topicKeys: ['gr10-boolean','gr10-encryption'],
      questionCount: 10, difficulty: 'mixed', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    {
      id: 'preset-gr10cs-sql',
      title: 'Grade 10 CS — Databases & SQL',
      description: 'Relational databases, primary/foreign keys, SQL SELECT, INSERT, UPDATE.',
      grade: 10, subject: 'Grade 10 CS (IGCSE 0478 Year 2)',
      topicKeys: ['gr10-sql'],
      questionCount: 8, difficulty: 'mixed', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    {
      id: 'preset-gr10cs-all',
      title: 'Grade 10 CS — Full IGCSE Year 2 Review',
      description: 'Complete Cambridge IGCSE 0478 Year 2: validation, Boolean logic, encryption, algorithms, SQL.',
      grade: 10, subject: 'Grade 10 CS (IGCSE 0478 Year 2)',
      topicKeys: ['gr10-data-integrity','gr10-boolean','gr10-encryption','gr10-system-analysis','gr10-algorithms-adv','gr10-python-adv','gr10-sql'],
      questionCount: 20, difficulty: 'mixed', timeLimitSeconds: 30, shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    // ── Grade 11 CS ───────────────────────────────────────────────
    {
      id: 'preset-gr11cs-oop',
      title: 'Grade 11 CS — Object-Oriented Programming',
      description: 'OOP concepts: encapsulation, inheritance, polymorphism, classes, objects.',
      grade: 11, subject: 'Grade 11 CS (A-Level 9618)',
      topicKeys: ['gr11-oop'],
      questionCount: 10, difficulty: 'hard', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    {
      id: 'preset-gr11cs-data-structures',
      title: 'Grade 11 CS — Data Structures',
      description: 'Stacks, queues, linked lists, trees — AS/A-Level depth.',
      grade: 11, subject: 'Grade 11 CS (A-Level 9618)',
      topicKeys: ['gr11-data-structures'],
      questionCount: 8, difficulty: 'hard', shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
    {
      id: 'preset-gr11cs-all',
      title: 'Grade 11 CS — Full A-Level Review',
      description: 'Complete Cambridge AS/A-Level 9618 review: data representation, networking, logic, OOP, OS, databases.',
      grade: 11, subject: 'Grade 11 CS (A-Level 9618)',
      topicKeys: ['gr11-information','gr11-communication','gr11-hardware','gr11-logic','gr11-oop','gr11-data-structures','gr11-os','gr11-databases'],
      questionCount: 20, difficulty: 'hard', timeLimitSeconds: 45, shuffleQuestions: true, shuffleOptions: true,
      createdBy: sys, createdAt: now, isActive: true,
    },
  ];
}
