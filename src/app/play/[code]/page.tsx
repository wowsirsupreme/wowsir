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
import { getQuiz } from '@/lib/firebase/quizzes';
import { calcTimeBonus } from '@/lib/utils';
import type { Question } from '@/types/question';
import type { SessionPlayer } from '@/types/session';

type Phase = 'loading' | 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended' | 'next-round';

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
  const [quizId, setQuizId] = useState<string | null>(null);
  // Per-question result tracking for review screen
  const [questionResults, setQuestionResults] = useState<
    Array<{ question: Question; selected: number; correct: boolean }>
  >([]);
  // Round-based progression through the full question bank
  const [fullBank, setFullBank] = useState<Question[]>([]);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const [roundNum, setRoundNum] = useState(1);
  const [roundScore, setRoundScore] = useState(0); // score for this round only

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
      const qid = result.session.quizId || null;
      setQuizId(qid);
      const pid = await joinSession(sid, playerName, avatarId);
      setPlayerId(pid);

      // Load questions for self-paced play
      setQuestionsLoading(true);
      const qs = await getSessionPublicQuestions(sid);
      if (qs && qs.length > 0) setLocalQuestions(qs);

      // Fetch full question bank for round-based play
      if (qid) {
        const quiz = await getQuiz(qid).catch(() => null);
        if (quiz?.questions && quiz.questions.length > 0) setFullBank(quiz.questions);
        else if (qs && qs.length > 0) setFullBank(qs); // fallback to session questions
      } else if (qs && qs.length > 0) {
        setFullBank(qs);
      }
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
    setQuestionResults(prev => [...prev, { question: q, selected: index, correct: isCorrect }]);

    const qIdx = selfPaced ? localQIdx : (session?.currentQ || 0);
    await submitAnswer(sessionId, playerId, qIdx, index, isCorrect, scored, timeMs);
  }, [sessionId, playerId, session, selected, questionStartTime, selfPaced, localQuestions, localQIdx]);

  // ── Self-paced: advance to next question ──
  function handleNextSelfPaced() {
    const next = localQIdx + 1;
    if (next >= localQuestions.length) {
      // Round done — check if more questions remain in the full bank
      const newUsed = new Set([...usedIndices, ...localQuestions.map((lq) => {
        // find index in fullBank by matching id or text content
        return fullBank.findIndex(bq =>
          (bq.id && lq.id) ? bq.id === lq.id : bq.text === lq.text
        );
      }).filter(i => i >= 0)]);
      setUsedIndices(newUsed);
      const remaining = fullBank.filter((_, i) => !newUsed.has(i));
      if (remaining.length > 0) {
        setRoundScore(score); // snapshot score at end of round
        setPhase('next-round');
      } else {
        setPhase('ended');
      }
      return;
    }
    setLocalQIdx(next);
    setSelected(null);
    setAnswerTime(null);
    setQuestionStartTime(Date.now());
    setPhase('question');
  }

  // ── Start next round with remaining questions ──
  function handleStartNextRound() {
    const remaining = fullBank.filter((_, i) => !usedIndices.has(i));
    setLocalQuestions(remaining);
    setLocalQIdx(0);
    setSelected(null);
    setAnswerTime(null);
    setRoundNum(r => r + 1);
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
    return <EndedScreen
      error={error}
      score={score}
      numCorrect={numCorrect}
      numAnswered={numAnswered}
      finalRank={finalRank}
      selfPaced={selfPaced}
      fullBank={fullBank}
      questionResults={questionResults}
      leaderboard={leaderboard}
      playerId={playerId}
      onRetake={() => {
        setScore(0); setStreak(0); setNumCorrect(0); setNumAnswered(0);
        setSelected(null); setFinalRank(null); setRoundNum(1);
        setUsedIndices(new Set()); setQuestionResults([]);
        setLocalQuestions(fullBank); setLocalQIdx(0); setPhase('question');
      }}
      onStudy={() => router.push('/study')}
      onPractice={() => router.push('/practice')}
      onBattle={() => router.push(`/battle/${code}?name=${encodeURIComponent(playerName)}`)}
      onHotseat={() => router.push('/hotseat')}
      onHome={() => router.push('/')}
    />;
  }

  // ── NEXT ROUND PROMPT ──
  if (phase === 'next-round') {
    const remaining = fullBank.filter((_, i) => !usedIndices.has(i));
    const totalDone = fullBank.length - remaining.length;
    return (
      <div className="play-screen flex flex-col items-center justify-center px-4 min-h-screen">
        <div className="text-center animate-slideUp max-w-sm w-full">
          <div className="text-6xl mb-4">🏁</div>
          <h2 className="font-display text-4xl mb-1" style={{ color: '#fff' }}>Round {roundNum} Done!</h2>
          <p className="text-[15px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Score so far: <span className="font-mono font-bold" style={{ color: '#34d399' }}>{score.toLocaleString()}</span>
          </p>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {totalDone} of {fullBank.length} questions done · {remaining.length} remaining
          </p>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full mb-8" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${(totalDone / fullBank.length) * 100}%`, background: 'linear-gradient(90deg, #10b981, #34d399)' }}
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleStartNextRound}
              className="btn-glass btn-glass-green"
              style={{ width: '100%', fontSize: 17, padding: '16px 24px' }}
            >
              ▶ Next Round ({remaining.length} questions)
            </button>
            <button
              onClick={() => setPhase('ended')}
              style={{
                width: '100%', padding: '12px',
                color: 'rgba(255,255,255,0.3)', fontWeight: 500, fontSize: 14,
                cursor: 'pointer', background: 'none', border: 'none',
              }}
            >
              I&apos;m done for now
            </button>
          </div>
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

// ── Ended Screen Component ────────────────────────────────────────────────────

function EndedScreen({
  error, score, numCorrect, numAnswered, finalRank, selfPaced,
  fullBank, questionResults, leaderboard, playerId,
  onRetake, onStudy, onPractice, onBattle, onHotseat, onHome,
}: {
  error: string;
  score: number; numCorrect: number; numAnswered: number;
  finalRank: number | null; selfPaced: boolean;
  fullBank: Question[];
  questionResults: Array<{ question: Question; selected: number; correct: boolean }>;
  leaderboard: (SessionPlayer & { rank: number })[];
  playerId: string | null;
  onRetake: () => void; onStudy: () => void; onPractice: () => void;
  onBattle: () => void; onHotseat: () => void; onHome: () => void;
}) {
  const [tab, setTab] = useState<'results' | 'leaderboard' | 'review'>('results');

  if (error) {
    return (
      <div className="play-screen flex flex-col items-center justify-center px-4 min-h-screen">
        <div className="text-7xl mb-5">😬</div>
        <h2 className="font-display text-4xl mb-3" style={{ color: '#fff' }}>Oops!</h2>
        <p className="text-[15px] mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>{error}</p>
        <button onClick={onHome} style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>← Back to Home</button>
      </div>
    );
  }

  const isPerfect = numAnswered > 0 && numCorrect === numAnswered;
  const numWrong = numAnswered - numCorrect;

  return (
    <div className="play-screen flex flex-col min-h-screen">

      {/* ── Hero section ── */}
      <div className="flex flex-col items-center pt-10 pb-6 px-4 text-center animate-slideUp">
        <div
          className="text-7xl mb-4 animate-crownPop"
          style={{ filter: `drop-shadow(0 0 24px ${isPerfect ? 'rgba(201,168,76,1)' : finalRank === 1 ? 'rgba(201,168,76,0.9)' : 'rgba(16,185,129,0.7)'})` }}
        >
          {isPerfect ? '⭐' : finalRank === 1 ? '🏆' : '🎉'}
        </div>
        <h2 className="font-display text-5xl mb-2" style={{ color: '#fff' }}>
          {isPerfect ? 'Perfect Score!' : selfPaced ? 'Quiz Complete!' : 'Game Over!'}
        </h2>
        {isPerfect && (
          <p className="text-[15px] mb-2 font-semibold" style={{ color: '#fcd34d', textShadow: '0 0 12px rgba(201,168,76,0.6)' }}>
            {numCorrect}/{numAnswered} correct — flawless! 🌟
          </p>
        )}
        <p className="font-mono text-5xl font-bold mb-1 animate-scoreSlide" style={{ color: '#34d399', textShadow: '0 0 24px rgba(52,211,153,0.6)' }}>
          {score.toLocaleString()}
        </p>
        <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>points</p>
        {finalRank && (
          <p className="text-[15px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Rank <span className="font-bold" style={{ color: '#fcd34d' }}>#{finalRank}</span>
          </p>
        )}

        {/* Quick stats row */}
        <div className="flex gap-4 mt-5">
          {[
            { label: 'Correct', value: numCorrect, color: '#34d399' },
            { label: 'Wrong', value: numWrong, color: '#f87171' },
            { label: 'Total', value: numAnswered, color: 'rgba(255,255,255,0.5)' },
          ].map(s => (
            <div key={s.label} className="text-center px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mx-4 mb-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {([
          { id: 'results', label: '📊 Results' },
          { id: 'leaderboard', label: '🏆 Board' },
          { id: 'review', label: '📝 Review' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? 'rgba(52,211,153,0.15)' : 'transparent',
              color: tab === t.id ? '#34d399' : 'rgba(255,255,255,0.4)',
              border: tab === t.id ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">

        {/* RESULTS TAB */}
        {tab === 'results' && (
          <div className="flex flex-col gap-3 max-w-sm mx-auto animate-slideUp">

            <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.07em' }}>CONTINUE LEARNING</p>

            {/* Nav cards grid */}
            {[
              { emoji: '📖', label: 'Flashcards',  sub: 'Study key terms',        color: '#22d3ee',  bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.25)',   action: onStudy },
              { emoji: '⚔️', label: 'Battle Mode',  sub: 'Challenge classmates',   color: '#f87171',  bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   action: onBattle },
              { emoji: '🔥', label: 'Hot Seat',     sub: 'Answer live questions',   color: '#fb923c',  bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)',  action: onHotseat },
              { emoji: '📝', label: 'Read Notes',   sub: 'Review the topic',        color: '#a78bfa',  bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.25)', action: onStudy },
              { emoji: '🔑', label: 'Keywords',     sub: 'Glance key vocabulary',   color: '#fcd34d',  bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', action: onStudy },
              { emoji: '🎯', label: 'Practice',     sub: 'Drill more questions',    color: '#34d399',  bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)', action: onPractice },
            ].map(c => (
              <button
                key={c.label}
                onClick={c.action}
                className="flex items-center gap-4 w-full text-left rounded-2xl px-4 py-3.5 transition-all"
                style={{ background: c.bg, border: `1.5px solid ${c.border}` }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <span style={{ fontSize: 28 }}>{c.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-[15px]" style={{ color: c.color }}>{c.label}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{c.sub}</p>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>›</span>
              </button>
            ))}

            {/* Retake */}
            {selfPaced && fullBank.length > 0 && (
              <button
                onClick={onRetake}
                className="flex items-center gap-4 w-full text-left rounded-2xl px-4 py-3.5 transition-all"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1.5px solid rgba(52,211,153,0.2)' }}
              >
                <span style={{ fontSize: 28 }}>🔄</span>
                <div className="flex-1">
                  <p className="font-semibold text-[15px]" style={{ color: '#34d399' }}>Retake Quiz</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{fullBank.length} questions from the start</p>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>›</span>
              </button>
            )}

            <button onClick={onHome} style={{ color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '8px', textAlign: 'center' }}>
              ← Back to Home
            </button>
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {tab === 'leaderboard' && (
          <div className="max-w-sm mx-auto animate-slideUp">
            {leaderboard.length > 0 ? (
              <Leaderboard players={leaderboard} currentPlayerId={playerId || undefined} compact />
            ) : (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🏆</div>
                <p style={{ color: 'rgba(255,255,255,0.3)' }}>No leaderboard data yet</p>
              </div>
            )}
          </div>
        )}

        {/* REVIEW TAB */}
        {tab === 'review' && (
          <div className="flex flex-col gap-3 max-w-lg mx-auto animate-slideUp">
            {questionResults.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">📝</div>
                <p style={{ color: 'rgba(255,255,255,0.3)' }}>No questions to review</p>
              </div>
            ) : (
              questionResults.map((r, i) => {
                const correctIndex = parseInt(r.question.answer, 10);
                const opts = r.question.options || [];
                return (
                  <div
                    key={i}
                    className="rounded-2xl p-4"
                    style={{
                      background: r.correct ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                      border: `1.5px solid ${r.correct ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
                    }}
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <span style={{ fontSize: 20, lineHeight: 1, marginTop: 2 }}>{r.correct ? '✅' : '❌'}</span>
                      <p className="text-[15px] font-medium leading-snug" style={{ color: '#fff' }}>
                        <span className="text-xs font-mono mr-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Q{i + 1}</span>
                        {r.question.text}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 pl-7">
                      {opts.map((opt, oi) => {
                        const isCorrectOpt = oi === correctIndex;
                        const isSelected = oi === r.selected;
                        let bg = 'rgba(255,255,255,0.04)';
                        let border = 'rgba(255,255,255,0.08)';
                        let color = 'rgba(255,255,255,0.55)';
                        if (isCorrectOpt) { bg = 'rgba(16,185,129,0.12)'; border = 'rgba(52,211,153,0.35)'; color = '#34d399'; }
                        if (isSelected && !isCorrectOpt) { bg = 'rgba(239,68,68,0.12)'; border = 'rgba(248,113,113,0.35)'; color = '#f87171'; }
                        return (
                          <div
                            key={oi}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
                            style={{ background: bg, border: `1px solid ${border}`, color }}
                          >
                            <span style={{ fontSize: 12, opacity: 0.6 }}>{String.fromCharCode(65 + oi)}.</span>
                            <span className="flex-1">{opt}</span>
                            {isCorrectOpt && <span style={{ fontSize: 14 }}>✓</span>}
                            {isSelected && !isCorrectOpt && <span style={{ fontSize: 14 }}>✗</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
}
