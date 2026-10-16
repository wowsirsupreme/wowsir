import Papa from 'papaparse';
import type { Question, QuestionType } from '@/types/question';
import { uid } from '@/lib/utils';

/* ── Wayground format detection & import ── */

const WAYGROUND_HEADERS = ['Question Text', 'Question Type', 'Option 1', 'Option 2', 'Correct Answer'];

export function isWaygroundFormat(headers: string[]): boolean {
  return WAYGROUND_HEADERS.every(h => headers.includes(h));
}

/** Supported Wayground types — all others are skipped with a warning */
const WAYGROUND_SUPPORTED: Record<string, QuestionType> = {
  'multiple choice': 'mcq',
  'fill-in-the-blank': 'fillinblank',
  'open-ended': 'shortanswer',
};

export interface WaygroundParseResult {
  parsed: ParsedRow[];
  skipped: Array<{ rowIndex: number; type: string; text: string }>;
}

export function mapWayground(
  rows: RawRow[],
  defaultTopic: string,
  quizId: string | null
): WaygroundParseResult {
  const parsed: ParsedRow[] = [];
  const skipped: Array<{ rowIndex: number; type: string; text: string }> = [];

  rows.forEach((row, i) => {
    const rowIndex = i + 2;
    const typeRaw = (row['Question Type'] || 'Multiple Choice').trim().toLowerCase();
    const type = WAYGROUND_SUPPORTED[typeRaw];

    if (!type) {
      skipped.push({ rowIndex, type: row['Question Type'] || '?', text: (row['Question Text'] || '').slice(0, 60) });
      return;
    }

    const errors: string[] = [];
    const text = (row['Question Text'] || '').trim();
    if (!text) errors.push('Question text is empty');

    // Options 1–4 only (we cap at 4; Option 5 is dropped)
    const options = [
      (row['Option 1'] || '').trim(),
      (row['Option 2'] || '').trim(),
      (row['Option 3'] || '').trim(),
      (row['Option 4'] || '').trim(),
    ].filter(Boolean);

    if (type === 'mcq' && options.length < 2) {
      errors.push('Multiple Choice requires at least 2 options');
    }

    // Answer: Wayground is 1-based integer → convert to 0-based string
    let answer = '0';
    if (type === 'mcq') {
      const raw = (row['Correct Answer'] || '').trim();
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n >= 1) {
        answer = String(n - 1);
      } else if (!raw) {
        errors.push('Correct Answer is missing');
      }
    } else if (type === 'fillinblank') {
      // For fill-in-the-blank, Wayground puts accepted answers in Option slots
      // Store all non-empty options joined with | as the answer (flexible matching)
      answer = options.join('|');
      if (!answer) errors.push('Fill-in-the-Blank requires at least one accepted answer in Option 1');
    }
    // shortanswer: no answer needed

    const question: Partial<Question> = {
      id: uid(),
      quizId,
      topicKey: defaultTopic,
      type,
      text,
      options: type === 'fillinblank' ? [] : options,
      answer,
      explanation: (row['Answer explanation'] || '').trim(),
      imageUrl: (row['Image Link'] || '').trim() || null,
      approvalStatus: errors.length === 0 ? 'pending' : 'rejected',
      source: 'imported',
      points: 10,
      createdAt: Date.now(),
    };

    parsed.push({ raw: row, question, errors, rowIndex });
  });

  return { parsed, skipped };
}

export interface RawRow {
  [key: string]: string;
}

export interface ColumnMapping {
  type: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: string;
  explanation?: string;
  difficulty?: string;
  topic?: string;
  tags?: string;
}

export interface ParsedRow {
  raw: RawRow;
  question?: Partial<Question>;
  errors: string[];
  rowIndex: number;
}

export function parseCSV(file: File): Promise<{ headers: string[]; rows: RawRow[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        resolve({
          headers: result.meta.fields || [],
          rows: result.data as RawRow[],
        });
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}

export function mapAndValidate(
  rows: RawRow[],
  mapping: ColumnMapping,
  defaultTopic: string,
  quizId: string | null
): ParsedRow[] {
  return rows.map((row, i) => {
    const errors: string[] = [];
    const text = (row[mapping.text] || '').trim();
    const typeRaw = (row[mapping.type] || 'mcq').trim().toLowerCase();

    if (!text) errors.push('Question text is empty');

    // Normalise type
    let type: QuestionType = 'mcq';
    if (typeRaw.includes('true') || typeRaw.includes('false') || typeRaw === 'tf') {
      type = 'truefalse';
    } else if (typeRaw.includes('short') || typeRaw === 'sa') {
      type = 'shortanswer';
    } else if (typeRaw.includes('fill') || typeRaw === 'fib') {
      type = 'fillinblank';
    }

    const options = [
      (row[mapping.option_a] || '').trim(),
      (row[mapping.option_b] || '').trim(),
      (row[mapping.option_c] || '').trim(),
      (row[mapping.option_d] || '').trim(),
    ].filter(Boolean);

    if (type === 'mcq' && options.length < 2) {
      errors.push('MCQ requires at least 2 options');
    }

    const answerRaw = (row[mapping.answer] || '').trim();
    let answer = '0';
    if (type === 'mcq') {
      // Accept: 0/1/2/3, A/B/C/D, "Option text"
      if (/^[0-3]$/.test(answerRaw)) {
        answer = answerRaw;
      } else if (/^[a-dA-D]$/.test(answerRaw)) {
        answer = String('abcd'.indexOf(answerRaw.toLowerCase()));
      } else {
        const idx = options.findIndex(o => o.toLowerCase() === answerRaw.toLowerCase());
        answer = idx >= 0 ? String(idx) : '0';
      }
    } else if (type === 'truefalse') {
      // Store as '0' (True) or '1' (False) — matches resolveAnswerIndex convention
      answer = answerRaw.toLowerCase().startsWith('t') ? '0' : '1';
    } else {
      answer = answerRaw;
    }

    if (!answerRaw) errors.push('Answer is empty');

    const question: Partial<Question> = {
      id: uid(),
      quizId,
      topicKey: mapping.topic ? (row[mapping.topic] || defaultTopic) : defaultTopic,
      type,
      text,
      options,
      answer,
      explanation: mapping.explanation ? (row[mapping.explanation] || '') : '',
      difficulty: (mapping.difficulty ? row[mapping.difficulty] : undefined) as Question['difficulty'],
      tags: mapping.tags ? (row[mapping.tags] || '').split(',').map(t => t.trim()).filter(Boolean) : [],
      approvalStatus: errors.length === 0 ? 'pending' : 'rejected',
      source: 'imported',
      points: 10,
      createdAt: Date.now(),
    };

    return { raw: row, question, errors, rowIndex: i + 2 };
  });
}

export function downloadTemplate() {
  const headers = ['type', 'text', 'option_a', 'option_b', 'option_c', 'option_d', 'answer', 'explanation', 'difficulty', 'topic', 'tags'];
  const examples = [
    ['mcq', 'What does HTML stand for?', 'Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlink Text Model Language', 'A', 'HTML = HyperText Markup Language', 'easy', 'html-basics', 'html,web'],
    ['truefalse', 'CSS stands for Cascading Style Sheets.', 'True', 'False', '', '', 'True', 'CSS = Cascading Style Sheets — answer True means index 0, False means index 1', 'easy', 'css-styling', 'css'],
    ['shortanswer', 'Name the HTML tag used to create a hyperlink.', '', '', '', '', '<a>', 'The anchor tag <a> creates hyperlinks', 'medium', 'html-basics', 'html,tags'],
  ];
  const csv = [headers, ...examples].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wow_questions_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}
