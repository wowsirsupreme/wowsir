import type { Question } from './question';

export interface SessionPlayer {
  id: string;
  name: string;
  avatarId: number;
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  total: number;
  tabSwitches: number;
  windowResizes: number;
  lastSeen: number;
  answers?: Record<number, { choice: string; correct: boolean; timeMs: number }>;
}

export interface LiveSession {
  id: string;
  quizId: string;
  quizTitle: string;
  teacherId: string;
  code: string;
  status: 'lobby' | 'active' | 'paused' | 'ended';
  currentQ: number;
  totalQ: number;
  question?: Question | null;  // current question (answer stripped for students)
  startedAt?: number;
  endedAt?: number;
  settings: {
    antiCheat: boolean;
    showLeaderboard: boolean;
    timeLimit: number;
    pointsPerQ: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
  };
  players?: Record<string, SessionPlayer>;
}

export interface SessionResult {
  id: string;
  sessionId: string;
  quizId: string;
  quizTitle: string;
  teacherId: string;
  completedAt: number;
  code: string;
  summary: {
    totalPlayers: number;
    avgScore: number;
    avgAccuracy: number;
    topScore: number;
  };
  playerResults: {
    name: string;
    score: number;
    correct: number;
    total: number;
    accuracy: number;
    streak: number;
    tabSwitches: number;
  }[];
}
