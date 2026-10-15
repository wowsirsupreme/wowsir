'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
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
  getSessionPublicQuestions,
} from '@/lib/firebase/sessions';
import { calcTimeBonus } from '@/lib/utils';
import type { Question } from '@/types/question';

type Phase = 'loading' | 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended';

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { configured, checking } = useFirebase();

  const playerName = searchParams.get('name') || 'Player';
  const avatarId = parseInt(searchParams.get('avatar') || '0', 10);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [numCorrect, setNumCorrect] = useState(0);
  const [numAnswered, setNumAnswered] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerTime, setAnswerTime] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [error, setError] = useState('');
  const [finalRank, setFinalRank] = useState<number | null>(null);

  // Self-paced mode state
  const [localQuestions, setLocalQuestions] = useState<Question[]>([]);
  const [localQIdx, setLocalQIdx] = useState(0);
  const [selfPaced, setSelfPaced] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const { session, players, leaderboard } = useSession(sessionId);

  // ── Join on mount ──
  useEffect(() => {
    if (checking) return;
    if (!configured) { setError('Firebase not configured'); setPhase('ended'); return; }
    setError('');
    findSessionByCode(code).then(async result => {
      if (!result) { setError('Room not found'); setPhase('ended'); return; }
      const sid = result.sessionId;

      // Check expiry
      const meta = result.session;
      if (meta.closeAt && Date.now() > meta.closeAt) {
        setError('This session has ended'); setPhase('ended'); return;
      }

      setSessionId(sid);
      const pid = await joinSession(sid, playerName, avatarId);
      setPlayerId(pid);

      // Load questions for self-paced play
      setQuestionsLoading(true);
      const qs = await getSessionPublicQuestions(sid);
      if (qs && qs.length > 0) setLocalQuestions(qs);
      setQuestionsLoading(false);

      setPhase('lobby');
    }).catch(() => {
      setError('Connection error');
      setPhase('ended');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, checking, code]);

  // ── Teacher-driven session state changes (only when not self-pacing) ──
  useEffect(() => {
    if (selfPaced || !session) return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?.currentQ]);

  // ── Teacher advances question (only when not self-pacing) ──
  useEffect(() => {
    if (selfPaced) return;
    if (session?.status === 'active') {
      setSelected(null);
      setAnswerTime(null);
      setQuestionStartTime(Date.now());
      setPhase('question');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.currentQ]);

  // ── Tab visibility anti-cheat ──
  useEffect(() => {
    if (!sessionId || !playerId) return;
    const handle = () => {
      if (document.hidden && sessionId && playerId) {
        const qIdx = selfPaced ? localQIdx : (session?.currentQ ?? 0);
        reportTabSwitch(sessionId, playerId, qIdx);
      }
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [sessionId, playerId, selfPaced, localQIdx, session?.currentQ]);

  // ── Self-paced start ──
  function handleStartSelfPaced() {
    setSelfPaced(true);
    setLocalQIdx(0);
    setSelected(null);
    setAnswerTime(null);
    setQuestionStartTime(Date.now());
    setPhase('question');
  }

  // ── Answer handler (both modes) ──
  const handleAnswer = useCallback(async (index: number) => {
    if (!sessionId || !playerId || selected !== null) return;

    const q: Question | null = selfPaced
      ? (localQuestions[localQIdx] || null)
      : (session?.question as Question | null) || null;
    if (!q) return;

    const timeMs = Date.now() - questionStartTime;
    setSelected(index);
    setAnswerTime(timeMs);
    setPhase('reveal');

    const correctIndex = parseInt(q.answer, 10);
    const isCorrect = index === correctIndex;
    const timeLimit = session?.settings?.timeLimit || 20;
    const timeBonus = isCorrect ? calcTimeBonus(timeMs, timeLimit * 1000) : 0;
    const basePoints = q.points || 100;
    const scored = isCorrect ? basePoints + timeBonus : 0;

    if (isCorrect) { setScore(s => s + scored); setStreak(s => s + 1); setNumCorrect(n => n + 1); }
    else { setStreak(0); }
    setNumAnswered(n => n + 1);

    const qIdx = selfPaced ? localQIdx : (session?.currentQ || 0);
    await submitAnswer(sessionId, playerId, qIdx, index, isCorrect, scored, timeMs);
  }, [sessionId, playerId, session, selected, questionStartTime, selfPaced, localQuestions, localQIdx]);

  // ── Self-paced: advance to next question ──
  function handleNextSelfPaced() {
    const next = localQIdx + 1;
    if (next >= localQuestions.length) {
      // All questions done
      setPhase('ended');
      return;
    }
    setLocalQIdx(next);
    setSelected(null);
    setAnswerTime(null);
    setQuestionStartTime(Date.now());
    setPhase('question');
  }

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
              {(() => {
                const isPerfect = numAnswered > 0 && numCorrect === numAnswered;
                return (
                  <>
                    <div
                      className="text-7xl mb-5 animate-crownPop"
                      style={{ filter: `drop-shadow(0 0 24px ${isPerfect ? 'rgba(201,168,76,1)' : finalRank === 1 ? 'rgba(201,168,76,0.9)' : 'rgba(16,185,129,0.7)'})` }}
                    >
                      {isPerfect ? '⭐' : finalRank === 1 ? '🏆' : '🎉'}
                    </div>
                    <h2 className="font-display text-5xl mb-2" style={{ color: '#fff' }}>
                      {isPerfect ? 'Perfect Score!' : selfPaced ? 'Quiz Complete!' : 'Game Over!'}
                    </h2>
                    {isPerfect && (
                      <p className="text-[15px] mb-3 font-semibold" style={{ color: '#fcd34d', textShadow: '0 0 12px rgba(201,168,76,0.6)' }}>
                        {numCorrect}/{numAnswered} correct — flawless! 🌟
                      </p>
                    )}
                  </>
                );
              })()}
              <p className="text-[15px] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Final score</p>
              <p
                className="font-mono text-6xl font-bold mb-3 animate-scoreSlide"
                style={{ color: '#34d399', textShadow: '0 0 24px rgba(52,211,153,0.6)' }}
              >
                {score.toLocaleString()}
              </p>
              {selfPaced && (
                <p className="text-[14px] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {localQuestions.filter((_, i) => {
                    // We can't easily check after-the-fact, just show what was answered
                    return true;
                  }).length} questions completed
                </p>
              )}
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
    const ready = localQuestions.length > 0;
    return <LobbyView
      code={code}
      avatarId={avatarId}
      playerName={playerName}
      players={players}
      ready={ready}
      questionsLoading={questionsLoading}
      localQuestions={localQuestions}
      onStart={handleStartSelfPaced}
      onBattle={() => router.push(`/battle/${code}?name=${encodeURIComponent(playerName)}`)}
    />;
  }

  // ── QUESTION / REVEAL ──
  const q: Question | null = selfPaced
    ? (localQuestions[localQIdx] || null)
    : ((session?.question as Question) || null);
  const timeLimit = session?.settings?.timeLimit || 20;
  const currentQNum = selfPaced ? localQIdx : (session?.currentQ || 0);
  const totalQ = selfPaced ? localQuestions.length : (session?.totalQ || localQuestions.length);

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

      {/* Question area — full-width wrapper centres the constrained inner column */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 py-8">
      <div style={{ width: '100%', maxWidth: 720 }}>
        {q && (
          <>
            <p className="text-xs font-mono tracking-widest uppercase mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Question {currentQNum + 1}{totalQ > 0 ? ` / ${totalQ}` : ''}
            </p>
            <QuestionCard
              question={q}
              selected={selected}
              revealed={phase === 'reveal'}
              onAnswer={handleAnswer}
              disabled={phase === 'reveal'}
            />

            {/* Self-paced: next button after reveal */}
            {phase === 'reveal' && selfPaced && (
              <button
                className="btn-glass btn-glass-green mt-6"
                style={{ minWidth: 200, fontSize: 16 }}
                onClick={handleNextSelfPaced}
              >
                {localQIdx + 1 >= localQuestions.length ? '🏁 See Results' : 'Next Question →'}
              </button>
            )}
          </>
        )}

        {phase === 'leaderboard' && (
          <div className="w-full max-w-md animate-slideUp">
            <h2 className="font-display text-3xl text-center mb-6" style={{ color: '#fff' }}>Leaderboard</h2>
            <Leaderboard players={leaderboard} currentPlayerId={playerId || undefined} compact />
          </div>
        )}
      </div>{/* end inner constrained column */}
      </div>{/* end full-width wrapper */}
    </div>
  );
}

// ── Lobby View Component ──────────────────────────────────────────────────────

const TRACKS = [
  { id: 'big-guy',   label: 'Big Guy',   artist: 'Ice Spice',     src: '/music/big-guy.mp3',   emoji: '🎤' },
  { id: 'lush-life', label: 'Lush Life', artist: 'Zara Larsson',  src: '/music/lush-life.mp3', emoji: '🌸' },
];

function LobbyView({
  code, avatarId, playerName, players, ready, questionsLoading,
  localQuestions, onStart, onBattle,
}: {
  code: string; avatarId: number; playerName: string;
  players: unknown[]; ready: boolean; questionsLoading: boolean;
  localQuestions: unknown[]; onStart: () => void; onBattle: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);

  function toggleTrack(id: string, src: string) {
    if (nowPlaying === id) {
      audioRef.current?.pause();
      setNowPlaying(null);
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      const a = new Audio(src);
      a.loop = true;
      a.volume = volume;
      a.play().catch(() => {});
      audioRef.current = a;
      setNowPlaying(id);
    }
  }

  function handleVolume(v: number) {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }

  // Stop music when component unmounts (quiz starts)
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  return (
    <div className="play-screen flex flex-col min-h-screen">
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', background: 'rgba(2,12,6,0.5)', position: 'sticky', top: 0, zIndex: 10 }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulseDot inline-block" />
          <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {players.length} player{players.length !== 1 ? 's' : ''} in lobby
          </span>
        </div>
        <div
          className="font-mono font-bold tracking-widest text-lg"
          style={{ color: '#34d399', textShadow: '0 0 14px rgba(52,211,153,0.5)' }}
        >{code}</div>
        <div style={{ width: 80 }} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 animate-fadeUp">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)', boxShadow: '0 0 30px rgba(16,185,129,0.15)' }}
          >
            <Avatar id={avatarId} size={52} />
          </div>
          <p className="font-display text-2xl" style={{ color: '#fff' }}>{playerName}</p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {questionsLoading ? 'Loading quiz…' : ready ? 'Ready to play!' : 'Waiting for teacher…'}
          </p>
        </div>

        {/* Loading dots */}
        {questionsLoading && (
          <div className="flex justify-center gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full animate-pulseDot" style={{ background: '#10b981', animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        )}

        {/* Music player */}
        <div
          className="w-full max-w-sm rounded-2xl p-4 animate-fadeUp"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-xs font-medium mb-3" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
            LOBBY MUSIC
          </p>
          <div className="flex flex-col gap-2">
            {TRACKS.map(t => {
              const active = nowPlaying === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTrack(t.id, t.src)}
                  className="flex items-center gap-3 w-full text-left rounded-xl px-3 py-2.5 transition-all"
                  style={{
                    background: active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${active ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  }}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: active ? '#34d399' : '#fff' }}>{t.label}</p>
                    <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.artist}</p>
                  </div>
                  <span style={{ fontSize: 18, color: active ? '#34d399' : 'rgba(255,255,255,0.2)' }}>
                    {active ? '⏸' : '▶'}
                  </span>
                </button>
              );
            })}
          </div>
          {nowPlaying && (
            <div className="flex items-center gap-3 mt-3 px-1">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>🔈</span>
              <input
                type="range" min={0} max={1} step={0.05} value={volume}
                onChange={e => handleVolume(parseFloat(e.target.value))}
                className="flex-1 h-1 appearance-none rounded-full"
                style={{ accentColor: '#34d399' }}
              />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>🔊</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {ready && (
          <div className="w-full max-w-sm flex flex-col gap-3 animate-fadeUp">
            <button
              className="btn-glass btn-glass-green"
              style={{ width: '100%', fontSize: 17, padding: '16px 24px' }}
              onClick={onStart}
            >
              🚀 Start Quiz ({localQuestions.length} questions)
            </button>
            <div className="relative flex items-center gap-3">
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>or challenge classmates</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            </div>
            <button
              onClick={onBattle}
              style={{
                width: '100%', padding: '14px', borderRadius: 14,
                background: 'rgba(239,68,68,0.1)',
                border: '1.5px solid rgba(239,68,68,0.25)',
                color: '#f87171', fontWeight: 700, fontSize: 15,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              ⚔️ Battle Mode
            </button>
          </div>
        )}

        {!questionsLoading && !ready && (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
            The teacher will start the quiz shortly
          </p>
        )}
      </div>
    </div>
  );
}
