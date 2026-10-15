/**
 * Study Corner overrides — teachers can edit keywords and notes per chapter.
 * Stored in Firestore at studyOverrides/{chapterKey}
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseInstances } from './config';

export interface StudyKeyword {
  term: string;
  definition: string;
  imageUrl?: string;   // optional image shown on the card / flashcard back
}

export interface StudyNote {
  text: string;
  imageUrl?: string;   // optional illustration for this note
}

export interface StudyOverride {
  keywords?: StudyKeyword[];
  notes?: StudyNote[];   // was string[] — legacy strings are normalised on read
  updatedAt?: number;
  updatedBy?: string;
}

/** Normalise a note that may be a plain string (legacy) into a StudyNote */
export function toStudyNote(n: string | StudyNote): StudyNote {
  return typeof n === 'string' ? { text: n } : n;
}

/** Fetch the teacher override for a chapter (returns null if none exists) */
export async function getStudyOverride(chapterKey: string): Promise<StudyOverride | null> {
  const { fs } = getFirebaseInstances();
  if (!fs) return null;
  const snap = await getDoc(doc(fs, 'studyOverrides', chapterKey));
  if (!snap.exists()) return null;
  const raw = snap.data() as StudyOverride & { notes?: (string | StudyNote)[] };
  // Normalise legacy string notes
  if (raw.notes) raw.notes = raw.notes.map(toStudyNote);
  return raw as StudyOverride;
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
