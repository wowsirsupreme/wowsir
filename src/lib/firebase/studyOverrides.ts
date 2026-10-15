/**
 * Study Corner overrides — teachers can edit keywords and notes per chapter.
 * Stored in Firestore at studyOverrides/{chapterKey}
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseInstances } from './config';

export interface StudyKeyword {
  term: string;
  definition: string;
}

export interface StudyOverride {
  keywords?: StudyKeyword[];
  notes?: string[];
  updatedAt?: number;
  updatedBy?: string;
}

/** Fetch the teacher override for a chapter (returns null if none exists) */
export async function getStudyOverride(chapterKey: string): Promise<StudyOverride | null> {
  const { fs } = getFirebaseInstances();
  if (!fs) return null;
  const snap = await getDoc(doc(fs, 'studyOverrides', chapterKey));
  if (!snap.exists()) return null;
  return snap.data() as StudyOverride;
}

/** Save (overwrite) the override for a chapter */
export async function saveStudyOverride(
  chapterKey: string,
  data: StudyOverride,
  teacherUid: string,
): Promise<void> {
  const { fs } = getFirebaseInstances();
  if (!fs) throw new Error('Firestore not initialised');
  await setDoc(doc(fs, 'studyOverrides', chapterKey), {
    ...data,
    updatedBy: teacherUid,
    updatedAt: Date.now(),
  });
}
