'use client';

import { useState, useEffect, useRef, use } from 'react';
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
  updateSessionCloseAt,
  findSessionByCode,
  findActiveSessionForQuiz,
  clearTeacherSession,
  saveSessionResult,
} from '@/lib/firebase/sessions';
import type { SessionResult } from '@/types/session';
import type { Quiz } from '@/types/quiz';
import type { Question } from '@/types/question';

type HostPhase = 'loading' | 'setup' | 'lobby' | 'question' | 'reveal' | 'ended';

/** localStorage key for persisting active session per quiz */
function sessionStorageKey(quizId: string) { return `wq_session_${quizId}`; }

function saveActiveSession(quizId: string, sessionId: string, code: string) {
  try { localStorage.setItem(sessionStorageKey(quizId), JSON.stringify({ sessionId, code })); } catch {}
}
function clearActiveSession(quizId: string) {
  try { localStorage.removeItem(sessionStorageKey(quizId)); } catch {}
}
function loadActiveSession(quizId: string): { sessionId: string; code: string } | null {
  try {
    const raw = localStorage.getItem(sessionStorageKey(quizId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function HostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { user, ready } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Start in 'loading' if a saved session exists — avoids a flash of the setup screen
  const [phase, setPhase] = useState<HostPhase>(() => {
    try {
      const raw = typeof window !== 'undefined'
        ? localStorage.getItem(`wq_session_${quizId}`) : null;
      return raw ? 'loading' : 'setup';
    } catch { return 'setup'; }
  });
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [revealTimer, setRevealTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [savedSession, setSavedSession] = useState<{ sessionId: string; code: string } | null>(null);

  // Close-date picker state (shown on setup screen)
  const [closeAt, setCloseAt] = useState<number | null>(null);
  const [closeAtInput, setCloseAtInput] = useState('');

  // Leaderboard screenshot modal
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const leaderboardRef = useRef<HTMLDivElement>(null);

  const { session, players, leaderboard } = useSession(sessionId);

  useEffect(() => {
    if (!ready || !user) return;
    getQuiz(quizId).then(q => {
      if (!q) { toast('Quiz not found', 'error'); router.push('/teacher'); return; }
      setQuiz(q);
      setQuestions(q.questions || []);
    });
    // Check for a previously saved session and auto-resume if found
    const saved = loadActiveSession(quizId);
    if (saved) {
      setSavedSession(saved);
      // Auto-resume: verify it's still alive then jump straight into the session
      findSessionByCode(saved.code).then(result => {
        if (!result || result.session.status === 'ended') {
          clearActiveSession(quizId);
          setSavedSession(null);
          setPhase('setup');
          return;
        }
        setSessionId(result.sessionId);
        setCurrentQIdx(result.session.currentQ || 0);
        const status = result.session.status;
        if (status === 'lobby') setPhase('lobby');
        else if (status === 'active' || status === 'paused') setPhase('question');
        else setPhase('ended');
        toast('Session resumed automatically', 'success');
      }).catch(() => { setPhase('setup'); });
    }
  }, [ready, user, quizId]);

  function scheduleReveal() {
    const limit = (quiz?.settings?.timeLimit || 20) * 1000 + 2000;
    const t = setTimeout(() => setPhase('reveal'), limit);
    setRevealTimer(t);
  }

  function clearRevealTimer() {
    if (revealTimer) { clearTimeout(revealTimer); setRevealTimer(null); }
  }

  async function handleLaunch() {
    if (!user || !quiz) return;
    // Guard: prevent creating a duplicate active session for this quiz
    try {
      const existing = await findActiveSessionForQuiz(user.uid, quizId);
      if (existing) {
        // An active session already exists — resume it instead of creating a new one
        saveActiveSession(quizId, existing.sessionId, existing.code);
        setSavedSession({ sessionId: existing.sessionId, code: existing.code });
        toast('An active session already exists for this quiz. Use "Resume" to continue it.', 'info');
        return;
      }
    } catch { /* if the check fails, allow creation to proceed */ }
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
        },
        closeAt ?? undefined
      );
      // Auto-start immediately — no separate "Start" button needed
      await startSession(sid, questions);
      setSessionId(sid);
      setCurrentQIdx(0);
      setPhase('question');
      scheduleReveal();
      saveActiveSession(quizId, sid, '');   // code filled once session loads
      toast('Session live! Share the room code with students.', 'success');
    } catch (err) { console.error('createSession failed:', err); toast('Failed to create session', 'error'); }
  }

  // Save code once session meta loads
  useEffect(() => {
    if (sessionId && session?.code) saveActiveSession(quizId, sessionId, session.code);
  }, [sessionId, session?.code]);

  async function handleResumeSession() {
    if (!savedSession) return;
    // Verify it's still active
    try {
      const result = await findSessionByCode(savedSession.code);
      if (!result || result.session.status === 'ended') {
        clearActiveSession(quizId);
        setSavedSession(null);
        toast('That session has ended', 'info');
        return;
      }
      setSessionId(result.sessionId);
      setCurrentQIdx(result.session.currentQ || 0);
      const status = result.session.status;
      if (status === 'lobby') setPhase('lobby');
      else if (status === 'active' || status === 'paused') {
        setPhase('question');
      } else {
        setPhase('ended');
      }
      toast('Session resumed', 'success');
    } catch {
      toast('Could not resume session', 'error');
    }
  }

  async function persistResult() {
    if (!sessionId || !session || !user || !quiz) return;
    try {
      const result: SessionResult = {
        id: sessionId,
        sessionId,
        quizId,
        quizTitle: quiz.title,
        teacherId: user.uid,
        completedAt: Date.now(),
        code: session.code,
        summary: {
          totalPlayers: players.length,
          avgScore: players.length ? players.reduce((a, p) => a + p.score, 0) / players.length : 0,
          avgAccuracy: players.length ? players.reduce((a, p) => a + (p.total > 0 ? p.correct / p.total : 0), 0) / players.length : 0,
          topScore: players.length ? Math.max(...players.map(p => p.score)) : 0,
        },
        playerResults: players.map(p => ({
          name: p.name,
          score: p.score,
          correct: p.correct,
          total: p.total,
          accuracy: p.total > 0 ? p.correct / p.total : 0,
          streak: p.bestStreak,
          tabSwitches: p.tabSwitches || 0,
        })),
        questionStats: questions.map((q, qIndex) => {
          const answers = players
            .map(p => p.answers?.[qIndex])
            .filter(Boolean) as { correct: boolean; timeMs: number }[];
          return {
            qIndex,
            text: q.text,
            correctCount: answers.filter(a => a.correct).length,
            totalCount: answers.length,
            avgTimeMs: answers.length ? answers.reduce((s, a) => s + (a.timeMs || 0), 0) / answers.length : undefined,
          };
        }),
      };
      await saveSessionResult(result);
    } catch { /* best-effort — session still ends */ }
  }

  async function handleNext() {
    clearRevealTimer();
    const nextIdx = currentQIdx + 1;
    if (nextIdx >= questions.length) {
      await persistResult();
      await endSession(sessionId!);
      if (user) clearTeacherSession(user.uid, sessionId!);
      clearActiveSession(quizId);
      setPhase('ended');
      return;
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

  async function handleEndSession() {
    if (!sessionId) return;
    await persistResult();
    await endSession(sessionId);
    if (user) clearTeacherSession(user.uid, sessionId);
    clearActiveSession(quizId);
    setPhase('ended');
  }

  /** Leave the session running — students can keep playing self-paced */
  function handleLeaveRunning() {
    toast('Session left running — students can continue. Return here to resume.', 'info');
    router.push('/teacher');
  }

  /** Update close-at from the picker input */
  function handleCloseAtChange(val: string) {
    setCloseAtInput(val);
    if (!val) { setCloseAt(null); return; }
    const ts = new Date(val).getTime();
    if (!isNaN(ts)) setCloseAt(ts);
  }

  /** Update close-at for a live session */
  async function handleUpdateCloseAt() {
    if (!sessionId) return;
    await updateSessionCloseAt(sessionId, closeAt);
    toast(closeAt ? `Session closes at ${new Date(closeAt).toLocaleString()}` : 'Close date removed', 'success');
  }

  /** Download leaderboard as a PNG image using Canvas API */
  function downloadLeaderboard() {
    const top = leaderboard.slice(0, 15);
    const scale = 2;
    const W = 560;
    const rowH = 50;
    const headerH = 100;
    const H = headerH + top.length * rowH + 40;

    const canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#050e08';
    ctx.fillRect(0, 0, W, H);

    // Subtle border glow
    ctx.strokeStyle = 'rgba(201,168,76,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

    // Title
    ctx.fillStyle = '#fcd34d';
    ctx.font = `bold ${26 * 1}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(quiz?.title || 'Quiz Results', W / 2, 44);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = `${13}px system-ui, sans-serif`;
    ctx.fillText(`${players.length} players · ${new Date().toLocaleDateString()}`, W / 2, 68);

    // Divider
    ctx.strokeStyle = 'rgba(201,168,76,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, 84);
    ctx.lineTo(W - 24, 84);
    ctx.stroke();

    // Rows
    const medals = ['🥇', '🥈', '🥉'];
    top.forEach((p, i) => {
      const y = headerH + i * rowH;
      const isFirst = i === 0;

      if (isFirst) {
        ctx.fillStyle = 'rgba(201,168,76,0.1)';
        ctx.fillRect(16, y + 3, W - 32, rowH - 6);
      }

      // Rank
      ctx.textAlign = 'left';
      ctx.font = `${18}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(i < 3 ? medals[i] : `${i + 1}`, 30, y + rowH / 2 + 7);

      // Name
      ctx.font = `${15}px system-ui, sans-serif`;
      ctx.fillStyle = isFirst ? '#fff' : 'rgba(255,255,255,0.8)';
      const name = p.name.length > 22 ? p.name.slice(0, 21) + '…' : p.name;
      ctx.fillText(name, 72, y + rowH / 2 + 6);

      // Score
      ctx.textAlign = 'right';
      ctx.font = `bold ${15}px monospace`;
      ctx.fillStyle = '#fcd34d';
      ctx.fillText(p.score.toLocaleString(), W - 30, y + rowH / 2 + 6);
    });

    const link = document.createElement('a');
    link.download = `leaderboard-${session?.code || 'quiz'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // ── LOADING ──
  if (!ready || !quiz || phase === 'loading') {
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
      <div className="host-screen min-h-screen flex flex-col" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(201,168,76,0.12) 0%, transparent 60%), #050a06' }}>
        {/* Top nav */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.push('/teacher')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
          >
            ← Dashboard
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
          <div style={{ width: '100%', maxWidth: 480 }} className="animate-fadeUp">

            {/* Quiz title card */}
            <div style={{
              borderRadius: 20, padding: '28px 28px 24px',
              background: 'rgba(201,168,76,0.06)',
              border: '1px solid rgba(201,168,76,0.2)',
              marginBottom: 20,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 52, marginBottom: 16 }} className="animate-goldGlow">🚀</div>
              <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                {quiz.title}
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                Ready to go live
              </p>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
                {[
                  { icon: '❓', val: `${questions.length}`, label: 'Questions' },
                  { icon: '⏱', val: `${quiz.settings?.timeLimit || 20}s`, label: 'Per Q' },
                  { icon: '🛡', val: quiz.settings?.antiCheat ? 'On' : 'Off', label: 'Anti-cheat' },
                ].map(s => (
                  <div key={s.label} style={{
                    flex: 1, borderRadius: 12, padding: '10px 8px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fcd34d', fontFamily: 'monospace' }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto-resume banner */}
            {savedSession && (
              <div style={{
                borderRadius: 14, padding: '14px 18px',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
                marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#34d399' }}>
                    ↩ Session in progress
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>
                    Code: {savedSession.code || '…'}
                  </p>
                </div>
                <button
                  className="btn-glass btn-glass-green"
                  style={{ fontSize: 12, padding: '8px 16px', minHeight: 36, flexShrink: 0 }}
                  onClick={handleResumeSession}
                >
                  Resume →
                </button>
              </div>
            )}

            {/* Close date picker */}
            <div style={{
              borderRadius: 14, padding: '16px 18px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              marginBottom: 20,
            }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', marginBottom: 8 }}>
                AUTO-CLOSE DATE (optional)
              </label>
              <input
                type="datetime-local"
                value={closeAtInput}
                onChange={e => handleCloseAtChange(e.target.value)}
                style={{
                  width: '100%', borderRadius: 10, padding: '10px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${closeAt ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  color: closeAt ? '#fcd34d' : 'rgba(255,255,255,0.5)',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
              {closeAt && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(201,168,76,0.7)' }}>
                  Students can't join after {new Date(closeAt).toLocaleString()}
                </p>
              )}
            </div>

            <button className="btn-gold-solid" style={{ fontSize: 16 }} onClick={handleLaunch}>
              ⚡ Launch Session
            </button>
          </div>
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
        <div className="flex gap-3 w-full max-w-md flex-wrap">
          <button
            className="btn-glass"
            style={{ flex: 1, fontSize: 14, minWidth: 120 }}
            onClick={downloadLeaderboard}
          >
            📥 Save Scores
          </button>
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
  // Students with tab switches, sorted by count desc
  const tabSwitchers = players
    .filter(p => p.tabSwitches > 0)
    .sort((a, b) => b.tabSwitches - a.tabSwitches);

  // ── LIVE SESSION ──
  return (
    <div className="host-screen flex flex-col min-h-screen">

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', background: 'rgba(8,6,0,0.6)', position: 'sticky', top: 0, zIndex: 10 }}
      >
        <div className="flex items-center gap-4">
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
            style={{ fontSize: 13, padding: '8px 16px', minHeight: 40, color: 'rgba(255,255,255,0.5)' }}
            onClick={handleLeaveRunning}
          >
            Leave
          </button>
          <button
            className="btn-glass"
            style={{ fontSize: 13, padding: '8px 16px', minHeight: 40, borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}
            onClick={handleEndSession}
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
            <div className="animate-fadeUp w-full max-w-xl">

              {/* ── Room code hero ── */}
              <div style={{
                borderRadius: 24, padding: '28px 24px 20px',
                background: 'rgba(201,168,76,0.06)',
                border: '1px solid rgba(201,168,76,0.22)',
                marginBottom: 14, textAlign: 'center',
              }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
                  Room Code
                </p>
                <div style={{
                  fontSize: 64, fontFamily: 'var(--font-mono)', fontWeight: 800,
                  color: '#fcd34d', letterSpacing: 10,
                  textShadow: '0 0 32px rgba(201,168,76,0.5)',
                  lineHeight: 1, marginBottom: 16,
                }}>
                  {session?.code || '…'}
                </div>
                {/* Share buttons */}
                {session?.code && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      onClick={() => navigator.clipboard.writeText(session.code).then(() => toast('Code copied!', 'success'))}
                      className="btn-glass"
                      style={{ fontSize: 12, padding: '8px 16px', minHeight: 0 }}
                    >
                      📋 Copy code
                    </button>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/join?code=${session.code}`;
                        navigator.clipboard.writeText(url).then(() => toast('Join link copied!', 'success'));
                      }}
                      className="btn-glass"
                      style={{ fontSize: 12, padding: '8px 16px', minHeight: 0 }}
                    >
                      🔗 Copy join link
                    </button>
                  </div>
                )}
              </div>

              {/* ── Live status ── */}
              <div style={{
                borderRadius: 14, padding: '11px 16px', marginBottom: 14,
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', flexShrink: 0, animation: 'pulseDot 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 13, color: '#6ee7b7', fontWeight: 600 }}>
                  Quiz is live — students can join and answer immediately
                </span>
              </div>

              {/* ── Players joined ── */}
              <div style={{
                borderRadius: 20, padding: '18px 20px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: players.length > 0 ? 14 : 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
                    Players joined
                  </p>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700,
                    color: players.length > 0 ? '#fcd34d' : 'rgba(255,255,255,0.25)',
                  }}>
                    {players.length}
                  </span>
                </div>
                {players.length === 0 ? (
                  <p style={{ margin: '10px 0 2px', fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                    Waiting for students to join…
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {players.map(p => (
                      <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} className="animate-fadeIn">
                        <div style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: 'rgba(201,168,76,0.08)',
                          border: '1px solid rgba(201,168,76,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Avatar id={p.avatarId} size={30} />
                        </div>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Auto-close (secondary) ── */}
              <details style={{ borderRadius: 14, overflow: 'hidden' }}>
                <summary style={{
                  padding: '12px 16px', cursor: 'pointer', fontSize: 12,
                  color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14,
                  listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>⏰ Auto-close {closeAt ? `· ${new Date(closeAt).toLocaleString()}` : '(optional)'}</span>
                  <span style={{ opacity: 0.5 }}>▾</span>
                </summary>
                <div style={{
                  padding: '12px 16px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderTop: 'none',
                  borderRadius: '0 0 14px 14px',
                }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="datetime-local"
                      value={closeAtInput}
                      onChange={e => handleCloseAtChange(e.target.value)}
                      style={{
                        flex: 1, borderRadius: 10, padding: '9px 12px', fontSize: 13,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: closeAt ? '#fcd34d' : 'rgba(255,255,255,0.4)',
                        outline: 'none',
                      }}
                    />
                    <button className="btn-glass" style={{ fontSize: 12, padding: '8px 14px', minHeight: 0 }} onClick={handleUpdateCloseAt}>
                      Set
                    </button>
                  </div>
                </div>
              </details>

            </div>
          )}

          {/* QUESTION / REVEAL */}
          {(phase === 'question' || phase === 'reveal') && currentQ && (
            <div className="w-full max-w-2xl animate-fadeUp">
              <p className="text-center text-xs font-mono uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Question {currentQIdx + 1} / {questions.length}
              </p>

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
          <div className="flex-1 overflow-y-auto p-4" ref={leaderboardRef}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
                🏆 Leaderboard
              </p>
              {leaderboard.length > 0 && (
                <button
                  title="Download leaderboard as image"
                  onClick={downloadLeaderboard}
                  className="text-xs px-2 py-1 rounded-lg transition-colors"
                  style={{
                    background: 'rgba(201,168,76,0.08)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    color: 'rgba(201,168,76,0.7)',
                  }}
                >
                  📥
                </button>
              )}
            </div>
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

          {/* Tab-switch tracker — live counts from player data */}
          {tabSwitchers.length > 0 && (
            <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: '#f87171' }}>
                ⚠️ Tab Switches
              </p>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {tabSwitchers.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.85)' }}>{p.name}</span>
                    <span
                      className="font-mono font-bold ml-2 px-1.5 py-0.5 rounded"
                      style={{
                        background: p.tabSwitches >= 5 ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.15)',
                        color: p.tabSwitches >= 5 ? '#fca5a5' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      ×{p.tabSwitches}
                    </span>
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
