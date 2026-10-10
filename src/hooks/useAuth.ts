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
    // Ensure Firebase is initialized before checking instances.
    // useFirebase() may not have run yet on a hard refresh, so we init here
    // too — initFirebase is idempotent (getApps() guard prevents re-init).
    const { auth } = (() => {
      try {
        const { getFirebaseInstances, getFirebaseConfig, initFirebase } = require('@/lib/firebase/config');
        let instances = getFirebaseInstances();
        if (!instances.auth) {
          const cfg = getFirebaseConfig();
          if (cfg) initFirebase(cfg);
          instances = getFirebaseInstances();
        }
        return instances;
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
