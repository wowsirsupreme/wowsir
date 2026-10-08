'use client';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFirebaseInstances } from './config';
import type { UserProfile } from '@/types/user';

export async function registerTeacher(
  email: string,
  password: string,
  name: string,
  school: string
): Promise<UserProfile> {
  const { auth, fs } = getFirebaseInstances();
  if (!auth || !fs) throw new Error('Firebase not configured');

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const profile: UserProfile = {
    uid: cred.user.uid,
    email,
    name,
    school,
    role: 'teacher',
    createdAt: Date.now(),
  };
  await setDoc(doc(fs, 'users', cred.user.uid), profile);
  return profile;
}

export async function loginTeacher(email: string, password: string): Promise<User> {
  const { auth } = getFirebaseInstances();
  if (!auth) throw new Error('Firebase not configured');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutTeacher(): Promise<void> {
  const { auth } = getFirebaseInstances();
  if (!auth) return;
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { fs } = getFirebaseInstances();
  if (!fs) return null;
  const snap = await getDoc(doc(fs, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function onAuthChange(callback: (user: User | null) => void) {
  const { auth } = getFirebaseInstances();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}
