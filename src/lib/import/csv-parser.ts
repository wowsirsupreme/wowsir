import Papa from 'papaparse';
import type { Question, QuestionType } from '@/types/question';
import { uid } from '@/lib/utils';

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

/**
 * Resolve an MCQ answer to a 0-based index.
 * Accepts all of: A/B/C/D, a/b/c/d, 1/2/3/4 (1-based), 0/1/2/3 (0-based), or the option text itself.
 */
function resolveMCQAnswer(raw: string, options: string[]): string {
  const trimmed = raw.trim();

  // Letter: A/B/C/D (case-insensitive)
  if (/^[a-dA-D]$/.test(trimmed)) {
    return String('abcd'.indexOf(trimmed.toLowerCase()));
  }

  const n = parseInt(trimmed, 10);
  if (!isNaN(n)) {
    // 1-based (1–4) — most natural for teachers
    if (n >= 1 && n <= 4) return String(n - 1);
    // 0-based (0–3) — also accepted
    if (n >= 0 && n <= 3) return String(n);
  }

  // Full option text match (case-insensitive)
  const idx = options.findIndex(o => o.toLowerCase() === trimmed.toLowerCase());
  if (idx >= 0) return String(idx);

  return '0'; // fallback
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

    // Normalise type — accept common aliases
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
      answer = resolveMCQAnswer(answerRaw, options);
    } else if (type === 'truefalse') {
      // Accept: True/False, T/F, 1/2, Yes/No — store as '0' (True) or '1' (False)
      const lower = answerRaw.toLowerCase();
      answer = (lower.startsWith('t') || lower === '1' || lower === 'yes') ? '0' : '1';
    } else {
      // shortanswer / fillinblank — answer is the expected text; lowercase to match grading
      answer = answerRaw.toLowerCase();
    }

    if (!answerRaw && type !== 'shortanswer') errors.push('Answer is empty');

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
  const headers = [
    'type', 'text',
    'option_a', 'option_b', 'option_c', 'option_d',
    'answer', 'explanation', 'difficulty', 'topic', 'tags',
  ];

  // Row 2 — instruction row (not imported, just guidance)
  const instructions = [
    'mcq / truefalse / shortanswer / fillinblank',
    'The question (required)',
    'Option A', 'Option B', 'Option C (optional)', 'Option D (optional)',
    'MCQ: A B C D  or  1 2 3 4  or  0 1 2 3  |  TrueFalse: True or False  |  Short/Fill: the expected answer',
    'Why this answer is correct (optional)',
    'easy / medium / hard',
    'Topic key e.g. gr9-cpu',
    'comma,separated,tags (optional)',
  ];

  const examples = [
    // MCQ — answer as letter
    [
      'mcq',
      'Which component is considered the brain of a computer?',
      'Hard Disk Drive', 'Random Access Memory', 'Central Processing Unit', 'Graphics Card',
      'C',
      'The CPU (Central Processing Unit) executes all instructions.',
      'easy', 'gr9-cpu', 'hardware,cpu',
    ],
    // MCQ — answer as number (1-based, more natural)
    [
      'mcq',
      'What does RAM stand for?',
      'Read Access Memory', 'Random Access Memory', 'Rapid Action Module', 'Read And Modify',
      '2',
      'RAM = Random Access Memory — temporary storage while the computer is on.',
      'easy', 'gr9-memory', 'hardware,memory',
    ],
    // True/False
    [
      'truefalse',
      'The CPU carries out the Fetch-Decode-Execute cycle.',
      'True', 'False', '', '',
      'True',
      'The FDE cycle is the fundamental operation of the CPU.',
      'easy', 'gr9-fde', 'cpu',
    ],
    // Short answer
    [
      'shortanswer',
      'Name the part of the CPU that performs arithmetic calculations.',
      '', '', '', '',
      'ALU',
      'ALU = Arithmetic Logic Unit.',
      'medium', 'gr9-cpu', 'cpu,hardware',
    ],
    // Fill in the blank
    [
      'fillinblank',
      'The operating system manages the computer\'s ___ and software resources.',
      '', '', '', '',
      'hardware',
      'An OS manages both hardware and software resources.',
      'medium', 'gr9-os', 'os',
    ],
  ];

  const allRows = [headers, instructions, ...examples];
  const csv = allRows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wow_questions_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}
