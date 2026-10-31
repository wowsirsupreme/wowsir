/**
 * correct-seed.mjs
 *
 * Phase 2–5 correction pipeline for public/seed/questions.json.
 *
 * Steps:
 *   1. Remove 32 confirmed exact duplicate records.
 *   2. Fix gr8-ch4-q047 repeated "A to Z" option.
 *   3. Apply semantic-preserving answer-position rebalancing (~25% A/B/C/D).
 *   4. Write corrected JSON, CSV, correction log.
 *   5. Print summary statistics.
 *
 * Algorithm notes:
 *   - "Semantic-preserving": the correct option TEXT never changes.
 *     Only the slot (index) it occupies in the option array changes.
 *   - Balancing uses a demand-based greedy assignment:
 *       For each question (sorted deterministically by ID), assign
 *       the correct answer to the slot with the highest remaining
 *       demand. Ties are broken by djb2-hash of the question ID
 *       mod the number of tied slots — pseudo-random but reproducible.
 *   - Distractor relative order is preserved (distractors in their
 *     original left-to-right order fill the non-chosen slots).
 *   - Processing order is stable (sorted by ID) so re-running on
 *     the already-corrected file produces the identical output.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Load ──────────────────────────────────────────────────────────────────────

const seedPath = resolve(ROOT, 'public/seed/questions.json');
const original = JSON.parse(readFileSync(seedPath, 'utf-8'));
console.log(`Loaded ${original.length} questions from seed.`);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** djb2 hash → non-negative integer */
function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return h >>> 0; // unsigned
}

/** Build a corrected options/answer pair by placing the correct option at targetIdx */
function reposition(options, answerIdx, targetIdx) {
  if (answerIdx === targetIdx) {
    return { options: [...options], answer: String(answerIdx) };
  }
  const correct = options[answerIdx];
  const distractors = options.filter((_, i) => i !== answerIdx);
  // Insert correct at targetIdx, fill other slots with distractors in order
  const newOptions = [];
  let dPtr = 0;
  for (let i = 0; i < options.length; i++) {
    if (i === targetIdx) newOptions.push(correct);
    else newOptions.push(distractors[dPtr++]);
  }
  return { options: newOptions, answer: String(targetIdx) };
}

// ── Step 1: Remove exact full duplicates ──────────────────────────────────────

const EXACT_DUPS_TO_DROP = new Set([
  // gr4-ch8-ppt1 second block (q080–q108)
  'gr4-ch8-ppt1-q080','gr4-ch8-ppt1-q081','gr4-ch8-ppt1-q082','gr4-ch8-ppt1-q083',
  'gr4-ch8-ppt1-q084','gr4-ch8-ppt1-q085','gr4-ch8-ppt1-q086','gr4-ch8-ppt1-q087',
  'gr4-ch8-ppt1-q088','gr4-ch8-ppt1-q089','gr4-ch8-ppt1-q090','gr4-ch8-ppt1-q091',
  'gr4-ch8-ppt1-q092','gr4-ch8-ppt1-q093','gr4-ch8-ppt1-q094','gr4-ch8-ppt1-q095',
  'gr4-ch8-ppt1-q096','gr4-ch8-ppt1-q097','gr4-ch8-ppt1-q098','gr4-ch8-ppt1-q099',
  'gr4-ch8-ppt1-q100','gr4-ch8-ppt1-q101','gr4-ch8-ppt1-q102','gr4-ch8-ppt1-q103',
  'gr4-ch8-ppt1-q104','gr4-ch8-ppt1-q105','gr4-ch8-ppt1-q106','gr4-ch8-ppt1-q107',
  'gr4-ch8-ppt1-q108',
  // gr5 history duplicated in gr9cs ch6
  'gr9cs-ch6-q001',
  // alcs advanced algorithms duplicates
  'alcs-adv-algorithms-q002',
  'alcs-adv-algorithms-q014',
]);

const afterDedup = original.filter(q => !EXACT_DUPS_TO_DROP.has(q.id));
const removedCount = original.length - afterDedup.length;
console.log(`Step 1: Removed ${removedCount} exact duplicates → ${afterDedup.length} questions remain.`);

// ── Step 2: Fix gr8-ch4-q047 repeated "A to Z" option ────────────────────────

const changeLog = []; // { id, phase, before, after, reason }

const afterOptFix = afterDedup.map(q => {
  if (q.id === 'gr8-ch4-q047') {
    // Options: ["A to Z","Arranging records...","A to Z","Smallest to largest"] ans=1
    // The correct answer (index 1) is "Arranging records from largest to smallest..."
    // The duplicated "A to Z" is at index 0 and 2. Keep the real correct option,
    // replace the second "A to Z" (index 2) with a better distractor.
    const before = { options: [...q.options], answer: q.answer };
    const newOptions = [...q.options];
    // Replace the second "A to Z" (index 2) with a meaningful distractor
    newOptions[2] = 'Alphabetically from Z to A (descending)';
    changeLog.push({
      id: q.id,
      phase: 'Phase 3 – Fix repeated option',
      before: JSON.stringify(before.options) + ' ans=' + before.answer,
      after: JSON.stringify(newOptions) + ' ans=' + q.answer,
      reason: 'Option index 0 and 2 were both "A to Z". Replaced index 2 with a distinct distractor.'
    });
    return { ...q, options: newOptions };
  }
  return q;
});

console.log(`Step 2: Fixed ${changeLog.length} repeated-option question(s).`);

// ── Step 3: Answer-position balancing ─────────────────────────────────────────
//
// Sort questions deterministically by ID (lexicographic).
// Use demand-based greedy assignment: always assign the correct answer to the
// slot with the highest remaining demand. Break ties with djb2(id) % tiedCount.

const n = afterOptFix.length;
const targetPerSlot = Math.round(n / 4);
// Demand: how many more questions should each slot receive
const demand = [targetPerSlot, targetPerSlot, targetPerSlot, n - 3 * targetPerSlot];
const sorted = [...afterOptFix].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const balanced = sorted.map(q => {
  const currentIdx = parseInt(q.answer, 10);
  if (isNaN(currentIdx) || currentIdx < 0 || currentIdx >= q.options.length) {
    // Can't reposition — pass through unchanged
    return q;
  }

  // Find the slot(s) with maximum demand
  const maxDemand = Math.max(...demand);
  const candidates = demand.map((d, i) => i).filter(i => demand[i] === maxDemand);

  let targetIdx;
  if (candidates.length === 1) {
    targetIdx = candidates[0];
  } else {
    // Break tie with hash
    targetIdx = candidates[djb2(q.id) % candidates.length];
  }

  demand[targetIdx]--;

  if (targetIdx === currentIdx) {
    // Already in the right slot — no repositioning needed
    return q;
  }

  // Reposition
  const { options: newOptions, answer: newAnswer } = reposition(q.options, currentIdx, targetIdx);

  // Verify: the correct option text must be unchanged
  if (newOptions[targetIdx] !== q.options[currentIdx]) {
    throw new Error(`INTEGRITY FAILURE on ${q.id}: correct option text changed!`);
  }

  const before = { options: [...q.options], answer: q.answer };
  changeLog.push({
    id: q.id,
    phase: 'Phase 2 – Answer-position rebalancing',
    before: 'opts[' + before.answer + ']="' + before.options[parseInt(before.answer)] + '"',
    after:  'opts[' + newAnswer + ']="' + newOptions[targetIdx] + '"',
    reason: `Moved correct answer from position ${currentIdx} to ${targetIdx} for balance. Correct text unchanged.`
  });

  return { ...q, options: newOptions, answer: newAnswer };
});

// ── Step 4: Verify final distribution ─────────────────────────────────────────

const finalDist = { 0: 0, 1: 0, 2: 0, 3: 0 };
for (const q of balanced) finalDist[parseInt(q.answer)]++;

console.log('\n=== FINAL ANSWER DISTRIBUTION ===');
const labels = ['A', 'B', 'C', 'D'];
for (let i = 0; i < 4; i++) {
  const pct = (finalDist[i] / balanced.length * 100).toFixed(2);
  console.log(`  ${labels[i]}(${i}): ${finalDist[i]} / ${balanced.length} = ${pct}%`);
}

// Integrity check: verify every repositioned question still has same correct text
let integrityOk = true;
const origById = {};
for (const q of original) origById[q.id] = q;

for (const q of balanced) {
  const orig = origById[q.id];
  if (!orig) continue; // was a dup — removed
  const origCorrect = orig.options[parseInt(orig.answer)];
  const newCorrect  = q.options[parseInt(q.answer)];
  if (origCorrect !== newCorrect) {
    console.error(`INTEGRITY FAIL: ${q.id} — was "${origCorrect}", now "${newCorrect}"`);
    integrityOk = false;
  }
}
console.log(`\nIntegrity check: ${integrityOk ? 'PASSED ✓' : 'FAILED ✗'}`);
console.log(`Changed positions: ${changeLog.filter(c=>c.phase.includes('rebalanc')).length}`);
console.log(`Total change log entries: ${changeLog.length}`);

// ── Write outputs ─────────────────────────────────────────────────────────────

mkdirSync(resolve(ROOT, 'public/seed'), { recursive: true });
const outDir = resolve(ROOT, 'scripts/audit-output');
mkdirSync(outDir, { recursive: true });

// A. Corrected JSON
writeFileSync(resolve(ROOT, 'public/seed/questions.json'), JSON.stringify(balanced, null, 2));
console.log(`\nWrote corrected JSON → public/seed/questions.json (${balanced.length} questions)`);

// Save a separate backup
writeFileSync(resolve(outDir, 'seed-questions-corrected.json'), JSON.stringify(balanced, null, 2));

// B. Corrected CSV
function escapeCell(val) {
  const s = String(val ?? '');
  if (/[,"\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const csvHeader = 'question,option_a,option_b,option_c,option_d,answer,topic';
const csvRows = balanced.map(q => {
  const [a, b, c, d] = q.options.map(escapeCell);
  return [escapeCell(q.text), a, b, c, d, q.answer, escapeCell(q.topicKey)].join(',');
});
const csv = [csvHeader, ...csvRows].join('\n');
writeFileSync(resolve(outDir, 'seed-questions-corrected.csv'), csv, 'utf-8');
console.log(`Wrote corrected CSV → scripts/audit-output/seed-questions-corrected.csv`);

// C. Original backup CSV
const origCsvRows = original.map(q => {
  const [a, b, c, d] = q.options.map(escapeCell);
  return [escapeCell(q.text), a, b, c, d, q.answer, escapeCell(q.topicKey)].join(',');
});
writeFileSync(resolve(outDir, 'seed-questions-original.csv'), [csvHeader, ...origCsvRows].join('\n'), 'utf-8');
console.log(`Wrote original backup CSV → scripts/audit-output/seed-questions-original.csv`);

// D. Correction log CSV
const logHeader = 'question_id,phase,before,after,reason';
const logRows = changeLog.map(c =>
  [escapeCell(c.id), escapeCell(c.phase), escapeCell(c.before), escapeCell(c.after), escapeCell(c.reason)].join(',')
);
writeFileSync(resolve(outDir, 'question-bank-correction-log.csv'),
  [logHeader, ...logRows].join('\n'), 'utf-8');
console.log(`Wrote correction log → scripts/audit-output/question-bank-correction-log.csv (${changeLog.length} entries)`);

// E. Duplicate removal log
const dupLog = ['question_id,action,reason'];
for (const id of EXACT_DUPS_TO_DROP) {
  const orig = origById[id];
  const reason = id.startsWith('gr4-ch8-ppt1-q0') && parseInt(id.split('q')[1])>=80
    ? 'Exact duplicate of gr4-ch8-ppt1-q0'+String(parseInt(id.split('q')[1])-29)+' (PPT chapter block duplicated)'
    : 'Exact full duplicate (identical text, options and answer)';
  dupLog.push([escapeCell(id), 'REMOVED', escapeCell(reason)].join(','));
}
writeFileSync(resolve(outDir, 'duplicate-removal-log.csv'), dupLog.join('\n'), 'utf-8');
console.log(`Wrote duplicate removal log → scripts/audit-output/duplicate-removal-log.csv`);

// F. Distribution summary JSON (for XLSX builder)
const origDist = { A: 303, B: 5005, C: 825, D: 129 };
const summary = {
  original: { total: original.length, distribution: origDist },
  corrected: {
    total: balanced.length,
    removed: removedCount,
    repositioned: changeLog.filter(c=>c.phase.includes('rebalanc')).length,
    optionFixed: changeLog.filter(c=>c.phase.includes('repeated')).length,
    distribution: {
      A: finalDist[0], B: finalDist[1], C: finalDist[2], D: finalDist[3]
    }
  },
  integrity: integrityOk
};
writeFileSync(resolve(outDir, 'correction-summary.json'), JSON.stringify(summary, null, 2));
console.log(`Wrote summary → scripts/audit-output/correction-summary.json`);

console.log('\nDone.');
