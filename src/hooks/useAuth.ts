'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange, getUserProfile } from '@/lib/firebase/auth';
import type { UserProfile } from '@/types/user';

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  ready: boolean;  // Firebase is configured
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { auth } = (() => {
      try {
        const { getFirebaseInstances } = require('@/lib/firebase/config');
        return getFirebaseInstances();
      } catch { return { auth: null }; }
    })();
    if (!auth) { setLoading(false); setReady(false); return; }

    setReady(true);
    const unsubscribe = onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, profile, loading, ready };
}
