import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getApp, getApps } from 'firebase/app';

export interface LeaderboardEntry {
  id?: string;
  name: string;
  score: number;
  gradeKey: string;
  level: number;
  accuracy: number;   // 0–100
  streak: number;     // best streak achieved
  timestamp: Timestamp | null;
}

/** Returns null when Firebase has not been initialised (no config provided). */
function db() {
  if (getApps().length === 0) return null;
  return getFirestore(getApp());
}

export async function submitScore(entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>) {
  const firestore = db();
  if (!firestore) return;   // no Firebase config — skip silently
  await addDoc(collection(firestore, 'practiceLeaderboard'), {
    ...entry,
    timestamp: serverTimestamp(),
  });
}

export async function fetchLeaderboard(gradeKey: string, limitN = 100): Promise<LeaderboardEntry[]> {
  const firestore = db();
  if (!firestore) return [];   // no Firebase config — return empty list silently
  // No orderBy in the query — avoids requiring a composite Firestore index.
  // We filter by gradeKey, fetch all, then sort client-side.
  const q = query(
    collection(firestore, 'practiceLeaderboard'),
    where('gradeKey', '==', gradeKey),
    limit(limitN),
  );
  const snap = await getDocs(q);
  const entries = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<LeaderboardEntry, 'id'>) }));
  return entries.sort((a, b) => b.score - a.score);
}
