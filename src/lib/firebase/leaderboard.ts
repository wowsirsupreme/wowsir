import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getApp } from 'firebase/app';

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

function db() {
  return getFirestore(getApp());
}

export async function submitScore(entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>) {
  await addDoc(collection(db(), 'practiceLeaderboard'), {
    ...entry,
    timestamp: serverTimestamp(),
  });
}

export async function fetchLeaderboard(gradeKey: string, limitN = 100): Promise<LeaderboardEntry[]> {
  // No orderBy in the query — avoids requiring a composite Firestore index.
  // We filter by gradeKey, fetch all, then sort client-side.
  const q = query(
    collection(db(), 'practiceLeaderboard'),
    where('gradeKey', '==', gradeKey),
    limit(limitN),
  );
  const snap = await getDocs(q);
  const entries = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<LeaderboardEntry, 'id'>) }));
  return entries.sort((a, b) => b.score - a.score);
}
