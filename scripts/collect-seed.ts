import { allGradeQuestions } from '@/data/grades/index';
import { writeFileSync, mkdirSync } from 'fs';
import type { Question } from '@/types/question';

const questions = (allGradeQuestions as Question[]).filter(
  (q) => q && q.id && q.text && q.options?.length >= 2
);

const clean = questions.map((q) => ({
  id: q.id,
  quizId: q.quizId ?? null,
  topicKey: q.topicKey,
  type: q.type ?? 'mcq',
  text: q.text,
  options: q.options,
  answer: String(q.answer),
  explanation: q.explanation ?? '',
  difficulty: q.difficulty ?? 'medium',
  points: q.points ?? 1,
  chapter: q.chapter ?? null,
  chapterTitle: (q as { chapterTitle?: string }).chapterTitle ?? '',
  approvalStatus: 'approved' as const,
  source: 'builtin' as const,
  createdAt: 0,
  grade: (q as { grade?: unknown }).grade ?? null,
  subject: (q as { subject?: string }).subject ?? null,
  term: (q as { term?: unknown }).term ?? null,
  week: (q as { week?: unknown }).week ?? null,
  tags: q.tags ?? [],
}));

mkdirSync('public/seed', { recursive: true });
writeFileSync('public/seed/questions.json', JSON.stringify(clean, null, 2));
console.log(`Written ${clean.length} questions to public/seed/questions.json`);

// Print breakdown
const counts: Record<string, number> = {};
for (const q of clean) {
  const k = q.id.match(/^(gr\d+(?:cs|dt)?|grAl)/)?.[1] ?? 'other';
  counts[k] = (counts[k] ?? 0) + 1;
}
for (const [k, v] of Object.entries(counts).sort()) {
  console.log(`  ${k}: ${v}`);
}
