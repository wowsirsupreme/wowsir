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
