import type { Question } from './question';

export interface QuizSettings {
  timeLimit: number;
  pointsPerQ: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  antiCheat: boolean;
  showLeaderboard: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  teacherId: string;
  topicKey?: string;
  questionIds: string[];
  questions?: Question[];  // denormalized for live sessions
  createdAt: number;
  updatedAt?: number;
  status: 'draft' | 'published';
  settings?: QuizSettings;
}
