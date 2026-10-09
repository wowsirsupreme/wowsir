export interface FeedbackEntry {
  value: 'positive' | 'negative' | 'neutral';
  visitNumber: number;
  timestamp: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  school: string;
  role: 'teacher' | 'student' | 'admin';
  status?: 'pending' | 'approved' | 'suspended';
  city?: string;
  country?: string;
  createdAt: number;
  visitCount?: number;
  feedback?: FeedbackEntry[];
}
