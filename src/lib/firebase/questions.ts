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

export async function getQuestionsByTopic(
  topicKey: string,
  includeStatuses: Array<'approved' | 'pending'> = ['approved'],
): Promise<Question[]> {
  // Query only on topicKey — no composite index needed.
  // Filter by approvalStatus client-side (fine for typical question-bank sizes).
  const snap = await getDocs(
    query(collection(fs(), 'questions'), where('topicKey', '==', topicKey))
  );
  const statusSet = new Set<string>(includeStatuses);
  return snap.docs
    .map(d => ({ ...d.data(), id: d.id } as Question))
    .filter(q => statusSet.has(q.approvalStatus))
    .sort((a, b) => {
      const ta = (a as { createdAt?: { seconds?: number } }).createdAt?.seconds ?? 0;
      const tb = (b as { createdAt?: { seconds?: number } }).createdAt?.seconds ?? 0;
      return ta - tb;
    });
}

/** Returns all questions for a topic regardless of approval status */
export async function getAllQuestionsByTopic(topicKey: string): Promise<Question[]> {
  return getQuestionsByTopic(topicKey, ['approved', 'pending']);
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

/** Fetch the current Firestore state of specific questions by their IDs.
 *  Returns questions in the same order as the input ids array. */
export async function getQuestionsByIds(ids: string[]): Promise<Question[]> {
  if (ids.length === 0) return [];
  // Firestore 'in' queries support up to 30 items per call
  const CHUNK = 30;
  const results: Question[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const q = query(collection(fs(), 'questions'), where('__name__', 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach(d => results.push({ ...d.data(), id: d.id } as Question));
  }
  // Re-order to match input order
  const map = new Map(results.map(q => [q.id!, q]));
  return ids.map(id => map.get(id)).filter(Boolean) as Question[];
}

export async function saveQuestion(question: Omit<Question, 'id'> & { id?: string }): Promise<string> {
  const ref = question.id ? doc(fs(), 'questions', question.id) : doc(collection(fs(), 'questions'));
  await setDoc(ref, { ...question, id: ref.id });
  return ref.id;
}

export async function deleteQuestion(id: string): Promise<void> {
  await deleteDoc(doc(fs(), 'questions', id));
}

export async function deleteQuestionsByTopic(topicKey: string): Promise<{ deleted: number; errors: number }> {
  const snap = await getDocs(query(collection(fs(), 'questions'), where('topicKey', '==', topicKey)));
  let deleted = 0, errors = 0;
  const batchSize = 400;
  for (let i = 0; i < snap.docs.length; i += batchSize) {
    const batch = writeBatch(fs());
    snap.docs.slice(i, i + batchSize).forEach(d => batch.delete(d.ref));
    try { await batch.commit(); deleted += Math.min(batchSize, snap.docs.length - i); }
    catch { errors++; }
  }
  return { deleted, errors };
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

/** Normalise question text for duplicate detection: lowercase + collapse whitespace */
function normaliseText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Check for exact-text duplicates across the given topic keys.
 * Returns a Set of normalised question texts that already exist (approved or pending).
 */
export async function getExistingQuestionTexts(topicKeys: string[]): Promise<Set<string>> {
  const results = await Promise.all(
    topicKeys.map(key =>
      getDocs(query(collection(fs(), 'questions'), where('topicKey', '==', key)))
    )
  );
  const existing = new Set<string>();
  for (const snap of results) {
    for (const d of snap.docs) {
      const text = (d.data() as { text?: string }).text;
      if (text) existing.add(normaliseText(text));
    }
  }
  return existing;
}

/** Save a question only if its text doesn't already exist in the topic.
 *  Returns { saved: true, id } or { saved: false, reason: 'duplicate' } */
export async function saveQuestionDeduped(
  question: Omit<Question, 'id'> & { id?: string }
): Promise<{ saved: boolean; id?: string; reason?: string }> {
  const existing = await getExistingQuestionTexts([question.topicKey]);
  if (existing.has(normaliseText(question.text))) {
    return { saved: false, reason: 'duplicate' };
  }
  const id = await saveQuestion(question);
  return { saved: true, id };
}
