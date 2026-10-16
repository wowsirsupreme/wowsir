'use client';

import {
  collection, doc, getDocs, getDoc, setDoc, deleteDoc,
  query, where,
} from 'firebase/firestore';
import { ref, remove, get } from 'firebase/database';
import { getFirebaseInstances } from './config';
import type { Quiz } from '@/types/quiz';

function fs() {
  const { fs } = getFirebaseInstances();
  if (!fs) throw new Error('Firebase not configured');
  return fs;
}

function db() {
  const { db } = getFirebaseInstances();
  if (!db) throw new Error('Firebase Realtime Database not configured');
  return db;
}

export async function getTeacherQuizzes(teacherId: string): Promise<Quiz[]> {
  // Avoid composite index requirement by filtering only on teacherId,
  // then sorting client-side.
  const q = query(
    collection(fs(), 'quizzes'),
    where('teacherId', '==', teacherId),
  );
  const snap = await getDocs(q);
  const quizzes = snap.docs.map(d => ({ ...d.data(), id: d.id } as Quiz));
  // Sort newest first client-side — no composite index needed
  return quizzes.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  const snap = await getDoc(doc(fs(), 'quizzes', id));
  return snap.exists() ? ({ ...snap.data(), id: snap.id } as Quiz) : null;
}

export async function saveQuiz(quiz: Omit<Quiz, 'id'> & { id?: string }): Promise<string> {
  const ref = quiz.id ? doc(fs(), 'quizzes', quiz.id) : doc(collection(fs(), 'quizzes'));
  await setDoc(ref, { ...quiz, id: ref.id, updatedAt: Date.now() });
  return ref.id;
}

export async function deleteQuiz(id: string): Promise<void> {
  // Delete quiz document from Firestore
  await deleteDoc(doc(fs(), 'quizzes', id));

  // Cascade: delete all sessions in Realtime DB associated with this quiz.
  // Sessions are stored under sessions/<sessionId>/meta with a quizId field,
  // and indexed under teacher_sessions. We look up by scanning teacher_sessions
  // and session_codes to find all sessions for this quiz, then remove them.
  try {
    const rtdb = db();

    // Find all sessions referencing this quizId by querying teacher_sessions index
    // (teacher_sessions/<teacherId>/<sessionId> → { quizId, code })
    // We don't have the teacherId here, so scan all teacher_sessions children.
    const teacherSessionsSnap = await get(ref(rtdb, 'teacher_sessions'));
    const deletionPromises: Promise<void>[] = [];

    if (teacherSessionsSnap.exists()) {
      teacherSessionsSnap.forEach(teacherSnap => {
        teacherSnap.forEach(sessionSnap => {
          const data = sessionSnap.val() as { quizId?: string; code?: string } | null;
          if (data?.quizId === id) {
            const sessionId = sessionSnap.key!;
            const code = data.code;
            // Remove session data from all paths
            deletionPromises.push(remove(ref(rtdb, `sessions/${sessionId}`)));
            deletionPromises.push(remove(ref(rtdb, `sessions_questions/${sessionId}`)));
            deletionPromises.push(remove(ref(rtdb, `session_pub_questions/${sessionId}`)));
            if (code) {
              deletionPromises.push(remove(ref(rtdb, `session_codes/${code}`)));
            }
            deletionPromises.push(remove(ref(rtdb, `teacher_sessions/${teacherSnap.key}/${sessionId}`)));
          }
        });
      });
    }

    await Promise.all(deletionPromises);
  } catch {
    // Non-fatal: Realtime DB cleanup failure shouldn't block quiz deletion
    console.warn('deleteQuiz: failed to clean up sessions for quiz', id);
  }
}
