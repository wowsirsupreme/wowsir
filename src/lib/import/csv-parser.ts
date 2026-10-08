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
      answer = answerRaw.toLowerCase().startsWith('t') ? 'true' : 'false';
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
    ['truefalse', 'CSS stands for Cascading Style Sheets.', 'True', 'False', '', '', 'True', 'CSS = Cascading Style Sheets', 'easy', 'css-styling', 'css'],
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
