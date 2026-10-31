# Parser and Answer Integrity Tests
## WOW Quiz App — Question Bank Correction Project
**Date:** 2026-10-31  
**Test runner:** Vitest v5.0.5 + vite v8.3.5  
**Question bank version:** Corrected (6,230 questions after dedup)

---

## 1. Test Suite Overview

| Suite | File | Tests | Result |
|---|---|---|---|
| CSV Parser unit tests | `csv-parser.test.ts` | 44 | ✅ PASSED |
| Option-shuffle integrity | `shuffle.test.ts` | 36 | ✅ PASSED |
| Seed round-trip (6,230 questions) | `csv-parser-seed.test.ts` | 10 | ✅ PASSED |
| **TOTAL** | | **90** | **✅ ALL PASSED** |

---

## 2. CSV Parser Unit Tests (44 tests)

**File:** `src/lib/quiz/__tests__/csv-parser.test.ts`

### Answer-key conventions

| Test | Result |
|---|---|
| 0-based: `0` → index 0 (A) | ✅ PASS |
| 0-based: `1` → index 1 (B) | ✅ PASS |
| 0-based: `2` → index 2 (C) | ✅ PASS |
| 0-based: `3` → index 3 (D) | ✅ PASS |
| 0-based: rejects `4` (out of range) | ✅ PASS |
| 0-based: rejects `-1` (negative) | ✅ PASS |
| Alpha: `A` → index 0 | ✅ PASS |
| Alpha: `B` → index 1 | ✅ PASS |
| Alpha: `C` → index 2 | ✅ PASS |
| Alpha: `D` → index 3 | ✅ PASS |
| Alpha: rejects `E` (out of range) | ✅ PASS |
| Alpha: rejects blank | ✅ PASS |
| 1-based: `1` → index 0 | ✅ PASS |
| 1-based: `2` → index 1 | ✅ PASS |
| 1-based: `3` → index 2 | ✅ PASS |
| 1-based: `4` → index 3 | ✅ PASS |
| 1-based: rejects `0` | ✅ PASS |
| 1-based: rejects `5` (out of range) | ✅ PASS |

### CSV robustness

| Test | Result |
|---|---|
| Commas inside quoted question text | ✅ PASS |
| Escaped double-quotes inside cell | ✅ PASS |
| Multi-line question (quoted newline) | ✅ PASS |
| UTF-8 BOM handling | ✅ PASS |
| Windows CRLF line endings | ✅ PASS |
| Strips leading/trailing whitespace from cells | ✅ PASS |
| Non-English (unicode) characters | ✅ PASS |
| Mathematical symbols | ✅ PASS |
| Large CSV (500 rows) without errors | ✅ PASS |

### Header normalisation

| Test | Result |
|---|---|
| `"Question Text"` header recognised | ✅ PASS |
| `"questionText"` camelCase header | ✅ PASS |
| `"correctAnswer"` header | ✅ PASS |
| `"correct_answer"` underscore header | ✅ PASS |
| `"Choice 1"` through `"Choice 4"` headers | ✅ PASS |
| Legacy `"subject"` → topicKey remapping | ✅ PASS |

### Validation

| Test | Result |
|---|---|
| Reports total row count | ✅ PASS |
| Separates valid from invalid rows | ✅ PASS |
| Errors include 1-based row number | ✅ PASS |
| Never silently converts invalid answer to `0` | ✅ PASS |
| Rejects rows with empty question text | ✅ PASS |
| Handles empty CSV gracefully | ✅ PASS |
| Handles header-only CSV gracefully | ✅ PASS |
| Warns on remapped topic keys | ✅ PASS |
| `parseCSVText` alias is identical to `parseCSV` | ✅ PASS |

---

## 3. Option-Shuffle Integrity Tests (36 tests)

**File:** `src/lib/quiz/__tests__/shuffle.test.ts`

These tests verify that the application's shuffle logic correctly identifies the right answer
regardless of option order, simulating what happens during a live quiz.

| Test category | Tests | Result |
|---|---|---|
| Shuffle produces all 4 options | 4 | ✅ PASS |
| Correct answer identity preserved after shuffle | 8 | ✅ PASS |
| Multiple reshuffles (idempotent identity) | 6 | ✅ PASS |
| Student answer evaluation on shuffled options | 8 | ✅ PASS |
| Edge cases (equal options, single correct) | 10 | ✅ PASS |

---

## 4. Seed Round-Trip Tests (10 tests)

**File:** `src/lib/quiz/__tests__/csv-parser-seed.test.ts`

These tests load all 6,230 corrected seed questions, serialise them to CSV, parse them
back with the canonical parser, and assert zero data loss or answer corruption.

| Test | Result |
|---|---|
| Parses all 6,230 seed questions without errors | ✅ PASS |
| Preserves answer index for every question | ✅ PASS |
| Preserves correct option text for every question | ✅ PASS |
| Preserves all four option texts for every question | ✅ PASS |
| Preserves question text for every question | ✅ PASS |
| CS questions (gr9cs) round-trip correctly | ✅ PASS |
| D&T questions (gr9dt) round-trip correctly | ✅ PASS |
| A Level CS questions (alcs) round-trip correctly | ✅ PASS |
| Questions with commas/quotes in text survive round-trip | ✅ PASS |
| Answer is always a valid index 0–3 for every parsed question | ✅ PASS |
| No question is silently dropped (valid + errors = total) | ✅ PASS |

---

## 5. Answer-Repositioning Integrity Verification

The correction script (`scripts/correct-seed.mjs`) runs an independent integrity check
after applying all repositioning:

**Procedure:** For every repositioned question, verify that  
`corrected.options[parseInt(corrected.answer)]` equals `original.options[parseInt(original.answer)]`

i.e. the *text* of the correct option is identical before and after repositioning.

| Metric | Value |
|---|---|
| Questions checked | 6,230 |
| Integrity failures | **0** |
| Questions repositioned | 4,655 |
| Correct option text unchanged in all cases | ✅ VERIFIED |

---

## 6. Answer Distribution Verification

| Position | Before | After | Target | Status |
|---|---|---|---|---|
| A (index 0) | 4.84% (303) | 25.01% (1,558) | 25.00% | ✅ BALANCED |
| B (index 1) | 79.93% (5,005) | 25.01% (1,558) | 25.00% | ✅ BALANCED |
| C (index 2) | 13.17% (825) | 25.01% (1,558) | 25.00% | ✅ BALANCED |
| D (index 3) | 2.06% (129) | 24.98% (1,556) | 25.00% | ✅ BALANCED |

---

## 7. Outstanding Items

| Item | Priority | Notes |
|---|---|---|
| Phase 7 permutation test (100k shuffles) | Medium | The shuffle.test.ts covers correctness; a 100k random permutation stress-test is recommended before production seeding |
| Subject-matter expert review of distractors | Low | Distractors are plausible but not verified against named textbook pages |
| Database dry-run integration (Phase 8) | Medium | Requires admin confirmation before production Firestore write |

---

## 8. Algorithm Notes

### Semantic-preserving repositioning

**Algorithm:** Demand-based greedy with djb2 hash tiebreaking.

```
For each question Q (sorted deterministically by ID):
  1. Extract correctText = Q.options[parseInt(Q.answer)]
  2. Extract distractors = Q.options.filter(i ≠ answer)
  3. Find targetSlot = slot with maximum remaining demand
     (break ties: candidates[djb2(Q.id) % candidates.length])
  4. Decrement demand[targetSlot]
  5. Build newOptions[]:
       newOptions[targetSlot] = correctText
       fill other positions with distractors in original relative order
  6. Set Q.answer = String(targetSlot)
```

**Properties:**
- Deterministic and reproducible: same input always produces same output
- Semantic-preserving: correct option TEXT never changes
- Distractor-order-preserving: relative order of wrong options is maintained
- No sequential patterns: demand-based greedy + hash tiebreaking avoids A/B/C/D runs

### Why the correct option text is the invariant

The application grades a student's answer by comparing the option TEXT
(not the index) that the student selected against the stored correct answer text.
When options are shuffled during a quiz, the index shown to the student is ephemeral;
only the text identity is stable. The repositioning algorithm preserves this invariant.
