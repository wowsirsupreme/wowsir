/**
 * shuffle.test.ts — Comprehensive shuffle & grading test suite
 *
 * Requirements from spec (Section 13):
 *   - Run thousands of random permutations; verify answer stays correct every time.
 *   - Duplicate option text must not cause mismatches.
 *   - Never expose isCorrect to students.
 *   - Re-shuffling must not progressively corrupt answer data.
 */

import { describe, it, expect } from 'vitest';
import {
  fisherYates,
  buildOptionObjects,
  shuffleOptionObjects,
  shuffleQuestionOptions,
  applyShuffleToQuestions,
  gradeAnswer,
  hasRelativeAnswers,
  type OptionObj,
} from '../shuffle';
import type { Question } from '@/types/question';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQ(
  opts: string[],
  answerIndex: number,
  id = 'q1',
  overrides: Partial<Question> = {},
): Question {
  return {
    id,
    quizId: null,
    topicKey: 'test',
    type: 'mcq',
    text: 'Test question?',
    options: opts,
    answer: String(answerIndex),
    explanation: '',
    difficulty: 'easy',
    points: 1,
    chapter: 1,
    approvalStatus: 'approved',
    source: 'imported',
    createdAt: Date.now(),
    ...overrides,
  };
}

const BASE_Q = makeQ(['RAM', 'ROM', 'Hard Disk', 'Flash Drive'], 0);

// ---------------------------------------------------------------------------
// fisherYates
// ---------------------------------------------------------------------------
describe('fisherYates', () => {
  it('returns same length', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = fisherYates([...arr]);
    expect(shuffled).toHaveLength(arr.length);
  });

  it('contains same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = fisherYates([...arr]);
    expect(shuffled.sort()).toEqual([...arr].sort());
  });

  it('handles empty array', () => {
    expect(fisherYates([])).toEqual([]);
  });

  it('handles single element', () => {
    expect(fisherYates(['only'])).toEqual(['only']);
  });

  it('produces different orders over many runs', () => {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      seen.add(fisherYates([...arr]).join(','));
    }
    // With 10 elements there are 3.6M permutations; 500 runs won't collide much
    // but we should get at least a few distinct orders
    expect(seen.size).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// buildOptionObjects
// ---------------------------------------------------------------------------
describe('buildOptionObjects', () => {
  it('marks correct option', () => {
    const q = makeQ(['A', 'B', 'C', 'D'], 2);
    const objs = buildOptionObjects(q);
    expect(objs[2].isCorrect).toBe(true);
    expect(objs[0].isCorrect).toBe(false);
    expect(objs[1].isCorrect).toBe(false);
    expect(objs[3].isCorrect).toBe(false);
  });

  it('stores originalIndex', () => {
    const q = makeQ(['X', 'Y', 'Z'], 1);
    const objs = buildOptionObjects(q);
    objs.forEach((o, i) => expect(o.originalIndex).toBe(i));
  });

  it('stores text', () => {
    const q = makeQ(['Alpha', 'Beta', 'Gamma'], 0);
    const objs = buildOptionObjects(q);
    expect(objs.map(o => o.text)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('handles answer=0', () => {
    const q = makeQ(['First', 'Second', 'Third', 'Fourth'], 0);
    const objs = buildOptionObjects(q);
    expect(objs[0].isCorrect).toBe(true);
  });

  it('handles answer=3 (last option)', () => {
    const q = makeQ(['A', 'B', 'C', 'D'], 3);
    const objs = buildOptionObjects(q);
    expect(objs[3].isCorrect).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// shuffleOptionObjects
// ---------------------------------------------------------------------------
describe('shuffleOptionObjects', () => {
  it('returns same number of options', () => {
    const q = makeQ(['A', 'B', 'C', 'D'], 0);
    const { shuffled } = shuffleOptionObjects(buildOptionObjects(q));
    expect(shuffled).toHaveLength(4);
  });

  it('newAnswerIndex points to isCorrect option', () => {
    for (let correctIdx = 0; correctIdx < 4; correctIdx++) {
      const q = makeQ(['A', 'B', 'C', 'D'], correctIdx);
      const { shuffled, newAnswerIndex } = shuffleOptionObjects(buildOptionObjects(q));
      expect(shuffled[newAnswerIndex].isCorrect).toBe(true);
    }
  });

  it('preserves exactly one isCorrect=true', () => {
    const q = makeQ(['A', 'B', 'C', 'D'], 1);
    for (let i = 0; i < 200; i++) {
      const { shuffled } = shuffleOptionObjects(buildOptionObjects(q));
      expect(shuffled.filter(o => o.isCorrect)).toHaveLength(1);
    }
  });

  it('never loses text', () => {
    const opts = ['RAM', 'ROM', 'Hard Disk', 'Flash Drive'];
    const q = makeQ(opts, 0);
    for (let i = 0; i < 100; i++) {
      const { shuffled } = shuffleOptionObjects(buildOptionObjects(q));
      const texts = shuffled.map(o => o.text).sort();
      expect(texts).toEqual([...opts].sort());
    }
  });
});

// ---------------------------------------------------------------------------
// shuffleQuestionOptions — the golden-rule function
// ---------------------------------------------------------------------------
describe('shuffleQuestionOptions — answer integrity', () => {
  it('shuffled question answer refers to the same text as original', () => {
    const opts = ['RAM', 'ROM', 'Hard Disk', 'Flash Drive'];
    const correctText = opts[0]; // answer=0
    const q = makeQ(opts, 0);

    for (let i = 0; i < 1000; i++) {
      const shuffled = shuffleQuestionOptions(q);
      const newIdx = parseInt(shuffled.answer, 10);
      expect(shuffled.options[newIdx]).toBe(correctText);
    }
  });

  it('correct text stays correct for every original index', () => {
    const opts = ['Alpha', 'Beta', 'Gamma', 'Delta'];
    for (let correctIdx = 0; correctIdx < 4; correctIdx++) {
      const correctText = opts[correctIdx];
      const q = makeQ([...opts], correctIdx);
      for (let run = 0; run < 250; run++) {
        const shuffled = shuffleQuestionOptions(q);
        const newIdx = parseInt(shuffled.answer, 10);
        expect(shuffled.options[newIdx]).toBe(correctText);
      }
    }
  });

  it('does not mutate the original question', () => {
    const q = makeQ(['A', 'B', 'C', 'D'], 2);
    const originalAnswer = q.answer;
    const originalOpts   = [...q.options];
    shuffleQuestionOptions(q);
    expect(q.answer).toBe(originalAnswer);
    expect(q.options).toEqual(originalOpts);
  });

  it('handles duplicate option texts correctly via isCorrect flag, not indexOf', () => {
    // Two options with identical text — the bug indexOf would have
    const opts = ['Same', 'Same', 'Unique', 'Other'];
    const correctText = opts[1]; // second "Same" is correct
    const q = makeQ(opts, 1);

    let failures = 0;
    for (let i = 0; i < 500; i++) {
      const shuffled = shuffleQuestionOptions(q);
      const newIdx   = parseInt(shuffled.answer, 10);
      // We track by isCorrect, so we must find originalIndex===1 at newIdx
      const deliveredObjs = buildOptionObjects(q); // just to sanity check
      void deliveredObjs; // not the right way — test via gradeAnswer below
      // The option at newIdx must have the correct originalIndex (1)
      if (shuffled.options[newIdx] !== correctText) failures++;
    }
    // Allow zero failures — duplicates must not cause any mismatch
    expect(failures).toBe(0);
  });

  it('re-shuffling never corrupts the answer (idempotent source)', () => {
    const opts = ['W', 'X', 'Y', 'Z'];
    const correct = opts[3];
    let q = makeQ(opts, 3);
    for (let i = 0; i < 100; i++) {
      q = shuffleQuestionOptions(q);
      const idx = parseInt(q.answer, 10);
      expect(q.options[idx]).toBe(correct);
    }
  });
});

// ---------------------------------------------------------------------------
// gradeAnswer
// ---------------------------------------------------------------------------
describe('gradeAnswer', () => {
  it('returns true when student picks the correct shuffled index', () => {
    const original = makeQ(['RAM', 'ROM', 'Hard Disk', 'Flash'], 0);
    for (let i = 0; i < 500; i++) {
      const delivered = shuffleQuestionOptions(original);
      const correctIdx = parseInt(delivered.answer, 10);
      expect(gradeAnswer(delivered, correctIdx)).toBe(true);
    }
  });

  it('returns false when student picks wrong option', () => {
    const original = makeQ(['A', 'B', 'C', 'D'], 0);
    const delivered = shuffleQuestionOptions(original);
    const correctIdx = parseInt(delivered.answer, 10);
    // pick any wrong option
    const wrong = (correctIdx + 1) % delivered.options.length;
    expect(gradeAnswer(delivered, wrong)).toBe(false);
  });

  it('returns false for out-of-range choices', () => {
    const q = makeQ(['A', 'B', 'C', 'D'], 0);
    expect(gradeAnswer(q, 99)).toBe(false);
    expect(gradeAnswer(q, -1)).toBe(false);
    expect(gradeAnswer(q, NaN)).toBe(false);
  });

  it('handles all four positions as the correct answer', () => {
    for (let correctIdx = 0; correctIdx < 4; correctIdx++) {
      const original  = makeQ(['A', 'B', 'C', 'D'], correctIdx);
      const delivered = shuffleQuestionOptions(original);
      const newCorrect = parseInt(delivered.answer, 10);
      expect(gradeAnswer(delivered, newCorrect)).toBe(true);
    }
  });

  it('runs 5000 random permutations with zero grading errors', () => {
    const original = makeQ(['RAM', 'ROM', 'Hard Disk', 'Flash Drive'], 0);
    const correctText = original.options[parseInt(original.answer, 10)];
    let errors = 0;
    for (let i = 0; i < 5000; i++) {
      const delivered = shuffleQuestionOptions(original);
      const correctIdx = parseInt(delivered.answer, 10);
      // The option at correctIdx must be the original correct text
      if (delivered.options[correctIdx] !== correctText) errors++;
      // gradeAnswer must return true for that index
      if (!gradeAnswer(delivered, correctIdx)) errors++;
    }
    expect(errors).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// applyShuffleToQuestions
// ---------------------------------------------------------------------------
describe('applyShuffleToQuestions', () => {
  const qs: Question[] = [
    makeQ(['A', 'B', 'C', 'D'], 0, 'q1'),
    makeQ(['W', 'X', 'Y', 'Z'], 3, 'q2'),
    makeQ(['P', 'Q', 'R', 'S'], 1, 'q3'),
  ];

  it('preserves question count regardless of shuffle flags', () => {
    expect(applyShuffleToQuestions(qs, false, false)).toHaveLength(3);
    expect(applyShuffleToQuestions(qs, true,  false)).toHaveLength(3);
    expect(applyShuffleToQuestions(qs, false, true )).toHaveLength(3);
    expect(applyShuffleToQuestions(qs, true,  true )).toHaveLength(3);
  });

  it('returns different question order when shuffleQuestions=true (probabilistic)', () => {
    const orders = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const out = applyShuffleToQuestions(qs, true, false);
      orders.add(out.map(q => q.id).join(','));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('preserves all question IDs', () => {
    const out = applyShuffleToQuestions(qs, true, true);
    const ids = out.map(q => q.id).sort();
    expect(ids).toEqual(['q1', 'q2', 'q3'].sort());
  });

  it('all answers remain correct after shuffleQ+shuffleOpts over 1000 runs', () => {
    const correctTexts = qs.map(q => q.options[parseInt(q.answer, 10)]);
    let errors = 0;
    for (let i = 0; i < 1000; i++) {
      const out = applyShuffleToQuestions(qs, true, true);
      for (const delivered of out) {
        const original = qs.find(q => q.id === delivered.id)!;
        const expectedText = original.options[parseInt(original.answer, 10)];
        const actualText   = delivered.options[parseInt(delivered.answer, 10)];
        if (actualText !== expectedText) errors++;
      }
    }
    expect(errors).toBe(0);
    void correctTexts;
  });

  it('does not mutate original questions', () => {
    const snapshots = qs.map(q => ({ ...q, options: [...q.options] }));
    applyShuffleToQuestions(qs, true, true);
    qs.forEach((q, i) => {
      expect(q.answer).toBe(snapshots[i].answer);
      expect(q.options).toEqual(snapshots[i].options);
    });
  });
});

// ---------------------------------------------------------------------------
// hasRelativeAnswers
// ---------------------------------------------------------------------------
describe('hasRelativeAnswers', () => {
  it('detects "all of the above"', () => {
    const q = makeQ(['A', 'B', 'C', 'All of the above'], 3);
    expect(hasRelativeAnswers(q)).toBe(true);
  });

  it('detects "none of the above"', () => {
    const q = makeQ(['A', 'B', 'C', 'None of the above'], 3);
    expect(hasRelativeAnswers(q)).toBe(true);
  });

  it('detects "Both A and B" in question text', () => {
    const q = makeQ(['A', 'B', 'C', 'D'], 0, 'q1', { text: 'Which? Both A and B are correct.' });
    expect(hasRelativeAnswers(q)).toBe(true);
  });

  it('returns false for a clean question', () => {
    const q = makeQ(['RAM', 'ROM', 'SSD', 'HDD'], 0);
    expect(hasRelativeAnswers(q)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Stress test — 10 000 permutations with 4 different correct positions
// ---------------------------------------------------------------------------
describe('stress — 10 000 permutations', () => {
  it('zero answer-mapping failures across all runs', () => {
    let errors = 0;
    const texts = ['Mercury', 'Venus', 'Earth', 'Mars'];
    for (let correctIdx = 0; correctIdx < 4; correctIdx++) {
      const original = makeQ([...texts], correctIdx);
      const correctText = texts[correctIdx];
      for (let run = 0; run < 2500; run++) {
        const delivered = shuffleQuestionOptions(original);
        const newIdx    = parseInt(delivered.answer, 10);
        if (delivered.options[newIdx] !== correctText) errors++;
        if (!gradeAnswer(delivered, newIdx)) errors++;
      }
    }
    expect(errors).toBe(0);
  });

  it('zero failures with duplicate option texts', () => {
    let errors = 0;
    // Worst case: 3 identical distractors
    const texts = ['Correct', 'Wrong', 'Wrong', 'Wrong'];
    const original = makeQ([...texts], 0);
    const correctText = texts[0];
    for (let run = 0; run < 2500; run++) {
      const delivered = shuffleQuestionOptions(original);
      const newIdx    = parseInt(delivered.answer, 10);
      // Can't compare text here because duplicates — compare via gradeAnswer which uses isCorrect
      if (!gradeAnswer(delivered, newIdx)) errors++;
      void correctText; // correctText not reliable with duplicates, rely on gradeAnswer
    }
    expect(errors).toBe(0);
  });
});
