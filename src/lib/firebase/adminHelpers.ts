'use client';

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  getDoc,
  increment,
} from 'firebase/firestore';
import { getFirebaseInstances } from './config';
import type { UserProfile } from '@/types/user';

/* ── User management ── */

export async function getAllUsers(): Promise<UserProfile[]> {
  const { fs } = getFirebaseInstances();
  if (!fs) return [];
  const snap = await getDocs(query(collection(fs, 'users'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => d.data() as UserProfile);
}

export async function getPendingTeachers(): Promise<UserProfile[]> {
  const { fs } = getFirebaseInstances();
  if (!fs) return [];
  const snap = await getDocs(
    query(collection(fs, 'users'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map(d => d.data() as UserProfile);
}

export async function approveTeacher(uid: string): Promise<void> {
  const { fs } = getFirebaseInstances();
  if (!fs) return;
  await updateDoc(doc(fs, 'users', uid), { status: 'approved' });
}

export async function suspendTeacher(uid: string): Promise<void> {
  const { fs } = getFirebaseInstances();
  if (!fs) return;
  await updateDoc(doc(fs, 'users', uid), { status: 'suspended' });
}

export async function rejectTeacher(uid: string): Promise<void> {
  const { fs } = getFirebaseInstances();
  if (!fs) return;
  // Mark as suspended (rejected) — keeps the record
  await updateDoc(doc(fs, 'users', uid), { status: 'suspended' });
}

/* ── Question stats ── */

export interface QuestionStat {
  id: string;
  text: string;
  topicKey: string;
  useCount: number;
  approvalStatus?: 'pending' | 'approved' | 'peer-approved';
  createdAt?: number;
}

export async function getTopQuestions(limitN = 50): Promise<QuestionStat[]> {
  const { fs } = getFirebaseInstances();
  if (!fs) return [];
  const snap = await getDocs(
    query(collection(fs, 'questions'), orderBy('useCount', 'desc'))
  );
  return snap.docs.slice(0, limitN).map(d => {
    const data = d.data();
    return {
      id: d.id,
      text: data.text || '',
      topicKey: data.topicKey || '',
      useCount: data.useCount || 0,
      approvalStatus: data.approvalStatus || 'pending',
      createdAt: data.createdAt,
    };
  });
}

export async function getAllQuestions(): Promise<QuestionStat[]> {
  const { fs } = getFirebaseInstances();
  if (!fs) return [];
  const snap = await getDocs(
    query(collection(fs, 'questions'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      text: data.text || '',
      topicKey: data.topicKey || '',
      useCount: data.useCount || 0,
      approvalStatus: data.approvalStatus || 'pending',
      createdAt: data.createdAt,
    };
  });
}

/* ── Usage stats ── */

export interface UsageStat {
  totalQuizzes: number;
  totalQuestions: number;
  totalTeachers: number;
  pendingTeachers: number;
  approvedTeachers: number;
  suspendedTeachers: number;
  totalSessions: number;
}

export async function getUsageStats(): Promise<UsageStat> {
  const { fs } = getFirebaseInstances();
  if (!fs) return { totalQuizzes: 0, totalQuestions: 0, totalTeachers: 0, pendingTeachers: 0, approvedTeachers: 0, suspendedTeachers: 0, totalSessions: 0 };

  const [usersSnap, quizzesSnap, questionsSnap, sessionsSnap] = await Promise.all([
    getDocs(collection(fs, 'users')),
    getDocs(collection(fs, 'quizzes')),
    getDocs(collection(fs, 'questions')),
    getDocs(collection(fs, 'sessions')).catch(() => ({ docs: [] as unknown[] })),
  ]);

  const users = usersSnap.docs.map(d => d.data() as UserProfile);
  const teachers = users.filter(u => u.role === 'teacher');

  return {
    totalQuizzes: quizzesSnap.size,
    totalQuestions: questionsSnap.size,
    totalTeachers: teachers.length,
    pendingTeachers: teachers.filter(t => t.status === 'pending').length,
    approvedTeachers: teachers.filter(t => t.status === 'approved').length,
    suspendedTeachers: teachers.filter(t => t.status === 'suspended').length,
    totalSessions: (sessionsSnap as { docs: unknown[] }).docs.length,
  };
}

/* ── Geo stats ── */

export interface GeoPoint {
  city: string;
  country: string;
  count: number;
  lat?: number;
  lng?: number;
}

export async function getGeoStats(): Promise<GeoPoint[]> {
  const { fs } = getFirebaseInstances();
  if (!fs) return [];
  const snap = await getDocs(collection(fs, 'users'));
  const users = snap.docs.map(d => d.data() as UserProfile);

  const map: Record<string, GeoPoint> = {};
  for (const u of users) {
    if (!u.city && !u.country) continue;
    const key = `${u.city || ''}|${u.country || ''}`;
    if (!map[key]) {
      map[key] = { city: u.city || '', country: u.country || '', count: 0 };
    }
    map[key].count++;
  }
  return Object.values(map).sort((a, b) => b.count - a.count);
}

/* ── Increment useCount on a question ── */

export async function incrementQuestionUseCount(questionId: string): Promise<void> {
  const { fs } = getFirebaseInstances();
  if (!fs) return;
  const ref = doc(fs, 'questions', questionId);
  try {
    await updateDoc(ref, { useCount: increment(1) });
    // Auto-approve if useCount reaches threshold
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if ((data.useCount || 0) >= 3 && data.approvalStatus !== 'approved') {
        await updateDoc(ref, { approvalStatus: 'peer-approved' });
      }
    }
  } catch {
    // Silently ignore if field doesn't exist yet
  }
}

/* ── Database reset utilities ── */

export interface ResetResult {
  deleted: number;
  errors: number;
}

/** Delete all documents in a Firestore collection (in batches) */
async function deleteCollection(colName: string): Promise<ResetResult> {
  const { fs } = getFirebaseInstances();
  if (!fs) return { deleted: 0, errors: 0 };
  const { writeBatch, doc: _doc } = await import('firebase/firestore');
  let snap: Awaited<ReturnType<typeof getDocs>>;
  try {
    snap = await getDocs(collection(fs, colName));
  } catch {
    return { deleted: 0, errors: 1 };
  }
  let deleted = 0, errors = 0;
  // Process in batches of 400
  const batchSize = 400;
  for (let i = 0; i < snap.docs.length; i += batchSize) {
    const batch = writeBatch(fs);
    snap.docs.slice(i, i + batchSize).forEach(d => batch.delete(d.ref));
    try { await batch.commit(); deleted += Math.min(batchSize, snap.docs.length - i); }
    catch { errors++; }
  }
  return { deleted, errors };
}

/** Wipe all session results from Firestore */
export async function wipeResults(): Promise<ResetResult> {
  return deleteCollection('results');
}

/** Wipe practice leaderboard entries from Firestore */
export async function wipePracticeLeaderboard(): Promise<ResetResult> {
  return deleteCollection('practiceLeaderboard');
}

/** Wipe all RTDB sessions (active/ended) */
export async function wipeRTDBSessions(): Promise<ResetResult> {
  const { db, auth } = getFirebaseInstances();
  if (!db) return { deleted: 0, errors: 0 };

  // Sign in anonymously so RTDB security rules based on auth != null pass
  try {
    if (auth && !auth.currentUser) {
      const { signInAnonymously } = await import('firebase/auth');
      await signInAnonymously(auth);
    }
  } catch { /* continue even if anonymous sign-in fails */ }

  const { ref, get, remove } = await import('firebase/database');
  let deleted = 0, errors = 0;
  const paths = ['sessions', 'sessions_questions', 'session_pub_questions', 'session_codes', 'teacher_sessions'];
  for (const path of paths) {
    try {
      const snap = await get(ref(db, path));
      if (snap.exists()) {
        // Try removing the whole node first
        try {
          await remove(ref(db, path));
          deleted++;
        } catch {
          // RTDB rules may only allow per-child writes; iterate and delete individually
          const childKeys = Object.keys(snap.val() || {});
          let anyDeleted = false;
          for (const key of childKeys) {
            try { await remove(ref(db, `${path}/${key}`)); deleted++; anyDeleted = true; }
            catch { errors++; }
          }
          if (!anyDeleted && childKeys.length > 0) errors++;
        }
      }
    } catch { errors++; }
  }
  return { deleted, errors };
}

/** Fetch ALL session results (admin — no teacher filter). */
export async function getAllSessionResults(): Promise<import('@/types/session').SessionResult[]> {
  const { fs } = getFirebaseInstances();
  if (!fs) return [];
  const { collection, getDocs } = await import('firebase/firestore');
  const snap = await getDocs(collection(fs, 'results'));
  const results = snap.docs.map(d => d.data() as import('@/types/session').SessionResult);
  return results.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

/**
 * Update (or remove) a player's entry inside a SessionResult.
 * Pass newScore to overwrite their score; pass null to remove them entirely.
 */
export async function patchSessionPlayerResult(
  sessionId: string,
  playerName: string,
  patch: { score: number } | null,
): Promise<void> {
  const { fs } = getFirebaseInstances();
  if (!fs) return;
  const { doc, getDoc, updateDoc } = await import('firebase/firestore');
  const ref = doc(fs, 'results', sessionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as import('@/types/session').SessionResult;

  let updated = data.playerResults;
  if (patch === null) {
    // Remove the player
    updated = updated.filter(p => p.name !== playerName);
  } else {
    // Update score
    updated = updated.map(p => p.name === playerName ? { ...p, score: Math.max(0, patch.score) } : p);
  }

  const totalPlayers = updated.length;
  const avgScore = totalPlayers ? updated.reduce((s, p) => s + p.score, 0) / totalPlayers : 0;
  const avgAccuracy = totalPlayers ? updated.reduce((s, p) => s + p.accuracy, 0) / totalPlayers : 0;
  const topScore = totalPlayers ? Math.max(...updated.map(p => p.score)) : 0;

  await updateDoc(ref, {
    playerResults: updated,
    'summary.totalPlayers': totalPlayers,
    'summary.avgScore': Math.round(avgScore),
    'summary.avgAccuracy': Math.round(avgAccuracy),
    'summary.topScore': topScore,
  });
}

/** Wipe ALL data — results, practice leaderboard, and RTDB sessions */
export async function wipeAllData(): Promise<{ deleted: number; errors: number }> {
  const [r1, r2, r3] = await Promise.all([
    wipeResults(),
    wipePracticeLeaderboard(),
    wipeRTDBSessions(),
  ]);
  return {
    deleted: r1.deleted + r2.deleted + r3.deleted,
    errors: (r1.errors ?? 0) + (r2.errors ?? 0) + (r3.errors ?? 0),
  };
}

/** Wipe all questions from the Firestore "questions" collection */
export async function wipeAllQuestions(): Promise<ResetResult> {
  return deleteCollection('questions');
}

/** Export a full JSON backup of all Firestore collections + RTDB root */
export async function backupDatabase(): Promise<void> {
  const { fs, db } = getFirebaseInstances();
  const backup: Record<string, unknown> = { exportedAt: new Date().toISOString() };

  // Firestore collections
  const fsCollections = ['users', 'quizzes', 'questions', 'results', 'practiceLeaderboard'];
  if (fs) {
    const { collection: col, getDocs: gd } = await import('firebase/firestore');
    for (const name of fsCollections) {
      try {
        const snap = await gd(col(fs, name));
        backup[`firestore_${name}`] = Object.fromEntries(snap.docs.map(d => [d.id, d.data()]));
      } catch { backup[`firestore_${name}`] = null; }
    }
  }

  // RTDB root
  if (db) {
    const { ref, get } = await import('firebase/database');
    try {
      const snap = await get(ref(db, '/'));
      backup['rtdb'] = snap.exists() ? snap.val() : null;
    } catch { backup['rtdb'] = null; }
  }

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wowquiz-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
