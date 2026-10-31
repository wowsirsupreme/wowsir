/**
 * scripts/build-seed.mjs
 *
 * Compiles all grade question banks from src/data/grades/ into
 * public/seed/questions.json — the file the /admin/seed page fetches.
 *
 * Run:  node scripts/build-seed.mjs
 *
 * Uses a simple regex-based extractor so it works without transpiling TypeScript.
 * It reads the raw .ts source and pulls out each question object literally.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const GRADE_FILES = [
  'gr4', 'gr5', 'gr6', 'gr7', 'gr8',
  'gr9cs', 'gr9dt', 'grAlcs',
];

// We use tsx to evaluate the TS files with the @/ alias resolved.
// Fall back to a JSON extraction approach if tsx is unavailable.

// Actually, the cleanest approach: use tsx to import and serialise.
// But tsx may not be installed. Let's try a different approach:
// parse the TS files with a simple transform (strip types, replace @/ imports).

import { execSync } from 'child_process';

// Check if tsx is available
let hasTsx = false;
try {
  execSync('npx tsx --version', { stdio: 'ignore' });
  hasTsx = true;
} catch (_) {}

if (!hasTsx) {
  console.log('tsx not found — installing temporarily...');
  execSync('npm install -D tsx --legacy-peer-deps', { stdio: 'inherit', cwd: ROOT });
  hasTsx = true;
}

// Write a temporary collector script
const collectorSrc = `
import { allGradeQuestions } from './src/data/grades/index.js';
import { writeFileSync, mkdirSync } from 'fs';

const questions = allGradeQuestions.filter(q => q && q.id && q.text && q.options?.length >= 2);

// Ensure correct shape
const clean = questions.map(q => ({
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
  chapterTitle: q.chapterTitle ?? '',
  approvalStatus: 'approved',
  source: 'builtin',
  createdAt: 0,
  grade: q.grade ?? null,
  subject: q.subject ?? null,
  term: q.term ?? null,
  week: q.week ?? null,
  tags: q.tags ?? [],
}));

mkdirSync('public/seed', { recursive: true });
writeFileSync('public/seed/questions.json', JSON.stringify(clean, null, 2));
console.log('Written ' + clean.length + ' questions to public/seed/questions.json');

// Print breakdown
const counts = {};
for (const q of clean) {
  const k = q.id.match(/^(gr\\d+(?:cs|dt)?|grAl)/)?.[1] ?? 'other';
  counts[k] = (counts[k] ?? 0) + 1;
}
for (const [k, v] of Object.entries(counts).sort()) {
  console.log('  ' + k + ': ' + v);
}
`;

writeFileSync('/tmp/collect-seed.ts', collectorSrc);

try {
  execSync(
    `npx tsx --tsconfig ${ROOT}/tsconfig.json /tmp/collect-seed.ts`,
    { stdio: 'inherit', cwd: ROOT }
  );
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}
