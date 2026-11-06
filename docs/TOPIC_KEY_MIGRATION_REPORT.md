# Topic Key Migration Report
**WOW Sir — Study Corner · DPS International Ghana**
*Migration date: November 2026*

---

## Summary

This report documents the topicKey corrections applied across all seed CSV files
and the class consolidation that merged IGCSE CS 0478 from two classes into one.

---

## 1. Class Consolidation (studyClasses.ts + studyContent.ts)

### Problem
IGCSE CS 0478 was split into two separate classes:
- `gr9-cs` (label "Grade 9 CS") — 15 chapters, Year 1 only
- `gr10-cs` (label "Grade 10 CS") — 13 chapters, Year 2 only

A teacher had to select two different classes to access the full syllabus.

### Fix
- Removed `gr10-cs` from the `CLASSES` array entirely
- Renamed `GRADE10CS_CHAPTERS` → `IGCSE_CS_YEAR2_CHAPTERS` (chapter titles updated to Ch 16–28)
- Created `IGCSE_CS_0478_CHAPTERS = [...GRADE9CS_CHAPTERS, ...IGCSE_CS_YEAR2_CHAPTERS]` (28 chapters)
- `gr9-cs` now maps to the full 28-chapter array; label changed to "CS", grade to "IGCSE"
- `gr10-cs` kept as a backward-compat alias in `GRADE_CHAPTERS` only

### Label Changes (studyClasses.ts)
| classId | Before | After |
|---|---|---|
| gr8-cs | Grade 8 CS | ICT |
| gr9-cs | Grade 9 CS | CS |
| gr9-dt | Grade 9 DT | DT |
| gr11-cs | Grade 11 CS | A Level CS |
| gr10-cs | Grade 10 CS | *(removed from CLASSES)* |

---

## 2. Seed CSV Migrations

### 9618_cs_grade11_mcq.csv (84 questions)

**Root cause:** Seed generated with `gr11-*` namespace for A Level CS questions,
but the A Level CS class (`gr11-cs`) uses the `alcs-*` namespace.

| Old topicKey | Questions | New topicKey | Notes |
|---|---|---|---|
| gr11-information | 7 | alcs-data-rep | |
| gr11-communication | 7 | alcs-communication | |
| gr11-hardware | 5 | alcs-hardware | |
| gr11-processor | 7 | alcs-processor | |
| gr11-os | 6 | alcs-system-software | |
| gr11-security | 5 | alcs-security | |
| gr11-ai-advanced | 6 | alcs-ai | |
| gr11-programming | 5 | alcs-programming | |
| gr11-oop | 6 | alcs-programming | Merged — OOP is part of Ch 11 |
| gr11-data-structures | 6 | alcs-data-structures | |
| gr11-algorithms | 5 | alcs-algorithms | |
| gr11-databases | 6 | alcs-databases | |
| gr11-system-software | 6 | alcs-system-software | Merged with gr11-os |
| gr11-logic | 7 | alcs-hardware | Merged — logic gates covered in Ch 3 |

**Result:** 84 questions, all keys valid. Final distribution: alcs-hardware (12), alcs-system-software (12), alcs-programming (11), alcs-data-rep (7), alcs-communication (7), alcs-processor (7), alcs-ai (6), alcs-data-structures (6), alcs-databases (6), alcs-security (5), alcs-algorithms (5).

---

### 9705_dt_mcq.csv (57 questions)

| Old topicKey | New topicKey |
|---|---|
| gr9dt-communication | gr9dt-communicating |
| gr9dt-making | gr9dt-gp-making |
| gr9dt-plan | gr9dt-developing |

**Result:** 57 questions, all keys valid.

---

### 0445_dt_mcq.csv (50 questions)

Already had correct topicKeys after earlier session fix. No changes required.
All 50 questions use valid gr9dt-* keys.

---

### 0478_cs_data_rep_mcq.csv (96 questions)

| Old topicKey | Questions | New topicKey |
|---|---|---|
| gr9-data-binary | ~18 | gr9-number-systems |
| gr9-data-text | ~10 | gr9-text-sound-images |
| gr9-data-images | ~10 | gr9-text-sound-images |
| gr9-data-sound | ~10 | gr9-text-sound-images |
| gr9-data-compression | ~17 | gr9-compression |
| gr9-data-twos | ~11 | gr9-data-rep |

**Result:** 96 questions, all keys valid. Final: gr9-number-systems (30), gr9-text-sound-images (30), gr9-data-rep (19), gr9-compression (17).

---

### 0478_cs_grade10_mcq.csv (114 questions)

| Old topicKey | New topicKey | Rationale |
|---|---|---|
| gr10-abstraction | gr10-algorithms | Abstraction is part of algorithm design |
| gr10-algorithms-adv | gr10-algorithms | Same chapter |
| gr10-system-analysis | gr10-algorithms | Systems analysis overlaps algorithm design |
| gr10-boolean | gr9-logic | Boolean algebra covered in Ch 13 (logic gates) |
| gr10-encryption | gr11-security | Encryption is in Ch 22 |
| gr10-python-adv | gr10-programming | Further programming in Ch 21 |
| gr10-sensors | gr10-robotics | Sensors are part of Ch 18 robotics |
| gr10-sql | gr11-databases | SQL is in Ch 25 |

**Result:** 114 questions, all keys valid. Final: gr10-algorithms (28), gr10-programming (16), gr10-robotics (15), gr10-data-integrity (8), gr10-cybersecurity (8), gr11-security (8), gr9-logic (8), gr10-ai (8), gr11-databases (8), gr10-quantum (7).

---

### 0478_cs_networking_logic_mcq.csv (89 questions)

| Old topicKey | New topicKey |
|---|---|
| gr9-internet | gr9-networks |
| gr9-networking | gr9-networks |

**Result:** 89 questions, all keys valid. Final: gr9-networks (40), gr9-logic (15), gr9-programming (14), gr9-algorithms (12), gr9-cybersec (8).

---

### 0417_ict_gr8_mcq.csv (67 questions)

No changes needed. All 67 questions already used valid `gr8-ch*` topicKeys.

---

## 3. Backward Compatibility

| Concern | Resolution |
|---|---|
| Students who had bookmarked `/study/gr10-cs/...` | GRADE_CHAPTERS['gr10-cs'] maps to the full 28-chapter array; content loads |
| Questions in Firestore with gr10-cs classId | The chapters remain accessible; no Firestore migration needed |
| Practice test IDs like `gr10cs-pt1` | Added as aliases in GRADE_PRACTICE_TESTS['gr10-cs'] |

---

## 4. Files Changed

```
src/data/studyClasses.ts         ← class labels, removed gr10-cs entry
src/data/studyContent.ts         ← chapter arrays, GRADE_CHAPTERS, GRADE_PRACTICE_TESTS
scripts/seed/9618_cs_grade11_mcq.csv
scripts/seed/9705_dt_mcq.csv
scripts/seed/0445_dt_mcq.csv
scripts/seed/0478_cs_data_rep_mcq.csv
scripts/seed/0478_cs_grade10_mcq.csv
scripts/seed/0478_cs_networking_logic_mcq.csv
```

Git commit: `1ea7444` on branch `main`.
