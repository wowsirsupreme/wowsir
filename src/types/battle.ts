export interface BattlePlayer {
  id: string;
  name: string;
  avatarId: number;
  score: number;
  correct: number;
  total: number;
  done: boolean; // finished all questions
  answers: Record<number, { choice: number; correct: boolean; timeMs: number }>;
}

export interface BattleMeta {
  id: string;
  quizId: string;
  quizTitle: string;
  sessionCode: string;
  sessionId: string;
  status: 'waiting' | 'active' | 'ended';
  createdAt: number;
  endedAt?: number;
  currentQ: number;
  totalQ: number;
  questionStartedAt?: number; // timestamp when current question was shown
  winnerId?: string;           // playerId | 'ai' | 'draw'
  player1: { id: string; name: string; avatarId: number };
  player2: { id: string; name: string; avatarId: number }; // id === 'ai' for AI
  pointsPerQ: number;
  timeLimit: number;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface BattleLobbyPlayer {
  id: string;
  name: string;
  avatarId: number;
  lastSeen: number;
  status: 'available' | 'in_battle';
}

export interface BattleInvite {
  battleId: string;
  fromId: string;
  fromName: string;
  quizTitle: string;
  createdAt: number;
}

export interface BattleResult {
  id: string;
  quizId: string;
  quizTitle: string;
  sessionCode: string;
  winnerId: string;
  winnerName: string;
  loserId?: string;
  loserName?: string;
  draw: boolean;
  player1Id: string;
  player1Name: string;
  player1Score: number;
  player2Id: string;
  player2Name: string;
  player2Score: number;
  playedAt: number;
}
