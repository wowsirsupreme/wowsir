export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  school: string;
  role: 'teacher' | 'student' | 'admin';
  createdAt: number;
}
