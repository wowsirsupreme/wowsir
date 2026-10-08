'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { TimerRing } from '@/components/quiz/TimerRing';
import { ScoreBar } from '@/components/quiz/ScoreBar';
import { Leaderboard } from '@/components/quiz/Leaderboard';
import { Avatar } from '@/components/ui/Avatar';
import { useSession } from '@/hooks/useSession';
import { useFirebase } from '@/hooks/useFirebase';
import {
  findSessionByCode,
  submitAnswer,
  reportTabSwitch,
  joinSession,
} from '@/lib/firebase/sessions';
import { calcTimeBonus } from '@/lib/utils';
import type { Question } from '@/types/question';

type Phase = 'loading' | 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended';

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { configured } = useFirebase();

  const playerName = searchParams.get('name') || 'Player';
  const avatarId = parseInt(searchParams.get('avatar') || '0', 10);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerTime, setAnswerTime] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [error, setError] = useState('');
  const [finalRank, setFinalRank] = useState<number | null>(null);

  const { session, players, leaderboard } = useSession(sessionId);

  useEffect(() => {
    if (!configured) { setError('Firebase not configured'); setPhase('ended'); return; }
    findSessionByCode(code).then(async result => {
      if (!result) { setError('Room not found'); setPhase('ended'); return; }
      const sid = result.sessionId;
      setSessionId(sid);
      const pid = await joinSession(sid, playerName, avatarId);
      setPlayerId(pid);
      setPhase('lobby');
    }).catch(() => {
      setError('Connection error');
      setPhase('ended');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, code]);

  useEffect(() => {
    if (!session) return;
    if (session.status === 'active') {
      if (phase === 'lobby' || phase === 'leaderboard') {
        setPhase('question');
        setSelected(null);
        setAnswerTime(null);
        setQuestionStartTime(Date.now());
      }
    }
    if (session.status === 'ended') {
      setPhase('ended');
      const me = leaderboard.find(p => p.id === playerId);
      if (me) { setFinalRank(me.rank); setScore(me.score); }
    }
  }, [session?.status, session?.currentQ]);

  useEffect(() => {
    if (!sessionId || !playerId) return;
    const handle = () => {
      if (document.hidden && sessionId && playerId) reportTabSwitch(sessionId, playerId);
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [sessionId, playerId]);

  useEffect(() => {
    if (session?.status === 'active') {
      setSelected(null);
      setAnswerTime(null);
      setQuestionStartTime(Date.now());
      setPhase('question');
    }
  }, [session?.currentQ]);

  const handleAnswer = useCallback(async (index: number) => {
    if (!sessionId || !playerId || !session?.question || selected !== null) return;
    const timeMs = Date.now() - questionStartTime;
    setSelected(index);
    setAnswerTime(timeMs);
    setPhase('reveal');

    const q: Question = session.question;
    const correctIndex = parseInt(q.answer, 10);
    const isCorrect = index === correctIndex;
    const timeLimit = session.settings?.timeLimit || 20;
    const timeBonus = isCorrect ? calcTimeBonus(timeMs, timeLimit * 1000) : 0;
    const basePoints = q.points || 100;
    const scored = isCorrect ? basePoints + timeBonus : 0;

    if (isCorrect) { setScore(s => s + scored); setStreak(s => s + 1); }
    else { setStreak(0); }

    await submitAnswer(sessionId, playerId, session.currentQ, index, isCorrect, scored, timeMs);
  }, [sessionId, playerId, session, selected, questionStartTime]);

  function handleTimerEnd() {
    if (selected === null) handleAnswer(-1);
  }

  // ── LOADING ──
  if (phase === 'loading') {
    return (
      <div className="play-screen flex items-center justify-center min-h-screen">
        <div className="text-center animate-pulse-slow">
          <div className="text-7xl mb-5 animate-greenGlow">🎮</div>
          <p className="text-lg font-mono" style={{ color: 'rgba(255,255,255,0.7)' }}>Joining room <span style={{ color: '#10b981' }}>{code}</span>…</p>
          <div className="flex justify-center gap-1.5 mt-4">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full animate-pulseDot" style={{ background: '#10b981', animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── ENDED / ERROR ──
  if (phase === 'ended' || error) {
    return (
      <div className="play-screen flex flex-col items-center justify-center px-4 min-h-screen">
        <div className="text-center animate-slideUp">
          {error ? (
            <>
              <div className="text-7xl mb-5">😬</div>
              <h2 className="font-display text-4xl mb-3" style={{ color: '#fff' }}>Oops!</h2>
              <p className="text-[15px] mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>{error}</p>
            </>
          ) : (
            <>
              <div
                className="text-7xl mb-5 animate-crownPop"
                style={{ filter: `drop-shadow(0 0 24px ${finalRank === 1 ? 'rgba(201,168,76,0.9)' : 'rgba(16,185,129,0.7)'})` }}
              >
                {finalRank === 1 ? '🏆' : '🎉'}
              </div>
              <h2 className="font-display text-5xl mb-2" style={{ color: '#fff' }}>Game Over!</h2>
              <p className="text-[15px] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Final score</p>
              <p
                className="font-mono text-6xl font-bold mb-3 animate-scoreSlide"
                style={{ color: '#34d399', textShadow: '0 0 24px rgba(52,211,153,0.6)' }}
              >
                {score.toLocaleString()}
              </p>
              {finalRank && (
                <p className="text-[15px] mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  You finished{' '}
                  <span className="font-bold" style={{ color: '#fcd34d' }}>#{finalRank}</span>
                </p>
              )}
              {leaderboard.length > 0 && (
                <div className="mb-8 w-full max-w-sm">
                  <Leaderboard players={leaderboard} currentPlayerId={playerId || undefined} compact />
                </div>
              )}
            </>
          )}
          <button
            onClick={() => router.push('/')}
            className="btn-glass btn-glass-green"
            style={{ width: 'auto', minWidth: 180 }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── LOBBY ──
  if (phase === 'lobby') {
    return (
      <div className="play-screen flex flex-col items-center justify-center px-4 min-h-screen">
        <div className="text-center animate-fadeUp">
          <div className="text-7xl mb-5 animate-float">⏳</div>
          <h2 className="font-display text-4xl mb-2" style={{ color: '#fff' }}>
            Waiting for teacher…
          </h2>
          <p className="text-[15px] mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>Room code</p>
          <div className="code-display-dark mb-8">{code}</div>
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.3)' }}
            >
              <Avatar id={avatarId} size={44} />
            </div>
            <p className="font-medium text-[17px]" style={{ color: '#fff' }}>{playerName}</p>
            <p className="text-sm flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulseDot inline-block" />
              {players.length} player{players.length !== 1 ? 's' : ''} joined
            </p>
          </div>
        </div>
      </div>
    );
  }

  const q: Question | null = session?.question || null;
  const timeLimit = session?.settings?.timeLimit || 20;

  // ── QUESTION / REVEAL ──
  return (
    <div className="play-screen flex flex-col min-h-screen">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', background: 'rgba(2,10,6,0.5)', position: 'sticky', top: 0, zIndex: 10 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <Avatar id={avatarId} size={26} />
          </div>
          <span className="text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{playerName}</span>
        </div>

        <ScoreBar score={score} streak={streak} />

        {phase === 'question' && q && (
          <TimerRing seconds={timeLimit} onEnd={handleTimerEnd} paused={phase !== 'question'} size={48} />
        )}
        {phase === 'reveal' && <div className="w-12" />}
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full">
        {q && (
          <>
            <p className="text-xs font-mono tracking-widest uppercase mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Question {(session?.currentQ || 0) + 1}
            </p>
            <QuestionCard
              question={q}
              selected={selected}
              revealed={phase === 'reveal'}
              onAnswer={handleAnswer}
              disabled={phase === 'reveal'}
            />
          </>
        )}

        {phase === 'leaderboard' && (
          <div className="w-full max-w-md animate-slideUp">
            <h2 className="font-display text-3xl text-center mb-6" style={{ color: '#fff' }}>Leaderboard</h2>
            <Leaderboard players={leaderboard} currentPlayerId={playerId || undefined} compact />
          </div>
        )}
      </div>
    </div>
  );
}
