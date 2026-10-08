'use client';

import { useState, useEffect } from 'react';
import { listenSession, listenPlayers } from '@/lib/firebase/sessions';
import type { LiveSession, SessionPlayer } from '@/types/session';

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [playersMap, setPlayersMap] = useState<Record<string, SessionPlayer>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    setLoading(true);

    const unsubSession = listenSession(sessionId, (s) => {
      setSession(s);
      setLoading(false);
    });
    const unsubPlayers = listenPlayers(sessionId, (p) => {
      setPlayersMap(p);
    });

    return () => {
      unsubSession();
      unsubPlayers();
    };
  }, [sessionId]);

  const players = Object.values(playersMap);
  const leaderboard = [...players]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  return { session, players, leaderboard, loading };
}
