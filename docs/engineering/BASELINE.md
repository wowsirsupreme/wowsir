# WOW Sir — Engineering Baseline
**Date:** 2026-10-15  
**Status:** VERIFIED (from live repository inspection)

---

## 1. Tech Stack

| Layer | Version | Status |
|---|---|---|
| Next.js (App Router) | 16.3.8 | VERIFIED |
| React | 19.2.8 | VERIFIED |
| TypeScript | 5.x | VERIFIED |
| Tailwind CSS | v4 | VERIFIED |
| Firebase SDK | 12.19.0 | VERIFIED |
| Firestore | - | VERIFIED |
| Firebase RTDB | - | VERIFIED |
| Vercel | - | VERIFIED (deployment target) |

---

## 2. Route Inventory

| Route | Role | Purpose |
|---|---|---|
| `/` | Public | Landing page |
| `/admin` | Admin (password) | Admin dashboard (approvals, teachers, usage, geography, question quality) |
| `/battle` | Student | Battle Mode lobby |
| `/battle/[code]` | Student | Join battle session |
| `/battle/leaderboard/[quizId]` | Student | Battle leaderboard |
| `/battle/match/[battleId]` | Student | Live 1v1 battle |
| `/hotseat` | Student | Hot Seat game mode |
| `/join` | Student | Join a hosted quiz by code |
| `/play/[code]` | Student | Live hosted quiz player |
| `/practice` | Student | Practice mode selector |
| `/practice/custom` | Student | Custom practice quiz |
| `/practice/quiz/[presetId]` | Student | Preset quiz practice |
| `/study` | Student | Study Corner |
| `/study/[classId]/[mode]` | Student | Chapter quiz / flashcards |
| `/study/[classId]/resources` | Student | Chapter resources |
| `/teacher` | Teacher | Teacher dashboard (papers, quick actions) |
| `/teacher/assessment/new` | Teacher | Paper builder |
| `/teacher/host/[id]` | Teacher | Host a live quiz session |
| `/teacher/import` | Teacher | CSV question importer |
| `/teacher/library` | Teacher | Question bank (browse, approve, add) |
| `/teacher/quiz/new` | Teacher | Quiz builder |
| `/teacher/quizzes` | Teacher | My quizzes list |
| `/teacher/results` | Teacher | Results overview (all quizzes) |
| `/teacher/results/[id]` | Teacher | Results for specific session |
| `/seed` | Dev | Seed questions (dev only) |

---

## 3. Firebase Architecture

### Firestore Collections
| Collection | Purpose | Key Fields |
|---|---|---|
| `users` | Teacher profiles, roles | `uid`, `role`, `status` (pending/approved/suspended) |
| `questions` | Question bank | `topicKey`, `type`, `approvalStatus`, `quizId` (null = bank) |
| `quizzes` | Quiz definitions | `teacherId`, `title`, `questionIds` |
| `presetQuizzes` | Admin-preset quizzes | `isActive`, `gradeKey` |
| `results` | Session results | `sessionCode`, `quizId`, `scores` |
| `practiceLeaderboard` | Practice mode scores | `name`, `score`, `gradeKey` |

### Realtime Database Paths
| Path | Purpose |
|---|---|
| `sessions/{id}/meta` | Session state (phase, currentQ, timer) |
| `sessions/{id}/players` | Connected players |
| `sessions_questions/{id}` | Questions loaded for session |
| `session_codes/{code}` | Code → sessionId mapping |
| `session_pub_questions/{id}` | Publicly visible session questions |
| `teacher_sessions/{teacherId}` | Teacher's active sessions |
| `battle_lobby/{code}` | Battle matchmaking |
| `battles/{battleId}` | Live battle state |
| `battle_invites/{playerId}` | Battle invitations |

---

## 4. Question Schema (Canonical)

```typescript
interface Question {
  id: string;
  quizId: string | null;        // null = topic bank
  topicKey: string;
  type: 'mcq' | 'truefalse' | 'shortanswer' | 'fillinblank' | 'matching' | 'ordering';
  text: string;
  options: string[];
  answer: string;
  explanation?: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  source?: 'builtin' | 'imported' | 'manual';
  points: number;
  createdAt?: number;
  // Extended metadata
  grade?: 4|5|6|7|8|9|10|11;
  subject?: string;
  chapter?: number;
  chapterTitle?: string;
  term?: 1|2|3;
  week?: number;
  learningObjective?: string;
  cognitiveLevel?: 'recall'|'understanding'|'application'|'analysis';
  updatedAt?: number;
}
```

---

## 5. Paper Persistence

**Current:** localStorage only  
- Index: `assessments_index` (array of IDs)  
- Data: `assessment_{id}` (full paper JSON)  
**Status:** VERIFIED — cloud persistence DEFERRED (Part K, §34)

Note: The master prompt references `wq_papers_v2` as localStorage key, but the **actual implementation** uses `assessments_index` + `assessment_{id}`. The master prompt inventory description is AUDIT-REPORTED (not yet verified against live code from that source).

---

## 6. Security Review (Quick Baseline)

### Firestore Rules
| Rule | Status | Notes |
|---|---|---|
| Users: own-profile only | VERIFIED | Correct |
| Questions: auth-gated read | PARTIALLY VERIFIED | All authenticated users can read — pending questions visible to students who query without filter |
| Questions: teacher write | VERIFIED | Role-checked via `get()` |
| Quizzes: owner-only write | VERIFIED | Correct |
| Results: any-auth read/write | VERIFIED — **RISK** | Students can forge results (no server validation) |
| practiceLeaderboard: public write | VERIFIED — **RISK** | Any unauthenticated user can submit scores |

### RTDB Rules
| Rule | Status | Notes |
|---|---|---|
| sessions/meta: public read | VERIFIED | Acceptable |
| sessions/players: public write | VERIFIED | Players write own data — no field validation |
| battle_lobby: public read+write | VERIFIED — **RISK** | Anyone can manipulate battle state |
| battles/scores: per-player write | VERIFIED — **RISK** | No server validation of scores |

### Critical Findings
1. **RISK**: Practice leaderboard accepts unauthenticated writes with minimal validation
2. **RISK**: Battle scores written by client with no server verification
3. **RISK**: `results` collection allows any auth user to write scores (students can inflate)
4. **RISK**: Admin auth is client-side hardcoded password (`wowadmin2024`) — no server-side protection

---

## 7. Phase A Completion Status

| Item | Status |
|---|---|
| CSV import supports all 6 types | IMPLEMENTED |
| Duplicate detection on import | IMPLEMENTED |
| Imported questions visible in Quiz Builder | IMPLEMENTED |
| Add Question form in Question Bank | IMPLEMENTED |
| Type badge shows all 6 types | IMPLEMENTED |
| Paper deletion | IMPLEMENTED |
| Duplicate active session guard | NOT STARTED |
| Tab switch count recording | NOT STARTED |
| Admin database reset feature | NOT STARTED |

---

## 8. Known Missing Indexes

The questions collection uses per-status separate queries (workaround implemented in `getQuestionsByTopic`) to avoid needing a composite index on `(topicKey, approvalStatus)`. This is a deliberate client-side merge approach.

Additional indexes likely needed for future features:
- `questions`: `(grade, chapter, approvalStatus)` for filtered Browse All
- `results`: `(quizId, sessionCode)` for results lookup
- `battle_results` (RTDB): ordering by completion time

---

*Generated by Claude Sonnet 4.6 — 2026-10-15*
