/**
 * shuffle.ts — Object-based option tracking and Fisher-Yates shuffle.
 *
 * Golden rule: A correct answer must remain permanently associated with its
 * original option, regardless of how questions or options are rearranged.
 *
 * Never shuffle plain strings and use indexOf() to find the correct answer —
 * that fails when two options have identical text.
 * Instead, each option is an object carrying its originalIndex and isCorrect flag.
 */

import type { Question } from '@/types/question';

// ── Types ────────────────────────────────────────────────────────────────────

/** Stable option representation used during delivery-time shuffle.
 *  isCorrect is the authoritative source of truth for grading. */
export interface OptionObj {
  text: string;
  originalIndex: number;
  isCorrect: boolean;
}

/** A question with options in OptionObj form, ready for shuffle. */
export interface QuestionWithOptionObjs extends Omit<Question, 'options' | 'answer'> {
  options: OptionObj[];
  /** answer is kept for reference but the isCorrect flag on each OptionObj is
   *  the canonical correct-answer indicator after shuffle. */
  answer: string;
  /** Index of the correct option in the current (possibly shuffled) options array. */
  deliveryAnswer: number;
}

// ── Core shuffle ─────────────────────────────────────────────────────────────

/**
 * Fisher-Yates (Knuth) in-place shuffle.
 * Generic — safe with any array of objects or primitives.
 */
export function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]; // work on a copy
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Option-object helpers ─────────────────────────────────────────────────────

/**
 * Build OptionObj[] from a Question's options[] and answer string.
 * Only valid for MCQ questions (answer is a numeric-string index).
 * For other types, options may be empty and the function returns [].
 */
export function buildOptionObjects(question: Question): OptionObj[] {
  if (question.type !== 'mcq' || !question.options?.length) return [];
  const correctIdx = parseInt(question.answer, 10);
  return question.options.map((text, i) => ({
    text,
    originalIndex: i,
    isCorrect: i === correctIdx,
  }));
}

/**
 * Shuffle OptionObj[] with Fisher-Yates.
 * Returns the shuffled array and the new index of the correct option.
 * Uses the isCorrect flag — never indexOf() on text.
 */
export function shuffleOptionObjects(opts: OptionObj[]): {
  shuffled: OptionObj[];
  newAnswerIndex: number;
} {
  const shuffled = fisherYates(opts);
  const newAnswerIndex = shuffled.findIndex(o => o.isCorrect);
  if (newAnswerIndex === -1) {
    // Should never happen if the input was valid; return the unshuffled array
    return { shuffled: opts, newAnswerIndex: parseInt('0', 10) };
  }
  return { shuffled, newAnswerIndex };
}

// ── Relative-answer detection ─────────────────────────────────────────────────

/** Phrases that reference other options by position.
 *  If any option contains one of these, shuffling options would invalidate the question. */
const RELATIVE_ANSWER_PATTERNS = [
  /\ball\s+of\s+the\s+above\b/i,
  /\bnone\s+of\s+the\s+above\b/i,
  /\bboth\s+[a-d]\s+and\s+[a-d]\b/i,
  /\boptions?\s+[a-d]\s+and\s+[a-d]\b/i,
  /\b(?:first|second|third|fourth)\s+(?:and|or)\s+(?:second|third|fourth)\s+options?\b/i,
  /\bthe\s+(?:first|second|third|fourth)\s+option\b/i,
  /\b[a-d]\s+and\s+[a-d]\s+(?:above|only|are|is)\b/i,
];

/**
 * Returns true if shuffling this question's options could invalidate its meaning.
 * Checks both the question text and every option for relative references.
 */
export function hasRelativeAnswers(question: Question): boolean {
  const toCheck = [question.text, ...(question.options || [])];
  return toCheck.some(s =>
    s && RELATIVE_ANSWER_PATTERNS.some(p => p.test(s))
  );
}

// ── Full pipeline ─────────────────────────────────────────────────────────────

/**
 * Apply shuffle to a question for delivery.
 *
 * Returns a new Question with:
 *  - options: shuffled (or original) plain strings for the student-facing payload
 *  - answer: updated numeric-string index pointing to the correct option
 *
 * Does NOT mutate the original question.
 * Does NOT modify the database record.
 * Safe to call multiple times — always works from the canonical answer index.
 */
export function shuffleQuestionOptions(question: Question): Question {
  // Only MCQ supports option shuffle
  if (question.type !== 'mcq') return question;
  // Skip if question has relative answers
  if (hasRelativeAnswers(question)) return question;

  const opts = buildOptionObjects(question);
  if (opts.length === 0) return question;

  const { shuffled, newAnswerIndex } = shuffleOptionObjects(opts);

  return {
    ...question,
    options: shuffled.map(o => o.text),
    answer: String(newAnswerIndex),
  };
}

/**
 * Apply question-order and/or option-order shuffle to an entire questions array.
 *
 * @param questions    The canonical (database) question array
 * @param shuffleQ     Whether to randomise the question order
 * @param shuffleOpts  Whether to randomise option order within each MCQ
 * @returns            A new array — originals are NOT mutated
 */
export function applyShuffleToQuestions(
  questions: Question[],
  shuffleQ: boolean,
  shuffleOpts: boolean
): Question[] {
  // 1. Optionally shuffle question order
  let result = shuffleQ ? fisherYates([...questions]) : [...questions];

  // 2. Optionally shuffle option order within each question
  if (shuffleOpts) {
    result = result.map(q => shuffleQuestionOptions(q));
  }

  return result;
}

/**
 * Grade a student's answer against the canonical correct answer.
 *
 * Works regardless of shuffle — uses the numeric answer index that is stored
 * in the delivered question (which was updated when options were shuffled).
 *
 * @param deliveredQuestion  The question as delivered to the student (may have shuffled options)
 * @param studentChoice      The option index (0-based) that the student selected
 */
export function gradeAnswer(deliveredQuestion: Question, studentChoice: number): boolean {
  if (deliveredQuestion.type !== 'mcq') return false;
  const correctIdx = parseInt(deliveredQuestion.answer, 10);
  return !isNaN(correctIdx) && studentChoice === correctIdx;
}
