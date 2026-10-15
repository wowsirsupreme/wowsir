'use client';

import { ref, set, get, update, remove, onValue, off, type DatabaseReference } from 'firebase/database';
import { collection, doc, setDoc } from 'firebase/firestore';
import { getFirebaseInstances } from './config';
import type { LiveSession, SessionPlayer, SessionResult } from '@/types/session';
import type { Question } from '@/types/question';

function db() {
  const { db } = getFirebaseInstances();
  if (!db) throw new Error('Firebase Realtime Database not configured');
  return db;
}

function fs() {
  const { fs } = getFirebaseInstances();
  if (!fs) throw new Error('Firestore not configured');
  return fs;
}

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createSession(
  quizId: string,
  quizTitle: string,
  teacherId: string,
  questions: Question[],
  settings: LiveSession['settings'],
  closeAt?: number
): Promise<string> {
  const code = genCode();
  const sessionId = `${code.toLowerCase()}_${Date.now().toString(36)}`;

  const session: Omit<LiveSession, 'players'> = {
    id: sessionId,
    quizId,
    quizTitle,
    teacherId,
    code,
    status: 'lobby',
    currentQ: 0,
    totalQ: questions.length,
    question: null,
    settings,
    ...(closeAt ? { closeAt } : {}),
  };

  // Store full questions (with answers) in a secured path (teacher/admin only)
  await set(ref(db(), `sessions/${sessionId}/meta`), session);
  if (questions.length > 0) {
    await set(ref(db(), `sessions_questions/${sessionId}`), questions);
    // Store publicly-readable questions (answers included — students self-score locally)
    await set(ref(db(), `session_pub_questions/${sessionId}`), questions);
  }
  // Register code → sessionId index for student lookup
  await set(ref(db(), `session_codes/${code}`), sessionId);
  // Register under teacher's active sessions index for quick lookup on quizzes page
  await set(ref(db(), `teacher_sessions/${teacherId}/${sessionId}`), { quizId, code, createdAt: Date.now() });

  return sessionId;
}

// Strip answer from question before broadcasting to students
function stripAnswer(q: Question): Partial<Question> {
  const { answer: _a, explanation: _e, ...safe } = q;
  return safe;
}

export async function startSession(sessionId: string, questions: Question[]): Promise<void> {
  await update(ref(db(), `sessions/${sessionId}/meta`), {
    status: 'active',
    currentQ: 0,
    startedAt: Date.now(),
    question: stripAnswer(questions[0]),
  });
}

export async function nextQuestion(sessionId: string, qIndex: number, questions: Question[]): Promise<void> {
  if (qIndex >= questions.length) {
    await endSession(sessionId);
    return;
  }
  await update(ref(db(), `sessions/${sessionId}/meta`), {
    currentQ: qIndex,
    question: stripAnswer(questions[qIndex]),
    status: 'active',
  });
}

export async function pauseSession(sessionId: string, paused: boolean): Promise<void> {
  await update(ref(db(), `sessions/${sessionId}/meta`), {
    status: paused ? 'paused' : 'active',
  });
}

export async function endSession(sessionId: string): Promise<void> {
  await update(ref(db(), `sessions/${sessionId}/meta`), {
    status: 'ended',
    endedAt: Date.now(),
    question: null,
  });
}

export async function joinSession(
  sessionId: string,
  name: string,
  avatarId: number
): Promise<string> {
  // Use a stable player id stored in sessionStorage so page refreshes keep same id
  let playerId: string;
  try {
    playerId = sessionStorage.getItem(`playerId_${sessionId}`) || '';
  } catch { playerId = ''; }
  if (!playerId) {
    playerId = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    try { sessionStorage.setItem(`playerId_${sessionId}`, playerId); } catch {}
  }

  const playerData: SessionPlayer = {
    id: playerId,
    name,
    avatarId,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    total: 0,
    tabSwitches: 0,
    windowResizes: 0,
    lastSeen: Date.now(),
    answers: {},
  };
  await set(ref(db(), `sessions/${sessionId}/players/${playerId}`), playerData);
  return playerId;
}

export async function submitAnswer(
  sessionId: string,
  playerId: string,
  qIndex: number,
  choice: number | string,
  isCorrect: boolean,
  scoreEarned: number,
  timeMs: number
): Promise<void> {
  const playerRef = ref(db(), `sessions/${sessionId}/players/${playerId}`);
  const snap = await get(playerRef);
  const player: SessionPlayer = snap.val();
  if (!player) return;

  const newStreak = isCorrect ? player.streak + 1 : 0;
  const newBest = Math.max(player.bestStreak, newStreak);

  await update(playerRef, {
    score: player.score + scoreEarned,
    streak: newStreak,
    bestStreak: newBest,
    correct: player.correct + (isCorrect ? 1 : 0),
    total: player.total + 1,
    lastSeen: Date.now(),
    [`answers/${qIndex}`]: { choice, correct: isCorrect, timeMs },
  });
}

export async function reportTabSwitch(sessionId: string, playerId: string, qIndex?: number): Promise<void> {
  const playerRef = ref(db(), `sessions/${sessionId}/players/${playerId}`);
  const snap = await get(playerRef);
  if (snap.exists()) {
    const player: SessionPlayer = snap.val();
    const updates: Record<string, unknown> = { tabSwitches: (player.tabSwitches || 0) + 1 };
    if (qIndex !== undefined) {
      const byQ = player.tabSwitchesByQ || {};
      updates[`tabSwitchesByQ/${qIndex}`] = (byQ[qIndex] || 0) + 1;
    }
    await update(playerRef, updates);
  }
}

export async function getSessionPublicQuestions(sessionId: string): Promise<Question[] | null> {
  const snap = await get(ref(db(), `session_pub_questions/${sessionId}`));
  if (!snap.exists()) return null;
  return snap.val() as Question[];
}

export async function updateSessionCloseAt(sessionId: string, closeAt: number | null): Promise<void> {
  await update(ref(db(), `sessions/${sessionId}/meta`), { closeAt: closeAt ?? null });
}

export async function findSessionByCode(code: string): Promise<{ sessionId: string; session: LiveSession } | null> {
  // In RTDB we'd need to query — since codes are unique, we store a code→sessionId index
  const snap = await get(ref(db(), `session_codes/${code.toUpperCase()}`));
  if (!snap.exists()) return null;
  const sessionId: string = snap.val();
  const sessSnap = await get(ref(db(), `sessions/${sessionId}/meta`));
  if (!sessSnap.exists()) return null;
  return { sessionId, session: sessSnap.val() as LiveSession };
}

export async function registerSessionCode(code: string, sessionId: string): Promise<void> {
  await set(ref(db(), `session_codes/${code.toUpperCase()}`), sessionId);
}

export function listenSession(sessionId: string, cb: (session: LiveSession | null) => void): () => void {
  const r = ref(db(), `sessions/${sessionId}/meta`);
  onValue(r, snap => cb(snap.exists() ? snap.val() as LiveSession : null));
  return () => off(r);
}

export function listenPlayers(sessionId: string, cb: (players: Record<string, SessionPlayer>) => void): () => void {
  const r = ref(db(), `sessions/${sessionId}/players`);
  onValue(r, snap => cb(snap.exists() ? snap.val() as Record<string, SessionPlayer> : {}));
  return () => off(r);
}

export async function saveSessionResult(result: SessionResult): Promise<void> {
  await setDoc(doc(fs(), 'results', result.id), result);
}

export async function getResultsByTeacher(teacherId: string): Promise<SessionResult[]> {
  const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
  try {
    const q = query(
      collection(fs(), 'results'),
      where('teacherId', '==', teacherId),
      orderBy('completedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as SessionResult);
  } catch {
    // Fallback: fetch without ordering (composite index may not exist yet)
    const q = query(collection(fs(), 'results'), where('teacherId', '==', teacherId));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => d.data() as SessionResult)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }
}

export async function getResultsByQuiz(quizId: string): Promise<SessionResult[]> {
  const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
  try {
    const q = query(
      collection(fs(), 'results'),
      where('quizId', '==', quizId),
      orderBy('completedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as SessionResult);
  } catch {
    const q = query(collection(fs(), 'results'), where('quizId', '==', quizId));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => d.data() as SessionResult)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }
}

// ── Teacher session index ─────────────────────────────────────────────────────

/** Remove a session from the teacher's active-session index (call on end/complete) */
export async function clearTeacherSession(teacherId: string, sessionId: string): Promise<void> {
  try {
    await remove(ref(db(), `teacher_sessions/${teacherId}/${sessionId}`));
  } catch { /* best-effort */ }
}

export interface TeacherActiveSession {
  sessionId: string;
  quizId: string;
  code: string;
  session: LiveSession;
  playerCount: number;
}

/**
 * Check if a teacher already has an active (non-ended) session for a specific quiz.
 * Returns the sessionId + code if one exists, or null.
 */
export async function findActiveSessionForQuiz(
  teacherId: string,
  quizId: string
): Promise<{ sessionId: string; code: string } | null> {
  const snap = await get(ref(db(), `teacher_sessions/${teacherId}`));
  if (!snap.exists()) return null;

  const entries = snap.val() as Record<string, { quizId: string; code: string }>;
  for (const [sessionId, entry] of Object.entries(entries)) {
    if (entry.quizId !== quizId) continue;
    // Verify it's still active in RTDB
    try {
      const metaSnap = await get(ref(db(), `sessions/${sessionId}/meta`));
      if (!metaSnap.exists()) continue;
      const meta = metaSnap.val() as { status?: string; code?: string };
      if (meta.status && meta.status !== 'ended') {
        return { sessionId, code: meta.code || entry.code };
      }
    } catch { /* skip */ }
  }
  return null;
}

/** Return all non-ended sessions for a teacher, enriched with live meta */
export async function getTeacherActiveSessions(teacherId: string): Promise<TeacherActiveSession[]> {
  const snap = await get(ref(db(), `teacher_sessions/${teacherId}`));
  if (!snap.exists()) return [];

  const entries = snap.val() as Record<string, { quizId: string; code: string; createdAt?: number }>;
  const results: TeacherActiveSession[] = [];

  await Promise.all(
    Object.entries(entries).map(async ([sessionId, { quizId, code }]) => {
      try {
        const [metaSnap, playersSnap] = await Promise.all([
          get(ref(db(), `sessions/${sessionId}/meta`)),
          get(ref(db(), `sessions/${sessionId}/players`)),
        ]);
        if (!metaSnap.exists()) return;
        const session = metaSnap.val() as LiveSession;
        if (session.status === 'ended') return;
        const playerCount = playersSnap.exists() ? Object.keys(playersSnap.val()).length : 0;
        results.push({ sessionId, quizId, code: session.code || code, session, playerCount });
      } catch { /* skip broken entries */ }
    })
  );

  return results.sort((a, b) => (b.session.startedAt ?? 0) - (a.session.startedAt ?? 0));
}
