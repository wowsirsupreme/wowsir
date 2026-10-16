'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { findSessionByCode } from '@/lib/firebase/sessions';
import {
  joinBattleLobby,
  listenBattleLobby,
  listenBattleInvites,
  createBattle,
  acceptBattle,
  declineBattle,
  setLobbyStatus,
  getBattleQuestions,
} from '@/lib/firebase/battles';
import { getSessionPublicQuestions } from '@/lib/firebase/sessions';
import type { BattleLobbyPlayer, BattleInvite } from '@/types/battle';
import type { LiveSession } from '@/types/session';
import type { Question } from '@/types/question';

const BG = [
  'radial-gradient(ellipse 70% 60% at 20% -10%, rgba(239,68,68,0.18) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 50% at 85% 20%,  rgba(99,102,241,0.15) 0%, transparent 55%)',
  '#060410',
].join(',');

const AVATARS = 12;

type Phase = 'join' | 'lobby' | 'waiting_accept';

export default function BattleLobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>('join');
  const [name, setName] = useState(() => searchParams.get('name') ?? '');
  const [avatarId, setAvatarId] = useState(() => Math.floor(Math.random() * AVATARS));
  const [playerId] = useState(() => `player_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`);

  const [session, setSession] = useState<LiveSession | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);

  const [lobbyPlayers, setLobbyPlayers] = useState<BattleLobbyPlayer[]>([]);
  const [invites, setInvites] = useState<BattleInvite[]>([]);
  const [challenging, setChallenging] = useState<string | null>(null);
  const [pendingBattleId, setPendingBattleId] = useState<string | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);

  // Resolve session code
  useEffect(() => {
    findSessionByCode(code.toUpperCase()).then(result => {
      if (!result) { toast('Session not found', 'error'); return; }
      setSession(result.session);
      setSessionId(result.sessionId);
    });
  }, [code]);

  // Load stored name/avatar
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('wq_battle_player');
      if (saved) {
        const { name: n, avatarId: a } = JSON.parse(saved);
        if (n) setName(n);
        if (a !== undefined) setAvatarId(a);
      }
    } catch {}
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { cleanupRef.current?.(); }, []);

  async function handleJoin() {
    const trimmed = name.trim();
    if (!trimmed) { toast('Enter your name', 'error'); return; }
    if (!sessionId) { toast('Connecting…', 'info'); return; }

    try {
      sessionStorage.setItem('wq_battle_player', JSON.stringify({ name: trimmed, avatarId }));
    } catch {}

    // Load questions
    const qs = await getSessionPublicQuestions(sessionId);
    if (!qs || qs.length === 0) { toast('No questions found for this session', 'error'); return; }
    setQuestions(qs);

    // Join lobby
    const cleanup = await joinBattleLobby(code.toUpperCase(), { id: playerId, name: trimmed, avatarId });
    cleanupRef.current = cleanup;

    // Listen to lobby
    const unsub1 = listenBattleLobby(code.toUpperCase(), players => {
      setLobbyPlayers(players.filter(p => p.id !== playerId));
    });

    // Listen to incoming invites
    const unsub2 = listenBattleInvites(playerId, inv => setInvites(inv));

    const prevCleanup = cleanupRef.current;
    cleanupRef.current = () => { prevCleanup(); unsub1(); unsub2(); };

    setPhase('lobby');
  }

  async function handleChallengePlayer(opponent: BattleLobbyPlayer) {
    if (!session || questions.length === 0) return;
    setChallenging(opponent.id);
    try {
      const battleId = await createBattle({
        quizId: session.quizId,
        quizTitle: session.quizTitle,
        sessionCode: code.toUpperCase(),
        sessionId,
        totalQ: questions.length,
        player1: { id: playerId, name: name.trim(), avatarId },
        player2: { id: opponent.id, name: opponent.name, avatarId: opponent.avatarId },
        pointsPerQ: session.settings?.pointsPerQ || 100,
        timeLimit: session.settings?.timeLimit || 20,
      }, questions);

      setPendingBattleId(battleId);
      await setLobbyStatus(code.toUpperCase(), playerId, 'in_battle');
      setPhase('waiting_accept');

      // Listen for battle to become active (opponent accepted)
      const { listenBattleMeta } = await import('@/lib/firebase/battles');
      const unsub = listenBattleMeta(battleId, meta => {
        if (meta?.status === 'active') {
          unsub();
          router.push(`/battle/match/${battleId}?me=${playerId}`);
        } else if (meta?.status === 'ended') {
          unsub();
          toast('Opponent declined', 'info');
          setChallenging(null);
          setPendingBattleId(null);
          setLobbyStatus(code.toUpperCase(), playerId, 'available').catch(() => {});
          setPhase('lobby');
        }
      });
    } catch {
      toast('Failed to send challenge', 'error');
      setChallenging(null);
    }
  }

  async function handleVsAI(difficulty: 'easy' | 'medium' | 'hard') {
    if (!session || questions.length === 0) return;
    try {
      const aiName = difficulty === 'easy' ? 'WOW Bot (Easy)' : difficulty === 'medium' ? 'WOW Bot (Medium)' : 'WOW Bot (Hard)';
      const battleId = await createBattle({
        quizId: session.quizId,
        quizTitle: session.quizTitle,
        sessionCode: code.toUpperCase(),
        sessionId,
        totalQ: questions.length,
        player1: { id: playerId, name: name.trim(), avatarId },
        player2: { id: 'ai', name: aiName, avatarId: 99 },
        pointsPerQ: session.settings?.pointsPerQ || 100,
        timeLimit: session.settings?.timeLimit || 20,
        aiDifficulty: difficulty,
      }, questions);

      await setLobbyStatus(code.toUpperCase(), playerId, 'in_battle');
      const { startAIBattle } = await import('@/lib/firebase/battles');
      await startAIBattle(battleId);
      router.push(`/battle/match/${battleId}?me=${playerId}&ai=${difficulty}`);
    } catch {
      toast('Failed to start battle', 'error');
    }
  }

  async function handleAcceptInvite(invite: BattleInvite) {
    try {
      await acceptBattle(invite.battleId, { id: playerId, name: name.trim(), avatarId });
      await setLobbyStatus(code.toUpperCase(), playerId, 'in_battle');
      router.push(`/battle/match/${invite.battleId}?me=${playerId}`);
    } catch {
      toast('Could not join battle', 'error');
    }
  }

  async function handleDeclineInvite(invite: BattleInvite) {
    await declineBattle(invite.battleId, playerId);
    setInvites(prev => prev.filter(i => i.battleId !== invite.battleId));
  }

  // ── JOIN SCREEN ──
  if (phase === 'join') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10" style={{ background: BG, color: '#f5f3ee' }}>
        <div className="w-full max-w-sm animate-fadeUp">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>⚔️</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: '#fff', marginBottom: 4 }}>Battle Mode</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
              {session ? session.quizTitle : `Code: ${code.toUpperCase()}`}
            </p>
          </div>

          {/* Avatar picker */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 10 }}>PICK YOUR AVATAR</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {Array.from({ length: AVATARS }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setAvatarId(i)}
                  style={{
                    width: 46, height: 46, borderRadius: 12,
                    background: avatarId === i ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${avatarId === i ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}
                >
                  <Avatar id={i} size={28} />
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="Your name"
            maxLength={24}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '14px 18px', borderRadius: 14,
              background: 'rgba(255,255,255,0.06)',
              border: '1.5px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 16, marginBottom: 16,
              outline: 'none',
            }}
          />

          <button
            onClick={handleJoin}
            disabled={!name.trim() || !sessionId}
            style={{
              width: '100%', padding: '15px', borderRadius: 14,
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff', fontWeight: 700, fontSize: 16,
              border: 'none', cursor: name.trim() && sessionId ? 'pointer' : 'not-allowed',
              opacity: name.trim() && sessionId ? 1 : 0.5,
              boxShadow: '0 4px 20px rgba(239,68,68,0.35)',
            }}
          >
            Enter Battle Lobby →
          </button>

          <button onClick={() => router.back()} style={{ width: '100%', marginTop: 12, padding: '12px', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── WAITING FOR ACCEPT ──
  if (phase === 'waiting_accept') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: BG, color: '#f5f3ee' }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 64, marginBottom: 16, animation: 'float 2s ease-in-out infinite' }}>⚔️</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: '#fff', marginBottom: 8 }}>Waiting for opponent…</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Challenge sent. Waiting for them to accept.</p>
          <button
            onClick={async () => {
              if (pendingBattleId) await declineBattle(pendingBattleId, playerId);
              setPendingBattleId(null);
              setChallenging(null);
              setLobbyStatus(code.toUpperCase(), playerId, 'available').catch(() => {});
              setPhase('lobby');
            }}
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', padding: '10px 20px' }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── LOBBY ──
  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(6,4,16,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(239,68,68,0.15)',
        padding: '0 20px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚔️</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>Battle Lobby</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', marginLeft: 4 }}>
            {code.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar id={avatarId} size={28} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{name.trim()}</span>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* Pending invites */}
        {invites.length > 0 && invites.map(inv => (
          <div
            key={inv.battleId}
            style={{
              marginBottom: 16, borderRadius: 16,
              background: 'rgba(239,68,68,0.1)',
              border: '1.5px solid rgba(239,68,68,0.4)',
              padding: '16px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>
                ⚔️ Challenge from <span style={{ color: '#f87171' }}>{inv.fromName}</span>
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}>
                {inv.quizTitle}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleDeclineInvite(inv)}
                style={{
                  padding: '8px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer',
                }}
              >
                Decline
              </button>
              <button
                onClick={() => handleAcceptInvite(inv)}
                style={{
                  padding: '8px 16px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.3)',
                  border: '1px solid rgba(239,68,68,0.5)',
                  color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                Accept ⚔️
              </button>
            </div>
          </div>
        ))}

        {/* VS AI */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 12 }}>
            PLAY VS AI
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {(['easy', 'medium', 'hard'] as const).map(diff => (
              <button
                key={diff}
                onClick={() => handleVsAI(diff)}
                style={{
                  padding: '14px 10px', borderRadius: 14,
                  background: diff === 'easy' ? 'rgba(16,185,129,0.12)' : diff === 'medium' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                  border: `1.5px solid ${diff === 'easy' ? 'rgba(16,185,129,0.3)' : diff === 'medium' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: diff === 'easy' ? '#34d399' : diff === 'medium' ? '#fbbf24' : '#f87171',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 24 }}>🤖</span>
                <span style={{ textTransform: 'capitalize' }}>{diff}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Online players */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', margin: 0 }}>
              PLAYERS ONLINE — {lobbyPlayers.length}
            </p>
            <a
              href={`/battle/leaderboard/${session?.quizId}`}
              style={{ fontSize: 12, color: 'rgba(239,68,68,0.7)', textDecoration: 'none' }}
            >
              🏆 Battle Leaderboard →
            </a>
          </div>

          {lobbyPlayers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>👀</p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>No other players online yet</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Share the code <strong style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>{code.toUpperCase()}</strong> to invite classmates</p>
            </div>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            {lobbyPlayers.map(player => (
              <div
                key={player.id}
                style={{
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar id={player.avatarId} size={36} />
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>{player.name}</p>
                    <p style={{ fontSize: 11, margin: '2px 0 0', color: player.status === 'available' ? '#34d399' : 'rgba(255,255,255,0.3)' }}>
                      {player.status === 'available' ? '● Available' : '● In battle'}
                    </p>
                  </div>
                </div>
                {player.status === 'available' && (
                  <button
                    onClick={() => handleChallengePlayer(player)}
                    disabled={challenging !== null}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '10px 18px', borderRadius: 10,
                      background: 'rgba(239,68,68,0.2)',
                      border: '1.5px solid rgba(239,68,68,0.4)',
                      color: '#f87171', fontWeight: 700, fontSize: 13,
                      cursor: challenging !== null ? 'not-allowed' : 'pointer',
                      opacity: challenging !== null ? 0.5 : 1,
                    }}
                  >
                    ⚔️ Challenge
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
