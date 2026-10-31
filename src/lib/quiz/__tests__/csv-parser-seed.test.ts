/**
 * csv-parser-seed.test.ts
 *
 * Tests the canonical CSV parser against the REAL seed questions
 * from public/seed/questions.json (6,262 questions).
 *
 * Approach:
 *   1. Load the seed JSON.
 *   2. Serialise each question back to a CSV row (as a teacher would export).
 *   3. Run the full CSV through parseCSV with 0based convention.
 *   4. Assert every question round-trips: correct answer index, correct
 *      option text, no data corruption.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseCSV } from '../csv-parser';

// ---------------------------------------------------------------------------
// Load seed data
// ---------------------------------------------------------------------------

const SEED_PATH = resolve(__dirname, '../../../../public/seed/questions.json');
const seedQuestions: Array<{
  id: string;
  topicKey: string;
  text: string;
  options: string[];
  answer: string;       // '0'|'1'|'2'|'3'
  explanation: string;
  difficulty: string;
}> = JSON.parse(readFileSync(SEED_PATH, 'utf-8'));

// ---------------------------------------------------------------------------
// CSV serialiser (mirrors what a teacher's export would produce)
// ---------------------------------------------------------------------------

function escapeCell(val: string): string {
  if (/[,"\r\n]/.test(val)) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function questionToRow(q: (typeof seedQuestions)[0]): string {
  const [a, b, c, d] = q.options.map(escapeCell);
  return [
    escapeCell(q.text),
    a, b, c, d,
    q.answer,           // 0-based index string
    escapeCell(q.topicKey),
  ].join(',');
}

const HEADER = 'question,option_a,option_b,option_c,option_d,answer,topic';

function buildCSV(qs: typeof seedQuestions): string {
  return [HEADER, ...qs.map(questionToRow)].join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expectNoParseErrors(csv: string, label: string) {
  const result = parseCSV(csv, '0based');
  if (result.errors.length > 0) {
    const sample = result.errors.slice(0, 3).map(e =>
      `row ${e.row}: ${e.message}`
    ).join('; ');
    throw new Error(`${label} — ${result.errors.length} parse error(s): ${sample}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('csv-parser — seed data round-trip', () => {

  it('parses all 6262 seed questions without errors', () => {
    const csv = buildCSV(seedQuestions);
    const result = parseCSV(csv, '0based');
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toHaveLength(seedQuestions.length);
    expect(result.totalRows).toBe(seedQuestions.length);
  });

  it('preserves answer index for every question', () => {
    const csv = buildCSV(seedQuestions);
    const result = parseCSV(csv, '0based');
    expect(result.errors).toHaveLength(0);

    let failures = 0;
    const failSamples: string[] = [];

    for (let i = 0; i < seedQuestions.length; i++) {
      const orig   = seedQuestions[i];
      const parsed = result.valid[i]?.data;
      if (!parsed) { failures++; continue; }

      if (parsed.answer !== orig.answer) {
        failures++;
        if (failSamples.length < 5) {
          failSamples.push(`${orig.id}: expected answer=${orig.answer}, got ${parsed.answer}`);
        }
      }
    }

    if (failures > 0) {
      throw new Error(`${failures} answer mismatch(es):\n  ${failSamples.join('\n  ')}`);
    }
  });

  it('preserves correct option text for every question', () => {
    const csv = buildCSV(seedQuestions);
    const result = parseCSV(csv, '0based');
    expect(result.errors).toHaveLength(0);

    let failures = 0;
    const failSamples: string[] = [];

    for (let i = 0; i < seedQuestions.length; i++) {
      const orig   = seedQuestions[i];
      const parsed = result.valid[i]?.data;
      if (!parsed) { failures++; continue; }

      const origCorrectText   = orig.options[parseInt(orig.answer, 10)];
      const parsedCorrectText = parsed.options[parseInt(parsed.answer, 10)];

      if (parsedCorrectText !== origCorrectText) {
        failures++;
        if (failSamples.length < 5) {
          failSamples.push(
            `${orig.id}: expected "${origCorrectText}", got "${parsedCorrectText}"`
          );
        }
      }
    }

    if (failures > 0) {
      throw new Error(`${failures} correct-option text mismatch(es):\n  ${failSamples.join('\n  ')}`);
    }
  });

  it('preserves all four option texts for every question', () => {
    const csv = buildCSV(seedQuestions);
    const result = parseCSV(csv, '0based');
    expect(result.errors).toHaveLength(0);

    let failures = 0;
    const failSamples: string[] = [];

    for (let i = 0; i < seedQuestions.length; i++) {
      const orig   = seedQuestions[i];
      const parsed = result.valid[i]?.data;
      if (!parsed) { failures++; continue; }

      for (let j = 0; j < 4; j++) {
        if ((parsed.options[j] ?? '') !== (orig.options[j] ?? '')) {
          failures++;
          if (failSamples.length < 5) {
            failSamples.push(
              `${orig.id} opt[${j}]: expected "${orig.options[j]}", got "${parsed.options[j]}"`
            );
          }
        }
      }
    }

    if (failures > 0) {
      throw new Error(`${failures} option text mismatch(es):\n  ${failSamples.join('\n  ')}`);
    }
  });

  it('preserves question text for every question', () => {
    const csv = buildCSV(seedQuestions);
    const result = parseCSV(csv, '0based');

    let failures = 0;
    const failSamples: string[] = [];

    for (let i = 0; i < seedQuestions.length; i++) {
      const orig   = seedQuestions[i];
      const parsed = result.valid[i]?.data;
      if (!parsed) { failures++; continue; }

      if (parsed.text !== orig.text) {
        failures++;
        if (failSamples.length < 3) {
          failSamples.push(`${orig.id}: text corrupted`);
        }
      }
    }

    if (failures > 0) {
      throw new Error(`${failures} question text corruption(s):\n  ${failSamples.join('\n  ')}`);
    }
  });

  // --- Per-grade-bank checks ---

  it('CS questions (gr9cs) round-trip correctly', () => {
    const qs = seedQuestions.filter(q => q.id.startsWith('gr9cs'));
    const csv = buildCSV(qs);
    const result = expectNoParseErrors(csv, 'gr9cs');
    expect(result.valid).toHaveLength(qs.length);
    for (let i = 0; i < qs.length; i++) {
      expect(result.valid[i].data.answer).toBe(qs[i].answer);
    }
  });

  it('D&T questions (gr9dt) round-trip correctly', () => {
    const qs = seedQuestions.filter(q => q.id.startsWith('gr9dt'));
    const csv = buildCSV(qs);
    const result = expectNoParseErrors(csv, 'gr9dt');
    expect(result.valid).toHaveLength(qs.length);
    for (let i = 0; i < qs.length; i++) {
      expect(result.valid[i].data.answer).toBe(qs[i].answer);
    }
  });

  it('A Level CS questions (alcs) round-trip correctly', () => {
    const qs = seedQuestions.filter(q => q.id.startsWith('alcs'));
    const csv = buildCSV(qs);
    const result = expectNoParseErrors(csv, 'alcs');
    expect(result.valid).toHaveLength(qs.length);
    for (let i = 0; i < qs.length; i++) {
      expect(result.valid[i].data.answer).toBe(qs[i].answer);
    }
  });

  it('questions with commas or quotes in option text survive round-trip', () => {
    const tricky = seedQuestions.filter(q =>
      q.options.some(o => /[,"]/.test(o)) || /[,"]/.test(q.text)
    );
    if (tricky.length === 0) {
      // No such questions in seed — pass trivially
      return;
    }
    const csv = buildCSV(tricky);
    const result = parseCSV(csv, '0based');
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toHaveLength(tricky.length);
    for (let i = 0; i < tricky.length; i++) {
      expect(result.valid[i].data.answer).toBe(tricky[i].answer);
    }
  });

  it('answer is always a valid index (0–3) for every parsed question', () => {
    const csv = buildCSV(seedQuestions);
    const result = parseCSV(csv, '0based');
    const bad = result.valid.filter(r => !['0','1','2','3'].includes(r.data.answer));
    expect(bad).toHaveLength(0);
  });

  it('no question is silently dropped (valid + errors = total)', () => {
    const csv = buildCSV(seedQuestions);
    const result = parseCSV(csv, '0based');
    expect(result.valid.length + result.errors.length).toBe(seedQuestions.length);
  });

});
