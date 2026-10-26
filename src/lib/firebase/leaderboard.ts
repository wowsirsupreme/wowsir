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
  doc,
  updateDoc,
  deleteDoc,
  Firestore,
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
  totalTimeMs?: number;  // total time to complete all questions (Hot Seat)
  source?: 'practice' | 'hotseat';  // which mode produced the entry
  flagged?: boolean;   // admin: shadow-banned — hidden from public leaderboard
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
  // Filter out shadow-banned entries for public display
  return entries.filter(e => !e.flagged).sort((a, b) => b.score - a.score);
}

// ── Admin-only moderation functions ──────────────────────────────────────────

/** Fetch ALL leaderboard entries (including flagged) for admin moderation view. */
export async function fetchAllLeaderboardAdmin(firestore: Firestore): Promise<LeaderboardEntry[]> {
  const snap = await getDocs(collection(firestore, 'practiceLeaderboard'));
  const entries = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<LeaderboardEntry, 'id'>) }));
  return entries.sort((a, b) => b.score - a.score);
}

/** Shadow-ban or un-ban an entry. Flagged entries are hidden from the public leaderboard. */
export async function setLeaderboardEntryFlag(firestore: Firestore, id: string, flagged: boolean): Promise<void> {
  await updateDoc(doc(firestore, 'practiceLeaderboard', id), { flagged });
}

/** Overwrite the score on a leaderboard entry (use to deduct marks). */
export async function setLeaderboardEntryScore(firestore: Firestore, id: string, score: number): Promise<void> {
  await updateDoc(doc(firestore, 'practiceLeaderboard', id), { score: Math.max(0, score) });
}

/** Permanently delete a leaderboard entry. */
export async function deleteLeaderboardEntry(firestore: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(firestore, 'practiceLeaderboard', id));
}
