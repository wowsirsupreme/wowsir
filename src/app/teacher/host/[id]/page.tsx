'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from '@/hooks/useSession';
import { getQuiz } from '@/lib/firebase/quizzes';
import {
  createSession,
  startSession,
  nextQuestion,
  pauseSession,
  endSession,
} from '@/lib/firebase/sessions';
import type { Quiz } from '@/types/quiz';
import type { Question } from '@/types/question';

type HostPhase = 'setup' | 'lobby' | 'question' | 'reveal' | 'ended';

export default function HostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { user, ready } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<HostPhase>('setup');
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [revealTimer, setRevealTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [antiCheatAlerts, setAntiCheatAlerts] = useState<{ name: string; type: string; time: number }[]>([]);

  const { session, players, leaderboard } = useSession(sessionId);

  useEffect(() => {
    if (!ready || !user) return;
    getQuiz(quizId).then(q => {
      if (!q) { toast('Quiz not found', 'error'); router.push('/teacher'); return; }
      setQuiz(q);
      setQuestions(q.questions || []);
    });
  }, [ready, user, quizId]);

  useEffect(() => {
    players.forEach(p => {
      if (p.tabSwitches > 0) {
        const existing = antiCheatAlerts.find(a => a.name === p.name && a.type === 'tab');
        if (!existing) {
          setAntiCheatAlerts(prev => [...prev, { name: p.name, type: 'Tab Switch', time: Date.now() }]);
        }
      }
    });
  }, [players]);

  async function handleLaunch() {
    if (!user || !quiz) return;
    try {
      const sid = await createSession(
        quizId, quiz.title, user.uid, questions,
        {
          timeLimit: quiz.settings?.timeLimit || 20,
          pointsPerQ: quiz.settings?.pointsPerQ || 100,
          antiCheat: quiz.settings?.antiCheat ?? true,
          showLeaderboard: quiz.settings?.showLeaderboard ?? true,
          shuffleQuestions: quiz.settings?.shuffleQuestions ?? false,
          shuffleOptions: quiz.settings?.shuffleOptions ?? false,
        }
      );
      setSessionId(sid);
      setPhase('lobby');
      toast('Session created! Waiting for players…', 'success');
    } catch { toast('Failed to create session', 'error'); }
  }

  async function handleStart() {
    if (!sessionId) return;
    await startSession(sessionId, questions);
    setCurrentQIdx(0);
    setPhase('question');
    scheduleReveal();
  }

  function scheduleReveal() {
    const limit = (quiz?.settings?.timeLimit || 20) * 1000 + 2000;
    const t = setTimeout(() => setPhase('reveal'), limit);
    setRevealTimer(t);
  }

  function clearRevealTimer() {
    if (revealTimer) { clearTimeout(revealTimer); setRevealTimer(null); }
  }

  async function handleNext() {
    clearRevealTimer();
    const nextIdx = currentQIdx + 1;
    if (nextIdx >= questions.length) {
      await endSession(sessionId!); setPhase('ended'); return;
    }
    await nextQuestion(sessionId!, nextIdx, questions);
    setCurrentQIdx(nextIdx);
    setPhase('question');
    scheduleReveal();
  }

  async function handleReveal() { clearRevealTimer(); setPhase('reveal'); }
  async function handlePause(paused: boolean) {
    if (!sessionId) return;
    await pauseSession(sessionId, paused);
    toast(paused ? 'Session paused' : 'Session resumed', 'info');
  }

  if (!ready || !quiz) {
    return (
      <div className="host-screen min-h-screen flex items-center justify-center">
        <div className="text-3xl animate-goldGlow">🎓</div>
      </div>
    );
  }

  if (!user) { router.replace('/teacher'); return null; }

  // ── SETUP ──
  if (phase === 'setup') {
    return (
      <div className="host-screen min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center mb-8 animate-fadeUp max-w-sm w-full">
          <div className="text-7xl mb-5 animate-goldGlow">🚀</div>
          <h1 className="font-display text-4xl mb-3" style={{ color: '#fff', textShadow: '0 0 30px rgba(201,168,76,0.5)' }}>
            {quiz.title}
          </h1>
          <p className="text-[15px] mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {questions.length} questions · {quiz.settings?.timeLimit || 20}s per question
          </p>

          <div className="flex gap-4 justify-center mb-8">
            {[
              { icon: '❓', val: `${questions.length}`, label: 'Questions' },
              { icon: '⏱️', val: `${quiz.settings?.timeLimit || 20}s`, label: 'Per Q' },
              { icon: '🛡️', val: quiz.settings?.antiCheat ? 'On' : 'Off', label: 'Anti-Cheat' },
            ].map(({ icon, val, label }) => (
              <div
                key={label}
                className="rounded-2xl px-4 py-3 text-center"
                style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
              >
                <div className="text-xl mb-1">{icon}</div>
                <div className="font-mono font-bold text-lg" style={{ color: '#fcd34d' }}>{val}</div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
              </div>
            ))}
          </div>

          <button className="btn-gold-solid" onClick={handleLaunch}>
            ⚡ Launch Session
          </button>

          <button
            onClick={() => router.push('/teacher')}
            className="w-full mt-4 text-[14px] py-3"
            style={{ color: 'rgba(255,255,255,0.3)', minHeight: 44 }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── ENDED ──
  if (phase === 'ended') {
    return (
      <div className="host-screen min-h-screen px-4 py-8 flex flex-col items-center justify-center">
        <div className="text-center mb-8 animate-fadeUp">
          <div className="text-7xl mb-5 animate-crownPop">🏆</div>
          <h1 className="font-display text-4xl mb-2" style={{ color: '#fff' }}>Session Complete!</h1>
          <p className="text-[15px] mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {players.length} players completed
          </p>
        </div>
        <div className="w-full max-w-md mb-8">
          {leaderboard.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-4 px-5 py-3.5 rounded-xl mb-2 animate-slideUp"
              style={{
                background: i === 0 ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${i === 0 ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)'}`,
                animationDelay: `${i * 50}ms`,
              }}
            >
              <span className="font-mono w-6 text-center text-lg">
                {['🥇','🥈','🥉'][i] || <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{i + 1}</span>}
              </span>
              <Avatar id={p.avatarId} size={36} />
              <span className="flex-1 font-medium text-[15px]" style={{ color: '#fff' }}>{p.name}</span>
              <span className="font-mono font-semibold" style={{ color: '#fcd34d' }}>
                {p.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 w-full max-w-md">
          <button
            className="btn-glass btn-glass-gold"
            style={{ flex: 1, fontSize: 15 }}
            onClick={() => router.push(`/teacher/results/${sessionId}`)}
          >
            📊 Full Results
          </button>
          <button
            className="btn-gold-solid"
            style={{ flex: 1, fontSize: 15 }}
            onClick={() => router.push('/teacher')}
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIdx];

  // ── LIVE SESSION ──
  return (
    <div className="host-screen flex flex-col min-h-screen">

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', background: 'rgba(8,6,0,0.6)', position: 'sticky', top: 0, zIndex: 10 }}
      >
        <div className="flex items-center gap-4">
          {/* Code badge */}
          <div
            className="px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)' }}
          >
            <span className="font-mono font-bold text-[15px]" style={{ color: '#fcd34d', letterSpacing: 4 }}>
              {session?.code || '…'}
            </span>
          </div>
          <span className="text-sm flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulseDot inline-block" />
            {players.length} online
          </span>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-glass"
            style={{ fontSize: 13, padding: '8px 16px', minHeight: 40 }}
            onClick={() => handlePause(session?.status !== 'paused')}
          >
            {session?.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            className="btn-glass"
            style={{ fontSize: 13, padding: '8px 16px', minHeight: 40, borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}
            onClick={async () => { await endSession(sessionId!); setPhase('ended'); }}
          >
            End
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Main column */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">

          {/* LOBBY */}
          {phase === 'lobby' && (
            <div className="text-center animate-fadeUp w-full max-w-lg">
              <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Room Code
              </p>
              <div className="code-display-dark mb-8" style={{ color: '#fcd34d', borderColor: 'rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.06)', textShadow: '0 0 24px rgba(201,168,76,0.5)' }}>
                {session?.code || '…'}
              </div>
              <p className="text-lg mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {players.length} player{players.length !== 1 ? 's' : ''} waiting…
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-8 min-h-16">
                {players.map(p => (
                  <div key={p.id} className="flex flex-col items-center gap-1 animate-fadeIn">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                      <Avatar id={p.avatarId} size={32} />
                    </div>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>{p.name}</span>
                  </div>
                ))}
              </div>
              <button
                className="btn-gold-solid"
                style={{ maxWidth: 320, margin: '0 auto' }}
                onClick={handleStart}
                disabled={players.length === 0}
              >
                🚀 Start Quiz ({players.length} players)
              </button>
            </div>
          )}

          {/* QUESTION / REVEAL */}
          {(phase === 'question' || phase === 'reveal') && currentQ && (
            <div className="w-full max-w-2xl animate-fadeUp">
              <p className="text-center text-xs font-mono uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Question {currentQIdx + 1} / {questions.length}
              </p>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full mb-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${((currentQIdx + 1) / questions.length) * 100}%`,
                    background: 'linear-gradient(90deg, #c9a84c, #e8d08a)',
                    boxShadow: '0 0 8px rgba(201,168,76,0.5)',
                  }}
                />
              </div>

              <div
                className="rounded-2xl p-8 mb-5"
                style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}
              >
                <p className="font-display text-[22px] leading-snug" style={{ color: 'rgba(255,255,255,0.95)' }}>
                  {currentQ.text}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {currentQ.options.map((opt, i) => {
                  const isCorrect = phase === 'reveal' && parseInt(currentQ.answer) === i;
                  return (
                    <div
                      key={i}
                      className="px-4 py-3.5 rounded-xl border text-[15px] font-medium transition-all duration-200"
                      style={{
                        borderColor: isCorrect ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)',
                        background: isCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                        color: isCorrect ? '#fff' : 'rgba(255,255,255,0.65)',
                        boxShadow: isCorrect ? '0 0 12px rgba(34,197,94,0.2)' : 'none',
                      }}
                    >
                      <span className="font-mono text-xs mr-2.5 opacity-50">
                        {['A','B','C','D'][i]}
                      </span>
                      {opt}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 justify-center">
                {phase === 'question' && (
                  <button className="btn-glass-gold btn-glass" style={{ fontSize: 15, padding: '12px 28px' }} onClick={handleReveal}>
                    Show Answer
                  </button>
                )}
                {phase === 'reveal' && (
                  <button className="btn-gold-solid" style={{ width: 'auto', fontSize: 15, padding: '14px 32px' }} onClick={handleNext}>
                    {currentQIdx + 1 < questions.length ? 'Next Question →' : 'End Quiz'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div
          className="w-72 flex flex-col overflow-hidden"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Leaderboard */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              🏆 Leaderboard
            </p>
            {leaderboard.slice(0, 10).map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 py-2.5 px-2 rounded-xl mb-1 transition-colors"
                style={{ background: i === 0 ? 'rgba(201,168,76,0.08)' : 'transparent' }}
              >
                <span className="text-base w-5 text-center flex-shrink-0">
                  {['🥇','🥈','🥉'][i] || <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{i + 1}</span>}
                </span>
                <Avatar id={p.avatarId} size={28} />
                <span className="flex-1 text-sm truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{p.name}</span>
                <span className="font-mono text-xs font-semibold" style={{ color: '#fcd34d' }}>
                  {p.score.toLocaleString()}
                </span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.25)' }}>No scores yet</p>
            )}
          </div>

          {/* Anti-cheat */}
          {antiCheatAlerts.length > 0 && (
            <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: '#f87171' }}>
                ⚠️ Anti-Cheat ({antiCheatAlerts.length})
              </p>
              <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
                {antiCheatAlerts.map((a, i) => (
                  <div
                    key={i}
                    className="text-xs px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(255,255,255,0.6)' }}
                  >
                    <span className="font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>{a.name}</span>
                    {' — '}{a.type}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
