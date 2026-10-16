'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, BarChart2, Users, Trophy, Zap, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFirebase } from '@/hooks/useFirebase';
import { getTeacherQuizzes } from '@/lib/firebase/quizzes';
import { getResultsByTeacher } from '@/lib/firebase/sessions';
import type { Quiz } from '@/types/quiz';
import type { SessionResult } from '@/types/session';

const BG = [
  'radial-gradient(ellipse 80% 50% at 30% 0%,   rgba(245,158,11,0.1) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 20%,  rgba(139,92,246,0.08) 0%, transparent 50%)',
  '#050814',
].join(',');

export default function ResultsPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { configured } = useFirebase();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'recent' | 'quizzes'>('recent');

  // ── Fix: include `configured` so the fetch re-runs when Firebase is ready ──
  useEffect(() => {
    if (!ready || !user || !configured) return;
    setLoading(true);
    Promise.all([
      getTeacherQuizzes(user.uid),
      getResultsByTeacher(user.uid),
    ]).then(([qs, rs]) => {
      setQuizzes(qs);
      setResults(rs);
      setLoading(false);
    });
  }, [ready, user, configured]);

  if (!ready) return null;
  if (!configured || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center">
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Sign in as a teacher to view results.</p>
          <button onClick={() => router.push('/teacher')} className="btn-glass">Go to Teacher Login</button>
        </div>
      </div>
    );
  }

  // ── Aggregate stats ──
  const totalPlayers = results.reduce((a, r) => a + (r.playerResults?.length || 0), 0);
  const quizzesUsed  = new Set(results.map(r => r.quizId)).size;
  const avgAccuracy  = results.length > 0
    ? results.reduce((a, r) => a + (r.summary?.avgAccuracy || 0), 0) / results.length
    : 0;

  // Quiz map for labels
  const quizMap = new Map(quizzes.map(q => [q.id, q]));

  // Recent sessions (newest first)
  const recentSessions = [...results].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  // Per-quiz breakdown
  const quizBreakdown = quizzes.map(q => {
    const qResults = results.filter(r => r.quizId === q.id);
    const players  = qResults.reduce((a, r) => a + (r.playerResults?.length || 0), 0);
    const lastRun  = qResults.length ? Math.max(...qResults.map(r => r.completedAt || 0)) : 0;
    return { quiz: q, sessions: qResults.length, players, lastRun };
  }).sort((a, b) => b.lastRun - a.lastRun);

  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>

      {/* ── Nav ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(5,8,20,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => router.push('/teacher')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
            <ChevronLeft size={14} /> Teacher
          </button>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>RESULTS</span>
          <div style={{ width: 64 }} />
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: '#fff', marginBottom: 4 }}>
            Quiz <span style={{ color: '#fcd34d' }}>Results</span>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            {results.length} session{results.length !== 1 ? 's' : ''} across {quizzesUsed} quiz{quizzesUsed !== 1 ? 'zes' : ''}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading…</div>
        ) : (
          <>
            {/* ── Stat tiles ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
              {[
                { label: 'Sessions',   value: results.length,                        color: '#fcd34d', icon: BarChart2 },
                { label: 'Players',    value: totalPlayers,                           color: '#6ee7b7', icon: Users },
                { label: 'Quizzes',    value: quizzesUsed,                            color: '#c4b5fd', icon: Trophy },
                { label: 'Avg Acc',    value: `${Math.round(avgAccuracy * 100)}%`,    color: avgAccuracy >= 0.7 ? '#34d399' : avgAccuracy >= 0.4 ? '#fcd34d' : '#f87171', icon: Zap },
              ].map(s => (
                <div key={s.label} style={{ borderRadius: 14, padding: '14px 10px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <s.icon size={16} color={s.color} strokeWidth={1.5} style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: '0 0 3px', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {results.length === 0 ? (
              /* ── Empty state ── */
              <div style={{ textAlign: 'center', padding: '60px 24px', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 20 }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>📊</div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#fff', marginBottom: 8 }}>No sessions yet</p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>Host a live session to start collecting results.</p>
                <button
                  onClick={() => router.push('/teacher/quizzes')}
                  style={{ padding: '11px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#c9a84c,#e8d08a)', color: '#0d0d14', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}
                >
                  Go to Quizzes →
                </button>
              </div>
            ) : (
              <>
                {/* ── Tab bar ── */}
                <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 18 }}>
                  {([
                    { id: 'recent',  label: '🕐 Recent Sessions' },
                    { id: 'quizzes', label: '📚 By Quiz' },
                  ] as const).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                        background: tab === t.id ? 'rgba(252,211,77,0.12)' : 'transparent',
                        color: tab === t.id ? '#fcd34d' : 'rgba(255,255,255,0.4)',
                        border: tab === t.id ? '1px solid rgba(252,211,77,0.25)' : '1px solid transparent',
                      }}
                    >{t.label}</button>
                  ))}
                </div>

                {/* ══ RECENT SESSIONS TAB ══ */}
                {tab === 'recent' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {recentSessions.map((r, i) => {
                      const quiz      = quizMap.get(r.quizId);
                      const date      = new Date(r.completedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                      const time      = new Date(r.completedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                      const topPlayer = r.playerResults?.length ? [...r.playerResults].sort((a, b) => b.score - a.score)[0] : null;
                      const avgAcc    = r.summary?.avgAccuracy ?? 0;
                      const accColor  = avgAcc >= 0.7 ? '#34d399' : avgAcc >= 0.4 ? '#fcd34d' : '#f87171';
                      return (
                        <button
                          key={r.id || i}
                          onClick={() => router.push(`/teacher/results/${r.id}`)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                            padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                            transition: 'background 0.1s', color: '#fff',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                        >
                          {/* Room code */}
                          <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 12, background: 'rgba(252,211,77,0.08)', border: '1px solid rgba(252,211,77,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fcd34d', letterSpacing: 1 }}>{r.code}</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>room</span>
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Quiz name */}
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {quiz?.title || r.quizTitle || 'Unknown Quiz'}
                            </p>
                            {/* Meta row */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={11} /> {date} · {time}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Users size={11} /> {r.playerResults?.length || 0} players
                              </span>
                              <span style={{ color: accColor }}>{Math.round(avgAcc * 100)}% avg acc</span>
                              {topPlayer && (
                                <span>🏆 {topPlayer.name} — {topPlayer.score.toLocaleString()}pts</span>
                              )}
                            </div>
                          </div>

                          <ChevronRight size={15} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ══ BY QUIZ TAB ══ */}
                {tab === 'quizzes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {quizBreakdown.map(({ quiz: q, sessions, players, lastRun }) => (
                      <button
                        key={q.id}
                        onClick={() => router.push(`/teacher/results/quiz/${q.id}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                          padding: '16px 18px', borderRadius: 16, cursor: 'pointer',
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                          transition: 'background 0.1s', color: '#fff',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</p>
                            <span style={{
                              fontSize: 10, fontWeight: 700, flexShrink: 0,
                              padding: '3px 8px', borderRadius: 999,
                              background: q.status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                              color: q.status === 'published' ? '#34d399' : 'rgba(255,255,255,0.3)',
                              border: `1px solid ${q.status === 'published' ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.1)'}`,
                            }}>{q.status?.toUpperCase()}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Trophy size={11} color="#fcd34d" /> {sessions} session{sessions !== 1 ? 's' : ''}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={11} color="#6ee7b7" /> {players} player{players !== 1 ? 's' : ''}</span>
                            <span>{q.questionIds?.length || 0} questions</span>
                            {lastRun > 0 && <span>last run {new Date(lastRun).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                          {sessions === 0 ? (
                            <span
                              onClick={e => { e.stopPropagation(); router.push(`/teacher/host/${q.id}`); }}
                              style={{ fontSize: 12, fontWeight: 700, color: '#0d0d14', background: 'linear-gradient(135deg,#c9a84c,#e8d08a)', padding: '5px 12px', borderRadius: 8, cursor: 'pointer' }}
                            >
                              Host →
                            </span>
                          ) : (
                            <ChevronRight size={15} color="rgba(255,255,255,0.2)" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
