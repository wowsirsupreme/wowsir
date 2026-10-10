'use client';

import {
  collection, doc, getDocs, getDoc, setDoc, deleteDoc,
  query, where,
} from 'firebase/firestore';
import { getFirebaseInstances } from './config';
import type { Quiz } from '@/types/quiz';

function fs() {
  const { fs } = getFirebaseInstances();
  if (!fs) throw new Error('Firebase not configured');
  return fs;
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
  await deleteDoc(doc(fs(), 'quizzes', id));
}
