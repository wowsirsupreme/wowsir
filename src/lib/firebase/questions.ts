'use client';

import {
  collection, doc, getDocs, getDoc, setDoc, deleteDoc,
  query, where, orderBy, writeBatch, type Firestore,
} from 'firebase/firestore';
import { getFirebaseInstances } from './config';
import type { Question } from '@/types/question';

function fs(): Firestore {
  const { fs } = getFirebaseInstances();
  if (!fs) throw new Error('Firebase not configured');
  return fs;
}

export async function getQuestionsByTopic(topicKey: string): Promise<Question[]> {
  const q = query(
    collection(fs(), 'questions'),
    where('topicKey', '==', topicKey),
    where('approvalStatus', '==', 'approved'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Question));
}

export async function getRandomQuestions(topicKey: string, count: number): Promise<Question[]> {
  const all = await getQuestionsByTopic(topicKey);
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export async function getQuestionsByQuiz(quizId: string): Promise<Question[]> {
  const q = query(collection(fs(), 'questions'), where('quizId', '==', quizId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Question));
}

export async function saveQuestion(question: Omit<Question, 'id'> & { id?: string }): Promise<string> {
  const ref = question.id ? doc(fs(), 'questions', question.id) : doc(collection(fs(), 'questions'));
  await setDoc(ref, { ...question, id: ref.id });
  return ref.id;
}

export async function deleteQuestion(id: string): Promise<void> {
  await deleteDoc(doc(fs(), 'questions', id));
}

export async function batchSaveQuestions(questions: Omit<Question, 'id'>[]): Promise<string[]> {
  const fsDb = fs();
  const ids: string[] = [];
  // Firestore batch limit = 500
  for (let i = 0; i < questions.length; i += 400) {
    const chunk = questions.slice(i, i + 400);
    const batch = writeBatch(fsDb);
    for (const q of chunk) {
      const ref = doc(collection(fsDb, 'questions'));
      batch.set(ref, { ...q, id: ref.id });
      ids.push(ref.id);
    }
    await batch.commit();
  }
  return ids;
}

export async function getPendingQuestions(): Promise<Question[]> {
  const q = query(
    collection(fs(), 'questions'),
    where('approvalStatus', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Question));
}

export async function updateApprovalStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  await setDoc(doc(fs(), 'questions', id), { approvalStatus: status }, { merge: true });
}

export async function updateQuestion(
  id: string,
  data: Partial<import('@/types/question').Question>
): Promise<void> {
  const { updateDoc, doc } = await import('firebase/firestore');
  await updateDoc(doc(fs(), 'questions', id), data as Record<string, unknown>);
}
