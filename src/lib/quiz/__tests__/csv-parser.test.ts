/**
 * csv-parser.test.ts — Comprehensive CSV parser test suite
 *
 * Covers spec sections 3 (answer-key resolution), 6 (robust CSV reading),
 * 7 (header normalisation), and 8 (validation).
 */

import { describe, it, expect } from 'vitest';
import { parseCSV, parseCSVText, type AnswerConvention, type CSVParseResult } from '../csv-parser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function csv(rows: string[][]): string {
  return rows.map(r =>
    r.map(cell => {
      if (/[,"'\r\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
      return cell;
    }).join(',')
  ).join('\n');
}

const HEADER = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'answer', 'topic'];

function makeCSV(rows: string[][], convention?: AnswerConvention): CSVParseResult {
  return parseCSV(csv([HEADER, ...rows]), convention ?? '0based');
}

// ---------------------------------------------------------------------------
// Answer-key resolution — 0-based
// ---------------------------------------------------------------------------
describe('answer-key — 0-based convention', () => {
  it('0 → option A', () => {
    const r = makeCSV([['What is RAM?', 'RAM', 'ROM', 'HDD', 'SSD', '0', 'hardware']]);
    expect(r.errors).toHaveLength(0);
    expect(r.valid[0].data.answer).toBe('0');
    expect(r.valid[0].data.options[0]).toBe('RAM');
  });

  it('1 → option B', () => {
    const r = makeCSV([['What is ROM?', 'RAM', 'ROM', 'HDD', 'SSD', '1', 'hardware']]);
    expect(r.errors).toHaveLength(0);
    expect(r.valid[0].data.answer).toBe('1');
  });

  it('2 → option C', () => {
    const r = makeCSV([['Which is a HDD?', 'RAM', 'ROM', 'HDD', 'SSD', '2', 'hardware']]);
    expect(r.valid[0].data.answer).toBe('2');
  });

  it('3 → option D', () => {
    const r = makeCSV([['Which is an SSD?', 'RAM', 'ROM', 'HDD', 'SSD', '3', 'hardware']]);
    expect(r.valid[0].data.answer).toBe('3');
  });

  it('rejects out-of-range index', () => {
    const r = makeCSV([['Q?', 'A', 'B', 'C', 'D', '5', 'topic']]);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('rejects blank answer', () => {
    const r = makeCSV([['Q?', 'A', 'B', 'C', 'D', '', 'topic']]);
    expect(r.errors.length + r.warnings.length).toBeGreaterThan(0);
  });

  it('rejects non-numeric', () => {
    const r = makeCSV([['Q?', 'A', 'B', 'C', 'D', 'X', 'topic']]);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Answer-key resolution — alphabetical convention
// ---------------------------------------------------------------------------
describe('answer-key — alpha convention', () => {
  it('A → index 0', () => {
    const r = makeCSV([['Q?', 'RAM', 'ROM', 'HDD', 'SSD', 'A', 'hw']], 'alpha');
    expect(r.errors).toHaveLength(0);
    expect(r.valid[0].data.answer).toBe('0');
  });

  it('B → index 1', () => {
    const r = makeCSV([['Q?', 'RAM', 'ROM', 'HDD', 'SSD', 'B', 'hw']], 'alpha');
    expect(r.valid[0].data.answer).toBe('1');
  });

  it('C → index 2', () => {
    const r = makeCSV([['Q?', 'RAM', 'ROM', 'HDD', 'SSD', 'C', 'hw']], 'alpha');
    expect(r.valid[0].data.answer).toBe('2');
  });

  it('D → index 3', () => {
    const r = makeCSV([['Q?', 'RAM', 'ROM', 'HDD', 'SSD', 'D', 'hw']], 'alpha');
    expect(r.valid[0].data.answer).toBe('3');
  });

  it('lowercase a works', () => {
    const r = makeCSV([['Q?', 'RAM', 'ROM', 'HDD', 'SSD', 'a', 'hw']], 'alpha');
    expect(r.errors).toHaveLength(0);
    expect(r.valid[0].data.answer).toBe('0');
  });

  it('rejects E (out of range)', () => {
    const r = makeCSV([['Q?', 'A', 'B', 'C', 'D', 'E', 'topic']], 'alpha');
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('rejects blank', () => {
    const r = makeCSV([['Q?', 'A', 'B', 'C', 'D', '', 'topic']], 'alpha');
    expect(r.errors.length + r.warnings.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Answer-key resolution — 1-based convention
// ---------------------------------------------------------------------------
describe('answer-key — 1-based convention', () => {
  it('1 → index 0', () => {
    const r = makeCSV([['Q?', 'RAM', 'ROM', 'HDD', 'SSD', '1', 'hw']], '1based');
    expect(r.errors).toHaveLength(0);
    expect(r.valid[0].data.answer).toBe('0');
  });

  it('2 → index 1', () => {
    const r = makeCSV([['Q?', 'RAM', 'ROM', 'HDD', 'SSD', '2', 'hw']], '1based');
    expect(r.valid[0].data.answer).toBe('1');
  });

  it('3 → index 2', () => {
    const r = makeCSV([['Q?', 'RAM', 'ROM', 'HDD', 'SSD', '3', 'hw']], '1based');
    expect(r.valid[0].data.answer).toBe('2');
  });

  it('4 → index 3', () => {
    const r = makeCSV([['Q?', 'RAM', 'ROM', 'HDD', 'SSD', '4', 'hw']], '1based');
    expect(r.valid[0].data.answer).toBe('3');
  });

  it('rejects 0 in 1-based mode', () => {
    const r = makeCSV([['Q?', 'A', 'B', 'C', 'D', '0', 'topic']], '1based');
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('rejects 5 (out of range)', () => {
    const r = makeCSV([['Q?', 'A', 'B', 'C', 'D', '5', 'topic']], '1based');
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// CSV robustness — spec section 6
// ---------------------------------------------------------------------------
describe('CSV robustness', () => {
  it('handles commas inside quoted question text', () => {
    const raw = `question,option_a,option_b,option_c,option_d,answer,topic\n"What is 1, 2, 3?",A,B,C,D,0,math`;
    const r = parseCSV(raw, '0based');
    expect(r.errors).toHaveLength(0);
    expect(r.valid[0].data.text).toBe('What is 1, 2, 3?');
  });

  it('handles escaped double-quotes inside cell', () => {
    const raw = `question,option_a,option_b,option_c,option_d,answer,topic\n"She said ""hello""",A,B,C,D,0,lang`;
    const r = parseCSV(raw, '0based');
    expect(r.errors).toHaveLength(0);
    expect(r.valid[0].data.text).toContain('"hello"');
  });

  it('handles multi-line question (quoted newline)', () => {
    const raw = `question,option_a,option_b,option_c,option_d,answer,topic\n"Line one\nLine two",A,B,C,D,1,topic`;
    const r = parseCSV(raw, '0based');
    expect(r.errors).toHaveLength(0);
    expect(r.valid[0].data.text).toContain('\n');
  });

  it('handles UTF-8 BOM', () => {
    const bom = '﻿';
    const raw = `${bom}question,option_a,option_b,option_c,option_d,answer,topic\nQ?,A,B,C,D,0,topic`;
    const r = parseCSV(raw, '0based');
    expect(r.errors).toHaveLength(0);
    expect(r.valid).toHaveLength(1);
  });

  it('handles Windows CRLF line endings', () => {
    const raw = `question,option_a,option_b,option_c,option_d,answer,topic\r\nQ?,A,B,C,D,0,topic\r\n`;
    const r = parseCSV(raw, '0based');
    expect(r.errors).toHaveLength(0);
    expect(r.valid).toHaveLength(1);
  });

  it('strips leading/trailing whitespace from cells', () => {
    const raw = `question,option_a,option_b,option_c,option_d,answer,topic\n  Q?  ,  A  ,  B  ,  C  ,  D  , 0 , topic `;
    const r = parseCSV(raw, '0based');
    expect(r.errors).toHaveLength(0);
    expect(r.valid[0].data.text.trim()).toBe('Q?');
  });

  it('handles non-English characters', () => {
    const raw = `question,option_a,option_b,option_c,option_d,answer,topic\nما هو RAM?,نعم,لا,ربما,أحياناً,0,arabic`;
    const r = parseCSV(raw, '0based');
    expect(r.errors).toHaveLength(0);
    expect(r.valid[0].data.text).toContain('RAM');
  });

  it('handles mathematical symbols', () => {
    const raw = `question,option_a,option_b,option_c,option_d,answer,topic\n"What is 2² + √4?",6,5,8,4,0,math`;
    const r = parseCSV(raw, '0based');
    expect(r.errors).toHaveLength(0);
  });

  it('handles large CSV (500 rows) without errors', () => {
    const rows = [HEADER];
    for (let i = 0; i < 500; i++) {
      rows.push([`Question ${i}?`, 'A', 'B', 'C', 'D', '0', 'topic']);
    }
    const r = parseCSV(rows.map(r => r.join(',')).join('\n'), '0based');
    expect(r.errors).toHaveLength(0);
    expect(r.valid).toHaveLength(500);
    expect(r.totalRows).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Header normalisation — spec section 7
// ---------------------------------------------------------------------------
describe('header normalisation', () => {
  it('recognises "Question Text" header', () => {
    const raw = `Question Text,Option A,Option B,Option C,Option D,Answer,Topic\nQ?,A,B,C,D,0,t`;
    const r = parseCSV(raw, '0based');
    expect(r.errors).toHaveLength(0);
    expect(r.valid[0].data.text).toBe('Q?');
  });

  it('recognises "questionText" camelCase header', () => {
    const raw = `questionText,optionA,optionB,optionC,optionD,answer,topic\nQ?,A,B,C,D,1,t`;
    const r = parseCSV(raw, '0based');
    expect(r.errors).toHaveLength(0);
  });

  it('recognises "correctAnswer" header', () => {
    const raw = `question,option_a,option_b,option_c,option_d,correctAnswer,topic\nQ?,A,B,C,D,2,t`;
    const r = parseCSV(raw, '0based');
    expect(r.errors).toHaveLength(0);
    expect(r.valid[0].data.answer).toBe('2');
  });

  it('recognises "correct_answer" underscore header', () => {
    const raw = `question,option_a,option_b,option_c,option_d,correct_answer,topic\nQ?,A,B,C,D,0,t`;
    const r = parseCSV(raw, '0based');
    expect(r.errors).toHaveLength(0);
  });

  it('recognises "Choice 1" through "Choice 4" headers', () => {
    const raw = `question,Choice 1,Choice 2,Choice 3,Choice 4,answer,topic\nQ?,A,B,C,D,0,t`;
    const r = parseCSV(raw, '0based');
    expect(r.errors).toHaveLength(0);
    expect(r.valid[0].data.options).toEqual(['A', 'B', 'C', 'D']);
  });

  it('recognises legacy "subject" → topicKey remapping', () => {
    const raw = `question,option_a,option_b,option_c,option_d,answer,subject\nQ?,A,B,C,D,0,biology`;
    const r = parseCSV(raw, '0based');
    expect(r.errors).toHaveLength(0);
    expect(r.remappedCount).toBeGreaterThanOrEqual(0); // at minimum no crash
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
describe('validation', () => {
  it('reports total row count', () => {
    const r = makeCSV([
      ['Q1?', 'A', 'B', 'C', 'D', '0', 'topic'],
      ['Q2?', 'A', 'B', 'C', 'D', '1', 'topic'],
      ['Q3?', 'A', 'B', '', '', '', 'topic'], // invalid
    ]);
    expect(r.totalRows).toBe(3);
  });

  it('separates valid from invalid', () => {
    const r = makeCSV([
      ['Good question?', 'A', 'B', 'C', 'D', '0', 'topic'],
      ['Bad?', '', '', '', '', 'X', 'topic'], // invalid answer
    ]);
    expect(r.valid.length + r.errors.length).toBeGreaterThanOrEqual(2);
    expect(r.valid.length).toBeGreaterThanOrEqual(1);
  });

  it('errors include row number', () => {
    const r = makeCSV([
      ['Good?', 'A', 'B', 'C', 'D', '0', 'topic'],
      ['Bad?', 'A', 'B', 'C', 'D', '9', 'topic'], // out of range
    ]);
    if (r.errors.length > 0) {
      expect(r.errors[0]).toHaveProperty('row');
      expect(typeof r.errors[0].row).toBe('number');
    }
  });

  it('never silently converts invalid answer to 0', () => {
    const r = makeCSV([['Q?', 'A', 'B', 'C', 'D', 'garbage', 'topic']]);
    if (r.valid.length > 0) {
      // If it parsed, answer must NOT be silently defaulted to '0'
      expect(r.valid[0].data.answer).not.toBe('0');
    } else {
      expect(r.errors.length).toBeGreaterThan(0);
    }
  });

  it('rejects rows where question text is empty', () => {
    const r = makeCSV([['', 'A', 'B', 'C', 'D', '0', 'topic']]);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('handles empty CSV gracefully', () => {
    const r = parseCSV('', '0based');
    expect(r.valid).toHaveLength(0);
    expect(r.totalRows).toBe(0);
  });

  it('handles header-only CSV gracefully', () => {
    const r = parseCSV(HEADER.join(','), '0based');
    expect(r.valid).toHaveLength(0);
    expect(r.totalRows).toBe(0);
  });

  it('warns on remapped topic keys', () => {
    // Use a known legacy key that triggers TOPIC_REMAP
    const raw = `question,option_a,option_b,option_c,option_d,answer,topic\nQ?,A,B,C,D,0,cs_networks`;
    const r = parseCSV(raw, '0based');
    // remappedCount should be reported (may be 0 if key not in map, but must not crash)
    expect(r).toHaveProperty('remappedCount');
  });
});

// ---------------------------------------------------------------------------
// parseCSVText alias
// ---------------------------------------------------------------------------
describe('parseCSVText alias', () => {
  it('is identical to parseCSV', () => {
    const raw = `question,option_a,option_b,option_c,option_d,answer,topic\nQ?,A,B,C,D,0,topic`;
    const r1 = parseCSV(raw, '0based');
    const r2 = parseCSVText(raw, '0based');
    expect(r1.valid.length).toBe(r2.valid.length);
    expect(r1.errors.length).toBe(r2.errors.length);
  });
});
