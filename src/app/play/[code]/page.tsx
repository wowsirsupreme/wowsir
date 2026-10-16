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
import QuizNav from '@/components/QuizNav';
import type { Question } from '@/types/question';
import type { SessionPlayer } from '@/types/session';

type Phase = 'loading' | 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended' | 'round-review';

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
  const [roundScore, setRoundScore] = useState(0); // score at start of this round
  const [roundResultsStartIdx, setRoundResultsStartIdx] = useState(0); // index into questionResults where current round starts

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
      // Round done — mark these questions as used and show round review
      const newUsed = new Set([...usedIndices, ...localQuestions.map((lq) => {
        return fullBank.findIndex(bq =>
          (bq.id && lq.id) ? bq.id === lq.id : bq.text === lq.text
        );
      }).filter(i => i >= 0)]);
      setUsedIndices(newUsed);
      setRoundScore(score);
      setPhase('round-review'); // always show review before offering next round / retake
      return;
    }
    setLocalQIdx(next);
    setSelected(null);
    setAnswerTime(null);
    setQuestionStartTime(Date.now());
    setPhase('question');
  }

  // ── Start next round with remaining questions ──
  function handleStartNextRound(newUsed: Set<number>) {
    const remaining = fullBank.filter((_, i) => !newUsed.has(i));
    setRoundResultsStartIdx(questionResults.length); // new round's results start here
    setLocalQuestions(remaining);
    setLocalQIdx(0);
    setSelected(null);
    setAnswerTime(null);
    setRoundNum(r => r + 1);
    setQuestionStartTime(Date.now());
    setPhase('question');
  }

  // ── Retake from the very beginning ──
  function handleRetake() {
    setScore(0); setStreak(0); setNumCorrect(0); setNumAnswered(0);
    setSelected(null); setFinalRank(null); setRoundNum(1); setRoundScore(0);
    setUsedIndices(new Set()); setQuestionResults([]); setRoundResultsStartIdx(0);
    setLocalQuestions(fullBank); setLocalQIdx(0); setPhase('question');
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
      onRetake={handleRetake}
      onStudy={() => router.push('/study')}
      onPractice={() => router.push('/practice')}
      onBattle={() => router.push(`/battle/${code}?name=${encodeURIComponent(playerName)}`)}
      onHotseat={() => router.push('/hotseat')}
      onHome={() => router.push('/')}
    />;
  }

  // ── ROUND REVIEW ──
  if (phase === 'round-review') {
    const remaining = fullBank.filter((_, i) => !usedIndices.has(i));
    const totalDone = fullBank.length - remaining.length;
    const roundResults = questionResults.slice(roundResultsStartIdx);
    const roundCorrect = roundResults.filter(r => r.correct).length;
    const roundWrong = roundResults.length - roundCorrect;
    const hasMore = remaining.length > 0;

    return (
      <div className="play-screen flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(2,12,6,0.5)', backdropFilter: 'blur(12px)' }}>
          <div className="text-6xl">🏁</div>
          <div className="text-center">
            <h2 className="font-display text-2xl" style={{ color: '#fff' }}>Round {roundNum} Done!</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {totalDone} / {fullBank.length || localQuestions.length} questions complete
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold" style={{ color: '#34d399' }}>{score.toLocaleString()}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>total score</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 px-4 pt-4 pb-2">
          {[
            { label: 'Correct', value: roundCorrect, color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(52,211,153,0.25)' },
            { label: 'Wrong',   value: roundWrong,   color: '#f87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(248,113,113,0.25)' },
          ].map(s => (
            <div key={s.label} className="flex-1 rounded-xl py-3 text-center" style={{ background: s.bg, border: `1.5px solid ${s.border}` }}>
              <p className="font-mono text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {fullBank.length > 0 && (
          <div className="px-4 py-2">
            <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-2 rounded-full" style={{ width: `${(totalDone / fullBank.length) * 100}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )}

        {/* Question review */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {roundResults.map((r, i) => {
            const correctIndex = parseInt(r.question.answer, 10);
            const opts = r.question.options || [];
            return (
              <div key={i} className="rounded-2xl p-4" style={{ background: r.correct ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)', border: `1.5px solid ${r.correct ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
                <div className="flex items-start gap-2 mb-3">
                  <span style={{ fontSize: 18, lineHeight: 1, marginTop: 2 }}>{r.correct ? '✅' : '❌'}</span>
                  <p className="text-[14px] font-medium leading-snug" style={{ color: '#fff' }}>
                    <span className="text-xs font-mono mr-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Q{roundResultsStartIdx + i + 1}</span>
                    {r.question.text}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 pl-6">
                  {opts.map((opt, oi) => {
                    const isCorrectOpt = oi === correctIndex;
                    const isSelected = oi === r.selected;
                    let bg = 'rgba(255,255,255,0.04)', border = 'rgba(255,255,255,0.08)', color = 'rgba(255,255,255,0.5)';
                    if (isCorrectOpt) { bg = 'rgba(16,185,129,0.12)'; border = 'rgba(52,211,153,0.35)'; color = '#34d399'; }
                    if (isSelected && !isCorrectOpt) { bg = 'rgba(239,68,68,0.12)'; border = 'rgba(248,113,113,0.35)'; color = '#f87171'; }
                    return (
                      <div key={oi} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: bg, border: `1px solid ${border}`, color }}>
                        <span style={{ fontSize: 11, opacity: 0.6 }}>{String.fromCharCode(65 + oi)}.</span>
                        <span className="flex-1">{opt}</span>
                        {isCorrectOpt && <span>✓</span>}
                        {isSelected && !isCorrectOpt && <span>✗</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons — sticky at bottom */}
        <div className="px-4 py-4 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(2,12,6,0.8)', backdropFilter: 'blur(12px)' }}>
          {hasMore && (
            <button
              onClick={() => handleStartNextRound(usedIndices)}
              className="btn-glass btn-glass-green"
              style={{ width: '100%', fontSize: 16, padding: '15px 24px' }}
            >
              ▶ Round {roundNum + 1} — {remaining.length} more question{remaining.length !== 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={handleRetake}
            style={{ width: '100%', padding: '13px', borderRadius: 14, background: 'rgba(52,211,153,0.08)', border: '1.5px solid rgba(52,211,153,0.2)', color: '#34d399', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
          >
            🔄 Retake Quiz
          </button>
          <button
            onClick={() => setPhase('ended')}
            style={{ width: '100%', padding: '10px', color: 'rgba(255,255,255,0.28)', fontWeight: 500, fontSize: 14, cursor: 'pointer', background: 'none', border: 'none' }}
          >
            {hasMore ? "I'm done for now →" : '📊 See Final Results →'}
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
      <QuizNav />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-5">

        {/* Room code chip */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 999,
          background: 'rgba(52,211,153,0.08)',
          border: '1px solid rgba(52,211,153,0.2)',
        }}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulseDot inline-block" />
          <span className="font-mono font-bold text-lg tracking-widest" style={{ color: '#34d399' }}>{code}</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            · {players.length} {(players.length as number) === 1 ? 'player' : 'players'}
          </span>
        </div>

        {/* Avatar + name + status */}
        <div className="flex flex-col items-center gap-3 animate-fadeUp">
          <div
            style={{
              width: 88, height: 88, borderRadius: 24,
              background: 'rgba(16,185,129,0.12)',
              border: '2px solid rgba(16,185,129,0.3)',
              boxShadow: '0 0 36px rgba(16,185,129,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Avatar id={avatarId} size={56} />
          </div>
          <p className="font-display text-2xl" style={{ color: '#fff' }}>{playerName}</p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 14px', borderRadius: 999,
            background: questionsLoading
              ? 'rgba(255,255,255,0.05)'
              : ready ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${ready && !questionsLoading ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)'}`,
          }}>
            {questionsLoading ? (
              <>
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulseDot" style={{ background: '#10b981', animationDelay: `${i * 0.2}s` }} />
                ))}
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Loading quiz…</span>
              </>
            ) : ready ? (
              <span className="text-xs font-medium" style={{ color: '#34d399' }}>✓ Ready — quiz is live!</span>
            ) : (
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Joining…</span>
            )}
          </div>
        </div>

        {/* Friends in the room */}
        {(players as SessionPlayer[]).length > 0 && (
          <div
            className="w-full animate-fadeUp"
            style={{ maxWidth: 400, borderRadius: 20, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p style={{ margin: '0 0 12px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {(players as SessionPlayer[]).length} {(players as SessionPlayer[]).length === 1 ? 'player' : 'players'} in the room
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {(players as SessionPlayer[]).map(p => (
                <div key={p.id} className="animate-fadeIn flex flex-col items-center gap-1.5">
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: p.name === playerName ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${p.name === playerName ? 'rgba(52,211,153,0.45)' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: p.name === playerName ? '0 0 14px rgba(16,185,129,0.2)' : 'none',
                  }}>
                    <Avatar id={p.avatarId} size={32} />
                  </div>
                  <span style={{ fontSize: 11, color: p.name === playerName ? '#6ee7b7' : 'rgba(255,255,255,0.55)', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                    {p.name === playerName ? 'You' : p.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Music player */}
        <div
          className="w-full animate-fadeUp"
          style={{ maxWidth: 400, borderRadius: 20, padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p style={{ margin: '0 0 10px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Lobby Music
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
                  <span style={{ fontSize: 22 }}>{t.emoji}</span>
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
          <div className="w-full animate-fadeUp" style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn-glass btn-glass-green"
              style={{ width: '100%', fontSize: 17, padding: '16px 24px' }}
              onClick={onStart}
            >
              🚀 Play now ({localQuestions.length} questions)
            </button>
            <button
              onClick={onBattle}
              style={{
                width: '100%', padding: '13px', borderRadius: 14,
                background: 'rgba(239,68,68,0.08)',
                border: '1.5px solid rgba(239,68,68,0.2)',
                color: '#f87171', fontWeight: 600, fontSize: 14,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              ⚔️ Battle Mode instead
            </button>
          </div>
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
    <div className="play-screen flex flex-col min-h-screen" style={{ paddingBottom: 72 }}>
      <QuizNav />

      {/* ── Hero section ── */}
      <div className="flex flex-col items-center pt-10 pb-6 px-4 text-center animate-slideUp">
        <div
          style={{
            fontSize: 72, marginBottom: 12, lineHeight: 1,
            filter: `drop-shadow(0 0 28px ${isPerfect ? 'rgba(201,168,76,1)' : finalRank === 1 ? 'rgba(201,168,76,0.9)' : 'rgba(16,185,129,0.7)'})`,
          }}
          className="animate-crownPop"
        >
          {isPerfect ? '⭐' : finalRank === 1 ? '🏆' : '🎉'}
        </div>
        <h2 className="font-display" style={{ fontSize: 40, color: '#fff', margin: '0 0 6px' }}>
          {isPerfect ? 'Perfect Score!' : selfPaced ? 'Quiz Complete!' : 'Game Over!'}
        </h2>
        {isPerfect && (
          <p style={{ fontSize: 15, marginBottom: 8, fontWeight: 600, color: '#fcd34d', textShadow: '0 0 12px rgba(201,168,76,0.6)' }}>
            {numCorrect}/{numAnswered} correct — flawless! 🌟
          </p>
        )}

        {/* Score + rank row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '6px 0 4px' }}>
          <p className="font-mono animate-scoreSlide" style={{ fontSize: 52, fontWeight: 800, color: '#34d399', textShadow: '0 0 28px rgba(52,211,153,0.6)', margin: 0, lineHeight: 1 }}>
            {score.toLocaleString()}
          </p>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>pts</span>
          {finalRank && (
            <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', marginLeft: 4 }}>
              · Rank <span style={{ fontWeight: 700, color: '#fcd34d' }}>#{finalRank}</span>
            </span>
          )}
        </div>

        {/* Quick stats row */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {[
            { label: 'Correct', value: numCorrect, color: '#34d399' },
            { label: 'Wrong', value: numWrong, color: '#f87171' },
            { label: 'Answered', value: numAnswered, color: 'rgba(255,255,255,0.5)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '10px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="font-mono" style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 11, marginTop: 4, color: 'rgba(255,255,255,0.3)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 4, margin: '0 16px 4px', padding: 4, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {([
          { id: 'results', label: '📊 Results' },
          { id: 'leaderboard', label: '🏆 Board' },
          { id: 'review', label: '📝 Review' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 10,
              fontSize: 13, fontWeight: 500,
              background: tab === t.id ? 'rgba(52,211,153,0.15)' : 'transparent',
              color: tab === t.id ? '#34d399' : 'rgba(255,255,255,0.4)',
              border: tab === t.id ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, padding: '12px 16px 16px', overflowY: 'auto' }}>

        {/* RESULTS TAB */}
        {tab === 'results' && (
          <div className="animate-slideUp" style={{ maxWidth: 680, margin: '0 auto' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
              Continue Learning
            </p>

            {/* 2-column card grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {[
                { emoji: '📖', label: 'Flashcards',  sub: 'Study key terms',        color: '#22d3ee',  bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.25)',   action: onStudy },
                { emoji: '⚔️', label: 'Battle Mode',  sub: 'Challenge classmates',   color: '#f87171',  bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   action: onBattle },
                { emoji: '🔥', label: 'Hot Seat',     sub: 'Solo 15-second rounds',  color: '#fb923c',  bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)',  action: onHotseat },
                { emoji: '📝', label: 'Read Notes',   sub: 'Review the topic',        color: '#a78bfa',  bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.25)', action: onStudy },
                { emoji: '🔑', label: 'Keywords',     sub: 'Glance key vocabulary',   color: '#fcd34d',  bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', action: onStudy },
                { emoji: '🎯', label: 'Practice',     sub: 'Drill more questions',    color: '#34d399',  bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)', action: onPractice },
              ].map(c => (
                <button
                  key={c.label}
                  onClick={c.action}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    width: '100%', textAlign: 'left', padding: '14px 16px',
                    borderRadius: 18, background: c.bg, border: `1.5px solid ${c.border}`,
                    cursor: 'pointer', transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <span style={{ fontSize: 30, lineHeight: 1 }}>{c.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: c.color, margin: 0 }}>{c.label}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{c.sub}</p>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 20 }}>›</span>
                </button>
              ))}
            </div>

            {/* Retake — full width below grid */}
            {selfPaced && fullBank.length > 0 && (
              <button
                onClick={onRetake}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, marginTop: 10,
                  width: '100%', textAlign: 'left', padding: '14px 16px',
                  borderRadius: 18, background: 'rgba(52,211,153,0.08)', border: '1.5px solid rgba(52,211,153,0.2)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 28 }}>🔄</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: '#34d399', margin: 0 }}>Retake Quiz</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{fullBank.length} questions from the start</p>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 20 }}>›</span>
              </button>
            )}
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {tab === 'leaderboard' && (
          <div style={{ maxWidth: 520, margin: '0 auto' }} className="animate-slideUp">
            {leaderboard.length > 0 ? (
              <Leaderboard players={leaderboard} currentPlayerId={playerId || undefined} compact />
            ) : (
              <div style={{ textAlign: 'center', paddingTop: 48 }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
                <p style={{ color: 'rgba(255,255,255,0.3)' }}>No leaderboard data yet</p>
              </div>
            )}
          </div>
        )}

        {/* REVIEW TAB */}
        {tab === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 680, margin: '0 auto' }} className="animate-slideUp">
            {questionResults.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 48 }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>📝</div>
                <p style={{ color: 'rgba(255,255,255,0.3)' }}>No questions to review</p>
              </div>
            ) : (
              questionResults.map((r, i) => {
                const correctIndex = parseInt(r.question.answer, 10);
                const opts = r.question.options || [];
                return (
                  <div
                    key={i}
                    style={{
                      borderRadius: 18, padding: 16,
                      background: r.correct ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                      border: `1.5px solid ${r.correct ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 20, lineHeight: 1, marginTop: 2 }}>{r.correct ? '✅' : '❌'}</span>
                      <p style={{ fontSize: 15, fontWeight: 500, color: '#fff', margin: 0, lineHeight: 1.4 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginRight: 6 }}>Q{i + 1}</span>
                        {r.question.text}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 28 }}>
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
                            style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, padding: '8px 12px', fontSize: 14, background: bg, border: `1px solid ${border}`, color }}
                          >
                            <span style={{ fontSize: 12, opacity: 0.6 }}>{String.fromCharCode(65 + oi)}.</span>
                            <span style={{ flex: 1 }}>{opt}</span>
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
