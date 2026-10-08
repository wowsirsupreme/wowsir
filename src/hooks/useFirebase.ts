'use client';

import { useState, useEffect } from 'react';
import { getFirebaseConfig, initFirebase, type FirebaseConfig } from '@/lib/firebase/config';

export function useFirebase() {
  const [configured, setConfigured] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const cfg = getFirebaseConfig();
    if (cfg) {
      const result = initFirebase(cfg);
      setConfigured(!!result);
    }
    setChecking(false);
  }, []);

  function configure(cfg: FirebaseConfig): boolean {
    const result = initFirebase(cfg);
    setConfigured(!!result);
    return !!result;
  }

  return { configured, checking, configure };
}
