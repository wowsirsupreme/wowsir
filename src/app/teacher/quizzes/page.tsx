'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Pencil, BarChart2, Plus, BookOpen, Zap, Users, StopCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getTeacherQuizzes } from '@/lib/firebase/quizzes';
import { getTeacherActiveSessions, endSession, clearTeacherSession, type TeacherActiveSession } from '@/lib/firebase/sessions';
import type { Quiz } from '@/types/quiz';

const BG = [
  'radial-gradient(ellipse 80% 50% at 30% 0%,   rgba(56,189,248,0.13) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 20%,  rgba(99,102,241,0.1)  0%, transparent 50%)',
  '#050814',
].join(',');

export default function MyQuizzesPage() {
  const router = useRouter();
  const { user, profile, ready } = useAuth();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeSessions, setActiveSessions] = useState<TeacherActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [endingSession, setEndingSession] = useState<string | null>(null);

  const loadData = useCallback(async (uid: string) => {
    try {
      const [qs, sessions] = await Promise.all([
        getTeacherQuizzes(uid),
        getTeacherActiveSessions(uid).catch(() => [] as TeacherActiveSession[]),
      ]);
      setQuizzes(qs);
      setActiveSessions(sessions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quizzes');
    }
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    setLoading(true);
    loadData(user.uid).finally(() => setLoading(false));
  }, [ready, user, loadData]);

  async function handleRefresh() {
    if (!user) return;
    setRefreshing(true);
    await loadData(user.uid);
    setRefreshing(false);
  }

  async function handleEndSession(session: TeacherActiveSession) {
    if (!user) return;
    setEndingSession(session.sessionId);
    try {
      await endSession(session.sessionId);
      await clearTeacherSession(user.uid, session.sessionId);
      setActiveSessions(prev => prev.filter(s => s.sessionId !== session.sessionId));
    } catch { /* ignore */ }
    setEndingSession(null);
  }

  // Map quizId → active session for quick lookup
  const sessionByQuiz = new Map(activeSessions.map(s => [s.quizId, s]));

  const liveCount = activeSessions.length;

  if (!ready || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div style={{ animation: 'float 2s ease-in-out infinite', filter: 'drop-shadow(0 0 16px rgba(56,189,248,0.4))' }}>
          <BookOpen size={40} color="#7dd3fc" strokeWidth={1.5} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>

      {/* Nav */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(5,8,20,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => router.push('/teacher')}
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', minHeight: 44, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <ChevronLeft size={14} /> Dashboard
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh sessions"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 38, height: 38, borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                opacity: refreshing ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button
              onClick={() => router.push('/teacher/quiz/new')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                background: 'rgba(201,168,76,0.12)',
                border: '1.5px solid rgba(201,168,76,0.3)',
                color: '#e6c84a', fontWeight: 600, fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <Plus size={13} strokeWidth={2.5} /> New Quiz
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 24px 64px' }}>

        {/* Header */}
        <div className="animate-fadeUp" style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8 }}>
            MY QUIZZES
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: '#fff', lineHeight: 1.15, marginBottom: 4 }}>
            All Quizzes
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
            {loading ? 'Loading…' : `${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''}`}
            {!loading && liveCount > 0 && (
              <span style={{ marginLeft: 8, fontSize: 12, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                · {liveCount} live
              </span>
            )}
          </p>
        </div>

        {/* Live sessions summary banner */}
        {!loading && liveCount > 0 && (
          <div
            className="animate-fadeUp"
            style={{
              marginBottom: 24, borderRadius: 16,
              border: '1.5px solid rgba(16,185,129,0.3)',
              background: 'rgba(16,185,129,0.06)',
              padding: '14px 18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulseDot inline-block" style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#6ee7b7', fontWeight: 600, margin: 0 }}>
                {liveCount} active session{liveCount !== 1 ? 's' : ''} running
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0, marginLeft: 4 }}>
                — manage or end them below
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            <div style={{ marginBottom: 10, animation: 'float 2s ease-in-out infinite', display: 'flex', justifyContent: 'center' }}>
              <BookOpen size={32} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
            </div>
            Loading quizzes…
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ borderRadius: 16, border: '1.5px solid rgba(239,68,68,0.3)', padding: '20px 24px', background: 'rgba(239,68,68,0.08)' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,100,100,0.9)', lineHeight: 1.6, margin: 0 }}>⚠️ {error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && quizzes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎯</div>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>No quizzes yet</p>
            <button
              onClick={() => router.push('/teacher/quiz/new')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 12,
                background: 'linear-gradient(135deg, #c9a84c, #e8d08a)',
                color: '#0d0d14', fontWeight: 700, fontSize: 15,
                cursor: 'pointer', border: 'none',
              }}
            >
              <Plus size={15} /> Create your first quiz
            </button>
          </div>
        )}

        {/* Quiz list */}
        {!loading && quizzes.length > 0 && (
          <div style={{ display: 'grid', gap: 12 }}>
            {quizzes.map((q, i) => {
              const hov = hovered === q.id;
              const qCount = q.questionIds?.length || q.questions?.length || 0;
              const isPublished = q.status === 'published';
              const date = q.updatedAt
                ? new Date(q.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '';
              const live = sessionByQuiz.get(q.id!);
              const isLive = !!live;

              return (
                <div
                  key={q.id}
                  className="animate-fadeUp"
                  onMouseEnter={() => setHovered(q.id!)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    animationDelay: `${i * 40}ms`,
                    borderRadius: 18,
                    border: `1.5px solid ${isLive ? 'rgba(16,185,129,0.4)' : hov ? 'rgba(201,168,76,0.45)' : 'rgba(201,168,76,0.15)'}`,
                    background: isLive ? 'rgba(16,185,129,0.05)' : hov ? 'rgba(201,168,76,0.08)' : 'rgba(201,168,76,0.04)',
                    overflow: 'hidden',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Main row */}
                  <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>

                    {/* Icon + info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                        background: isLive ? 'rgba(16,185,129,0.15)' : 'rgba(201,168,76,0.15)',
                        border: `1px solid ${isLive ? 'rgba(16,185,129,0.3)' : 'rgba(201,168,76,0.25)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative',
                      }}>
                        {isLive ? (
                          <>
                            <Zap size={18} color="#34d399" strokeWidth={1.75} />
                            <span style={{
                              position: 'absolute', top: -4, right: -4,
                              width: 10, height: 10, borderRadius: '50%',
                              background: '#34d399',
                              border: '2px solid #050814',
                              animation: 'pulseDot 1.5s ease-in-out infinite',
                            }} />
                          </>
                        ) : (
                          <BookOpen size={18} color="#e6c84a" strokeWidth={1.75} />
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.title}
                        </p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {qCount > 0 ? `${qCount} question${qCount !== 1 ? 's' : ''}` : 'No questions'}
                          {date ? ` · ${date}` : ''}
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                            background: isPublished ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                            color: isPublished ? '#34d399' : 'rgba(255,255,255,0.3)',
                            border: `1px solid ${isPublished ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                          }}>
                            {isPublished ? 'Published' : 'Draft'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => router.push(`/teacher/results?quiz=${q.id}`)}
                        title="View results"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '9px 14px', borderRadius: 10,
                          background: hov ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.09)',
                          border: '1px solid rgba(16,185,129,0.25)',
                          color: '#6ee7b7', fontWeight: 600, fontSize: 13,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <BarChart2 size={13} strokeWidth={2} /> Results
                      </button>
                      <button
                        onClick={() => router.push(`/teacher/host/${q.id}`)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '9px 14px', borderRadius: 10,
                          background: isLive
                            ? (hov ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.2)')
                            : (hov ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.2)'),
                          border: `1px solid ${isLive ? 'rgba(16,185,129,0.5)' : 'rgba(201,168,76,0.4)'}`,
                          color: isLive ? '#6ee7b7' : '#e6c84a', fontWeight: 700, fontSize: 13,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {isLive ? (
                          <><Zap size={13} strokeWidth={2} /> Manage</>
                        ) : (
                          <><Zap size={13} strokeWidth={2} /> Host</>
                        )}
                      </button>
                      <button
                        onClick={() => router.push(`/teacher/quiz/new?edit=${q.id}`)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '9px 14px', borderRadius: 10,
                          background: hov ? 'rgba(201,168,76,0.15)' : 'rgba(201,168,76,0.07)',
                          border: '1px solid rgba(201,168,76,0.2)',
                          color: '#c4a84a', fontWeight: 600, fontSize: 13,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <Pencil size={13} strokeWidth={2} /> Edit
                      </button>
                    </div>
                  </div>

                  {/* Live session panel */}
                  {isLive && live && (
                    <div style={{
                      margin: '0 14px 14px',
                      borderRadius: 12,
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      padding: '12px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                    }}>
                      {/* Code + status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', margin: '0 0 3px' }}>ROOM CODE</p>
                          <p style={{ fontSize: 22, fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#6ee7b7', letterSpacing: 4, margin: 0 }}>
                            {live.code}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '0 0 2px' }}>Players</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Users size={13} color="#6ee7b7" />
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{live.playerCount}</span>
                            </div>
                          </div>
                          <div>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '0 0 2px' }}>Status</p>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                              background: live.session.status === 'lobby' ? 'rgba(56,189,248,0.15)' : live.session.status === 'paused' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                              color: live.session.status === 'lobby' ? '#7dd3fc' : live.session.status === 'paused' ? '#fbbf24' : '#34d399',
                              border: `1px solid ${live.session.status === 'lobby' ? 'rgba(56,189,248,0.3)' : live.session.status === 'paused' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                            }}>
                              {live.session.status === 'lobby' ? '⏳ Lobby' : live.session.status === 'paused' ? '⏸ Paused' : '▶ Active'}
                            </span>
                          </div>
                          {live.session.closeAt && (
                            <div>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '0 0 2px' }}>Closes</p>
                              <p style={{ fontSize: 11, color: '#fcd34d', fontFamily: 'var(--font-mono)', margin: 0 }}>
                                {new Date(live.session.closeAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* End session button */}
                      <button
                        onClick={() => handleEndSession(live)}
                        disabled={endingSession === live.sessionId}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '8px 16px', borderRadius: 10,
                          background: 'rgba(239,68,68,0.12)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#fca5a5', fontWeight: 600, fontSize: 13,
                          cursor: endingSession === live.sessionId ? 'default' : 'pointer',
                          opacity: endingSession === live.sessionId ? 0.5 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        <StopCircle size={13} strokeWidth={2} />
                        {endingSession === live.sessionId ? 'Ending…' : 'End Session'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
