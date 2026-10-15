'use client';

import { ref, set, get, update, remove, onValue, off, serverTimestamp, onDisconnect } from 'firebase/database';
import { collection, doc, setDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { getFirebaseInstances } from './config';
import type { BattleMeta, BattlePlayer, BattleLobbyPlayer, BattleInvite, BattleResult } from '@/types/battle';
import type { Question } from '@/types/question';

function db() {
  const { db } = getFirebaseInstances();
  if (!db) throw new Error('Firebase RTDB not configured');
  return db;
}
function fs() {
  const { fs } = getFirebaseInstances();
  if (!fs) throw new Error('Firestore not configured');
  return fs;
}

function genBattleId(): string {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── Lobby presence ────────────────────────────────────────────────────────────

export async function joinBattleLobby(
  sessionCode: string,
  player: Omit<BattleLobbyPlayer, 'lastSeen' | 'status'>
): Promise<() => void> {
  const r = ref(db(), `battle_lobby/${sessionCode}/${player.id}`);
  const data: BattleLobbyPlayer = { ...player, lastSeen: Date.now(), status: 'available' };
  await set(r, data);
  // Auto-remove on disconnect
  onDisconnect(r).remove();
  // Heartbeat every 20s
  const interval = setInterval(() => {
    update(r, { lastSeen: Date.now() }).catch(() => {});
  }, 20_000);
  return () => { clearInterval(interval); remove(r).catch(() => {}); };
}

export function listenBattleLobby(
  sessionCode: string,
  cb: (players: BattleLobbyPlayer[]) => void
): () => void {
  const r = ref(db(), `battle_lobby/${sessionCode}`);
  onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const now = Date.now();
    const players = Object.values(snap.val() as Record<string, BattleLobbyPlayer>)
      .filter(p => now - p.lastSeen < 60_000); // only recently active
    cb(players);
  });
  return () => off(r);
}

export async function setLobbyStatus(
  sessionCode: string,
  playerId: string,
  status: BattleLobbyPlayer['status']
): Promise<void> {
  await update(ref(db(), `battle_lobby/${sessionCode}/${playerId}`), { status, lastSeen: Date.now() });
}

// ── Battle lifecycle ──────────────────────────────────────────────────────────

export async function createBattle(
  meta: Omit<BattleMeta, 'id' | 'status' | 'createdAt' | 'currentQ'>,
  questions: Question[]
): Promise<string> {
  const battleId = genBattleId();
  const fullMeta: BattleMeta = {
    ...meta,
    id: battleId,
    status: 'waiting',
    createdAt: Date.now(),
    currentQ: 0,
  };

  const p1Score: BattlePlayer = {
    id: meta.player1.id,
    name: meta.player1.name,
    avatarId: meta.player1.avatarId,
    score: 0, correct: 0, total: 0, done: false, answers: {},
  };

  await Promise.all([
    set(ref(db(), `battles/${battleId}/meta`), fullMeta),
    set(ref(db(), `battles/${battleId}/questions`), questions),
    set(ref(db(), `battles/${battleId}/scores/${meta.player1.id}`), p1Score),
  ]);

  // If vs a real player, create an invite for them
  if (meta.player2.id !== 'ai') {
    const invite: BattleInvite = {
      battleId,
      fromId: meta.player1.id,
      fromName: meta.player1.name,
      quizTitle: meta.quizTitle,
      createdAt: Date.now(),
    };
    await set(ref(db(), `battle_invites/${meta.player2.id}/${battleId}`), invite);
  }

  return battleId;
}

export async function acceptBattle(battleId: string, player2: BattleMeta['player2']): Promise<void> {
  const p2Score: BattlePlayer = {
    id: player2.id,
    name: player2.name,
    avatarId: player2.avatarId,
    score: 0, correct: 0, total: 0, done: false, answers: {},
  };
  await Promise.all([
    update(ref(db(), `battles/${battleId}/meta`), {
      status: 'active',
      questionStartedAt: Date.now(),
    }),
    set(ref(db(), `battles/${battleId}/scores/${player2.id}`), p2Score),
    remove(ref(db(), `battle_invites/${player2.id}/${battleId}`)),
  ]);
}

export async function declineBattle(battleId: string, playerId: string): Promise<void> {
  await Promise.all([
    update(ref(db(), `battles/${battleId}/meta`), { status: 'ended', endedAt: Date.now() }),
    remove(ref(db(), `battle_invites/${playerId}/${battleId}`)),
  ]);
}

export async function startAIBattle(battleId: string): Promise<void> {
  await update(ref(db(), `battles/${battleId}/meta`), {
    status: 'active',
    questionStartedAt: Date.now(),
  });
}

export async function submitBattleAnswer(
  battleId: string,
  playerId: string,
  qIndex: number,
  choice: number,
  isCorrect: boolean,
  timeMs: number,
  scoreEarned: number
): Promise<void> {
  const r = ref(db(), `battles/${battleId}/scores/${playerId}`);
  const snap = await get(r);
  const player: BattlePlayer = snap.val();
  if (!player) return;

  await update(r, {
    score: player.score + scoreEarned,
    correct: player.correct + (isCorrect ? 1 : 0),
    total: player.total + 1,
    [`answers/${qIndex}`]: { choice, correct: isCorrect, timeMs },
  });
}

export async function advanceBattleQuestion(battleId: string, nextQ: number, totalQ: number): Promise<void> {
  if (nextQ >= totalQ) {
    await update(ref(db(), `battles/${battleId}/meta`), {
      currentQ: nextQ,
      questionStartedAt: Date.now(),
    });
  } else {
    await update(ref(db(), `battles/${battleId}/meta`), {
      currentQ: nextQ,
      questionStartedAt: Date.now(),
    });
  }
}

export async function markPlayerDone(battleId: string, playerId: string): Promise<void> {
  await update(ref(db(), `battles/${battleId}/scores/${playerId}`), { done: true });
}

export async function endBattle(battleId: string, winnerId: string): Promise<void> {
  await update(ref(db(), `battles/${battleId}/meta`), {
    status: 'ended',
    endedAt: Date.now(),
    winnerId,
  });
}

export async function saveBattleResult(result: BattleResult): Promise<void> {
  await setDoc(doc(fs(), 'battle_results', result.id), result);
}

// ── Listeners ────────────────────────────────────────────────────────────────

export function listenBattleMeta(battleId: string, cb: (meta: BattleMeta | null) => void): () => void {
  const r = ref(db(), `battles/${battleId}/meta`);
  onValue(r, snap => cb(snap.exists() ? snap.val() as BattleMeta : null));
  return () => off(r);
}

export function listenBattleScores(
  battleId: string,
  cb: (scores: Record<string, BattlePlayer>) => void
): () => void {
  const r = ref(db(), `battles/${battleId}/scores`);
  onValue(r, snap => cb(snap.exists() ? snap.val() as Record<string, BattlePlayer> : {}));
  return () => off(r);
}

export function listenBattleInvites(
  playerId: string,
  cb: (invites: BattleInvite[]) => void
): () => void {
  const r = ref(db(), `battle_invites/${playerId}`);
  onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    cb(Object.values(snap.val() as Record<string, BattleInvite>));
  });
  return () => off(r);
}

export async function getBattleQuestions(battleId: string): Promise<Question[]> {
  const snap = await get(ref(db(), `battles/${battleId}/questions`));
  return snap.exists() ? snap.val() as Question[] : [];
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function getBattleLeaderboard(
  quizId: string,
  maxResults = 50
): Promise<BattleResult[]> {
  try {
    const q = query(
      collection(fs(), 'battle_results'),
      where('quizId', '==', quizId),
      orderBy('playedAt', 'desc'),
      limit(maxResults)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as BattleResult);
  } catch { return []; }
}

// ── AI simulation ─────────────────────────────────────────────────────────────

export interface AIConfig {
  difficulty: 'easy' | 'medium' | 'hard';
}

/** Returns { delay (ms), choice } for an AI answer */
export function simulateAIAnswer(
  question: { options: string[]; answer: string },
  difficulty: AIConfig['difficulty']
): { delay: number; choice: number; correct: boolean } {
  const correct = parseInt(question.answer, 10);
  const accuracy = difficulty === 'easy' ? 0.60 : difficulty === 'medium' ? 0.80 : 0.93;
  const [minDelay, maxDelay] =
    difficulty === 'easy' ? [7000, 14000] :
    difficulty === 'medium' ? [4000, 9000] :
    [1500, 5000];

  const delay = minDelay + Math.random() * (maxDelay - minDelay);
  const isCorrect = Math.random() < accuracy;

  let choice: number;
  if (isCorrect) {
    choice = correct;
  } else {
    const wrong = Array.from({ length: question.options.length }, (_, i) => i).filter(i => i !== correct);
    choice = wrong[Math.floor(Math.random() * wrong.length)] ?? 0;
  }

  return { delay, choice, correct: isCorrect };
}
