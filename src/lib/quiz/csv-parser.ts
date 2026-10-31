/**
 * csv-parser.ts — Canonical, single-source-of-truth CSV parser for WOW Quiz.
 *
 * Uses PapaParse (already a dependency) — never line.split(',').
 * Supports quoted fields, embedded commas, multi-line text, BOM, all encodings.
 *
 * Answer-key convention MUST be explicitly configured by the caller.
 * The parser NEVER silently guesses between 0-indexed and 1-indexed.
 */

import Papa from 'papaparse';
import type { Question } from '@/types/question';

// ── Answer convention ─────────────────────────────────────────────────────────

export type AnswerConvention =
  | '0based'   // 0 = A, 1 = B, 2 = C, 3 = D  (preferred)
  | 'alpha'    // A = 0, B = 1, C = 2, D = 3
  | '1based';  // 1 = A, 2 = B, 3 = C, 4 = D  (legacy)

// ── Validation report ─────────────────────────────────────────────────────────

export interface ValidationError {
  row: number;        // 1-based CSV row number
  field?: string;     // which column/field caused the error
  message: string;
}

export interface ValidationWarning {
  row: number;
  field?: string;
  message: string;
}

export interface ParsedQuestion {
  /** 1-based source row in the CSV */
  csvRow: number;
  /** The parsed Question (without an id — assigned at import time) */
  data: Omit<Question, 'id'>;
  /** True if the topicKey was auto-remapped from a legacy key */
  remappedKey: boolean;
}

export interface CSVParseResult {
  valid: ParsedQuestion[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  /** Count of questions whose topicKey was auto-remapped */
  remappedCount: number;
  /** Total non-header rows in the CSV (valid + invalid) */
  totalRows: number;
}

// ── Header normalisation ──────────────────────────────────────────────────────

/** Maps every known header variant to a canonical internal field name. */
const HEADER_MAP: Record<string, string> = {
  // id
  id: 'id', questionid: 'id', question_id: 'id',
  // topicKey
  topickey: 'topicKey', topic_key: 'topicKey', topic: 'topicKey', subject: 'topicKey',
  // type
  type: 'type', questiontype: 'type', question_type: 'type',
  // text / question
  text: 'text', question: 'text', questiontext: 'text', question_text: 'text',
  // options
  optiona: 'optA', option_a: 'optA', 'option a': 'optA', a: 'optA', choice1: 'optA',
  optionb: 'optB', option_b: 'optB', 'option b': 'optB', b: 'optB', choice2: 'optB',
  optionc: 'optC', option_c: 'optC', 'option c': 'optC', c: 'optC', choice3: 'optC',
  optiond: 'optD', option_d: 'optD', 'option d': 'optD', d: 'optD', choice4: 'optD',
  // answer
  answer: 'answer', correctanswer: 'answer', correct_answer: 'answer',
  answerchoice: 'answer', answer_key: 'answer',
  // correctAnswerText (optional column — not used for grading)
  correctanswertext: 'correctAnswerText', correct_answer_text: 'correctAnswerText',
  // explanation
  explanation: 'explanation', explain: 'explanation', rationale: 'explanation',
  // difficulty
  difficulty: 'difficulty', level: 'difficulty',
  // points / marks
  points: 'points', marks: 'points', score: 'points',
  // chapter
  chapter: 'chapter',
  // imageUrl
  imageurl: 'imageUrl', image_url: 'imageUrl', image: 'imageUrl',
  // grade
  grade: 'grade',
};

function normaliseHeader(raw: string): string {
  return HEADER_MAP[raw.trim().toLowerCase().replace(/[\s_-]+/g, '')] ?? raw.trim();
}

// ── topicKey remapping ────────────────────────────────────────────────────────

const TOPIC_REMAP: Record<string, string> = {
  // Grade 5
  'gr5-computer-evolution': 'gr5-ch1-evolution',
  'gr5-storage-media':      'gr5-ch2-storage',
  // Grade 8
  'gr8-artificial-intelligence': 'gr8-ch1-ai',
  'gr8-technology-trends':       'gr8-ch2-tech',
  // Grade 9 CS
  'gr9-cs-cpu-architecture':       'gr9-cpu',
  'gr9-cs-data-storage':           'gr9-storage',
  'gr9-cs-os-accounts-security':   'gr9-os',
  'gr9-cs-os-file-management':     'gr9-os',
  'gr9-cs-os-interrupts':          'gr9-os',
  'gr9-cs-os-memory-management':   'gr9-os',
  'gr9-cs-os-peripherals-drivers': 'gr9-os',
  'gr9-cs-os-process-management':  'gr9-os',
  'gr9-cs-os-purpose':             'gr9-os',
  // Grade 9 DT
  'gr9-dt-defining':             'gr9dt-design-brief',
  'gr9-dt-developing':           'gr9dt-developing',
  'gr9-dt-identifying':          'gr9dt-design1',
  'gr9-dt-influences-designing': 'gr9dt-influences',
  'gr9-dt-proposing':            'gr9dt-plan',
};

// ── Supported types ───────────────────────────────────────────────────────────

const VALID_TYPES = new Set<string>(['mcq', 'truefalse', 'shortanswer', 'fillinblank', 'matching', 'ordering']);

// ── Answer-key resolution ─────────────────────────────────────────────────────

/**
 * Resolve a raw answer string to a 0-based numeric index for MCQ.
 * Returns null and populates `errorOut` if resolution fails.
 *
 * Convention must be explicit — never guessed silently.
 */
function resolveMCQAnswer(
  raw: string,
  optionCount: number,
  convention: AnswerConvention,
  errorOut: { message: string }
): number | null {
  const trimmed = raw.trim();

  // Alphabetical: always accepted regardless of convention
  if (/^[a-dA-D]$/.test(trimmed)) {
    const idx = 'abcd'.indexOf(trimmed.toLowerCase());
    if (idx >= optionCount) {
      errorOut.message = `Answer "${trimmed}" refers to option ${trimmed.toUpperCase()} but only ${optionCount} options exist`;
      return null;
    }
    return idx;
  }

  const n = parseInt(trimmed, 10);
  if (isNaN(n)) {
    errorOut.message = `MCQ answer "${trimmed}" is not a valid option (expected A–D, 0–3, or 1–4)`;
    return null;
  }

  let idx: number;
  switch (convention) {
    case '0based':
      idx = n;
      break;
    case '1based':
      idx = n - 1;
      break;
    case 'alpha':
      // Numeric answer with alpha convention is an error — must use A/B/C/D
      errorOut.message = `With "Alphabetical" convention, answer must be A–D, not a number. Got "${trimmed}"`;
      return null;
  }

  if (idx < 0 || idx >= optionCount) {
    errorOut.message = `MCQ answer "${trimmed}" (convention: ${convention}) resolves to index ${idx}, which is out of range (0–${optionCount - 1})`;
    return null;
  }

  return idx;
}

// ── Main parser ───────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into validated ParsedQuestion[].
 *
 * @param csvText         Raw CSV file text (may have BOM, CRLF, etc.)
 * @param convention      The answer-key convention to use — MUST be explicit
 * @returns               CSVParseResult with valid questions, errors, and warnings
 */
export function parseCSVText(
  csvText: string,
  convention: AnswerConvention
): CSVParseResult {
  const result: CSVParseResult = {
    valid: [],
    errors: [],
    warnings: [],
    remappedCount: 0,
    totalRows: 0,
  };

  // 1. PapaParse — handles BOM, CRLF, quoted fields, embedded commas, multiline
  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: normaliseHeader,
    transform: (value) => value?.trim() ?? '',
  });

  // Report PapaParse-level errors
  if (parsed.errors.length > 0) {
    for (const e of parsed.errors) {
      const rowNum = (e.row != null ? e.row + 2 : 0); // PapaParse rows are 0-based after header
      result.errors.push({ row: rowNum, message: `CSV parse error: ${e.message}` });
    }
  }

  const rows = parsed.data;
  result.totalRows = rows.length;

  if (rows.length === 0) {
    result.errors.push({ row: 0, message: 'CSV has no data rows after the header' });
    return result;
  }

  // 2. Validate each row
  for (let i = 0; i < rows.length; i++) {
    const csvRow = i + 2; // 1-based, counting header as row 1
    const r = rows[i];

    // ── Required fields ──
    if (!r['topicKey']) {
      result.errors.push({ row: csvRow, field: 'topicKey', message: 'Missing topicKey' });
      continue;
    }
    if (!r['text']) {
      result.errors.push({ row: csvRow, field: 'text', message: 'Missing question text' });
      continue;
    }
    if (!r['answer'] && r['answer'] !== '0') {
      result.errors.push({ row: csvRow, field: 'answer', message: 'Missing answer' });
      continue;
    }

    const rawType = r['type']?.toLowerCase() || 'mcq';
    if (!VALID_TYPES.has(rawType)) {
      result.errors.push({
        row: csvRow, field: 'type',
        message: `Unsupported question type "${r['type']}". Supported: ${[...VALID_TYPES].join(', ')}`
      });
      continue;
    }
    const type = rawType as Question['type'];

    // ── topicKey remapping ──
    const rawTopicKey = r['topicKey'];
    const resolvedTopicKey = TOPIC_REMAP[rawTopicKey] ?? rawTopicKey;
    const wasRemapped = resolvedTopicKey !== rawTopicKey;
    if (wasRemapped) {
      result.remappedCount++;
      result.warnings.push({
        row: csvRow,
        field: 'topicKey',
        message: `topicKey "${rawTopicKey}" remapped to "${resolvedTopicKey}"`
      });
    }

    // ── Type-specific parsing ──
    let options: string[] = [];
    let parsedAnswer = r['answer'].trim();
    let rowError: string | null = null;

    const optA = r['optA'] || '';
    const optB = r['optB'] || '';
    const optC = r['optC'] || '';
    const optD = r['optD'] || '';

    switch (type) {
      case 'mcq': {
        options = [optA, optB, optC, optD].map(o => o.trim()).filter(Boolean);
        if (options.length < 2) {
          rowError = `MCQ needs at least 2 options (optionA–optionD); found ${options.length}`;
          break;
        }
        const errObj = { message: '' };
        const idx = resolveMCQAnswer(parsedAnswer, options.length, convention, errObj);
        if (idx === null) {
          rowError = errObj.message;
          break;
        }
        parsedAnswer = String(idx);
        break;
      }

      case 'truefalse': {
        options = ['True', 'False'];
        const norm = parsedAnswer.toLowerCase();
        if (norm.startsWith('t') || norm === '1' || norm === 'yes') {
          parsedAnswer = 'true';
        } else if (norm.startsWith('f') || norm === '0' || norm === 'no' || norm === '2') {
          parsedAnswer = 'false';
        } else {
          rowError = `True/False answer must be "True" or "False", got "${parsedAnswer}"`;
        }
        break;
      }

      case 'shortanswer':
      case 'fillinblank': {
        options = [];
        if (!parsedAnswer) rowError = 'Short-answer/fill-in-the-blank requires a non-empty answer';
        break;
      }

      case 'matching': {
        options = [optA, optB, optC, optD].map(o => o.trim()).filter(Boolean);
        if (options.length < 2) {
          rowError = 'Matching needs at least 2 options (optionA–optionD)';
          break;
        }
        const pairs = parsedAnswer.split('|').map(s => s.trim()).filter(Boolean);
        if (pairs.length !== options.length) {
          rowError = `Matching answer must have ${options.length} pipe-separated values, got ${pairs.length}`;
          break;
        }
        parsedAnswer = pairs.join('|');
        break;
      }

      case 'ordering': {
        options = [optA, optB, optC, optD].map(o => o.trim()).filter(Boolean);
        if (options.length < 2) {
          rowError = 'Ordering needs at least 2 options (optionA–optionD)';
          break;
        }
        const indices = parsedAnswer.split('|').map(s => parseInt(s.trim(), 10));
        if (
          indices.length !== options.length ||
          indices.some(n => isNaN(n) || n < 0 || n >= options.length)
        ) {
          rowError = `Ordering answer must be ${options.length} pipe-separated 0-based indices, e.g. "2|0|3|1"`;
          break;
        }
        if (new Set(indices).size !== options.length) {
          rowError = 'Ordering answer indices must be a permutation with no repeats';
          break;
        }
        parsedAnswer = indices.join('|');
        break;
      }
    }

    if (rowError) {
      result.errors.push({ row: csvRow, message: rowError });
      continue;
    }

    // ── Optional fields ──
    const rawDifficulty = r['difficulty']?.toLowerCase() || 'medium';
    const difficulty = (['easy', 'medium', 'hard'].includes(rawDifficulty)
      ? rawDifficulty
      : 'medium') as Question['difficulty'];

    const points = parseInt(r['points'] || '1', 10) || 1;
    const chapter = parseInt(r['chapter'] || '1', 10) || 1;
    const imageUrl = r['imageUrl'] || undefined;
    const explanation = r['explanation'] || '';

    if (r['difficulty'] && !['easy', 'medium', 'hard'].includes(rawDifficulty)) {
      result.warnings.push({
        row: csvRow, field: 'difficulty',
        message: `Unknown difficulty "${r['difficulty']}", defaulting to "medium"`
      });
    }

    // ── Assemble the question ──
    const q: Omit<Question, 'id'> = {
      quizId: null,
      topicKey: resolvedTopicKey,
      type,
      text: r['text'],
      options,
      answer: parsedAnswer,
      explanation,
      difficulty,
      points,
      chapter,
      approvalStatus: 'pending',
      source: 'imported',
      createdAt: Date.now(),
      ...(imageUrl ? { imageUrl } : {}),
    };

    result.valid.push({ csvRow, data: q, remappedKey: wasRemapped });
  }

  return result;
}

/**
 * Convenience wrapper: parse CSV text and return the result.
 * Identical to parseCSVText but matches the shape the import page already expects.
 */
export function parseCSV(
  text: string,
  convention: AnswerConvention
): CSVParseResult {
  return parseCSVText(text, convention);
}
