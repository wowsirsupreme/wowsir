'use client';

import { getFirebaseInstances } from './config';

export interface SavedPaper {
  id: string;
  title: string;
  subject?: string;
  updatedAt?: number;
  status?: string;
  teacherId?: string;
  questions?: unknown[];
  sections?: unknown[];
  [key: string]: unknown;
}

function fs() {
  const { fs } = getFirebaseInstances();
  if (!fs) throw new Error('Firestore not configured');
  return fs;
}

/** Save or update a paper in Firestore under `papers/{teacherId}/{paperId}` */
export async function savePaper(teacherId: string, paper: SavedPaper): Promise<void> {
  const { doc, setDoc } = await import('firebase/firestore');
  const firestore = fs();
  await setDoc(
    doc(firestore, 'papers', teacherId, 'items', paper.id),
    { ...paper, teacherId, updatedAt: Date.now() }
  );
}

/** Load all papers for a teacher, newest first */
export async function getPapers(teacherId: string): Promise<SavedPaper[]> {
  const { collection, query, orderBy, getDocs } = await import('firebase/firestore');
  const firestore = fs();
  try {
    const q = query(
      collection(firestore, 'papers', teacherId, 'items'),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as SavedPaper);
  } catch {
    // Fallback without ordering
    const { getDocs: gd, collection: col } = await import('firebase/firestore');
    const snap = await gd(col(firestore, 'papers', teacherId, 'items'));
    return snap.docs
      .map(d => d.data() as SavedPaper)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
}

/** Load a single paper */
export async function getPaper(teacherId: string, paperId: string): Promise<SavedPaper | null> {
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(fs(), 'papers', teacherId, 'items', paperId));
  return snap.exists() ? (snap.data() as SavedPaper) : null;
}

/** Delete a paper */
export async function deletePaper(teacherId: string, paperId: string): Promise<void> {
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(fs(), 'papers', teacherId, 'items', paperId));
}

/** Migrate any papers stored in localStorage to Firestore (call once on load) */
export async function migrateLocalStoragePapers(teacherId: string): Promise<number> {
  if (typeof window === 'undefined') return 0;
  try {
    const idx: string[] = JSON.parse(localStorage.getItem('assessments_index') || '[]');
    if (idx.length === 0) return 0;
    let migrated = 0;
    for (const id of idx) {
      const raw = localStorage.getItem(`assessment_${id}`);
      if (!raw) continue;
      try {
        const paper: SavedPaper = JSON.parse(raw);
        await savePaper(teacherId, { ...paper, teacherId });
        localStorage.removeItem(`assessment_${id}`);
        migrated++;
      } catch { /* skip bad entries */ }
    }
    if (migrated > 0) {
      localStorage.removeItem('assessments_index');
    }
    return migrated;
  } catch {
    return 0;
  }
}
