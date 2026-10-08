'use client';

import {
  collection, doc, getDocs, getDoc, setDoc, deleteDoc,
  query, where, orderBy,
} from 'firebase/firestore';
import { getFirebaseInstances } from './config';
import type { Quiz } from '@/types/quiz';

function fs() {
  const { fs } = getFirebaseInstances();
  if (!fs) throw new Error('Firebase not configured');
  return fs;
}

export async function getTeacherQuizzes(teacherId: string): Promise<Quiz[]> {
  const q = query(
    collection(fs(), 'quizzes'),
    where('teacherId', '==', teacherId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Quiz));
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
