'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { getFirestore, type Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Database | null = null;
let _fs: Firestore | null = null;

export function getFirebaseConfig(): FirebaseConfig | null {
  // 1. Check URL param ?fb=<base64>
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const fbParam = params.get('fb');
    if (fbParam) {
      try {
        const cfg = JSON.parse(atob(fbParam)) as FirebaseConfig;
        if (cfg.apiKey) {
          localStorage.setItem('fbConfig', JSON.stringify(cfg));
          return cfg;
        }
      } catch {}
    }
    // 2. Check localStorage
    try {
      const saved = localStorage.getItem('fbConfig');
      if (saved) return JSON.parse(saved) as FirebaseConfig;
    } catch {}
  }
  // 3. Check env vars (set in .env.local for development/Vercel deploy)
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (apiKey) {
    return {
      apiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || '',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
  }
  return null;
}

export function initFirebase(cfg: FirebaseConfig): { app: FirebaseApp; auth: Auth; db: Database; fs: Firestore } | null {
  try {
    _app = getApps().length > 0 ? getApp() : initializeApp(cfg);
    _auth = getAuth(_app);
    _db = getDatabase(_app);
    _fs = getFirestore(_app);
    return { app: _app, auth: _auth, db: _db, fs: _fs };
  } catch (e) {
    console.error('Firebase init error', e);
    return null;
  }
}

export function getFirebaseInstances() {
  return { app: _app, auth: _auth, db: _db, fs: _fs };
}

export function saveFirebaseConfig(cfg: FirebaseConfig) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fbConfig', JSON.stringify(cfg));
  }
}

export function buildShareLink(cfg: FirebaseConfig): string {
  const encoded = btoa(JSON.stringify(cfg));
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}?fb=${encoded}`;
}
