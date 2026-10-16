'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Users, Trophy, Target, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFirebase } from '@/hooks/useFirebase';
import { getResultsByQuiz } from '@/lib/firebase/sessions';
import { getQuiz } from '@/lib/firebase/quizzes';
import type { SessionResult } from '@/types/session';
import type { Quiz } from '@/types/quiz';

const BG = [
  'radial-gradient(ellipse 70% 50% at 20% 0%, rgba(16,185,129,0.1) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 50% at 80% 20%, rgba(139,92,246,0.07) 0%, transparent 50%)',
  '#050814',
].join(',');

interface QuestionStat {
  qIndex: number;
  text: string;
  correctCount: number;
  totalCount: number;
  avgTimeMs: number | null;
  accuracy: number;
}

export default function QuizAnalyticsPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const { user, ready } = useAuth();
  const { configured } = useFirebase();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'questions' | 'sessions' | 'students'>('overview');

  useEffect(() => {
    if (!ready || !user || !configured) return;
    Promise.all([
      getQuiz(quizId),
      getResultsByQuiz(quizId),
    ]).then(([q, rs]) => {
      setQuiz(q);
      setResults(rs);
      setLoading(false);
    });
  }, [ready, user, configured, quizId]);

  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-4xl animate-goldGlow">🎓</div>
      </div>
    );
  }

  if (!user || !configured) {
    router.replace('/teacher');
    return null;
  }

  // ── Aggregate stats across all sessions ──────────────────────────────────────

  const totalSessions = results.length;
  const allPlayers = results.flatMap(r => r.playerResults || []);
  const uniqueStudents = new Set(allPlayers.map(p => p.name.toLowerCase().trim())).size;
  const totalPlays = allPlayers.length;

  const avgAccuracy = totalPlays > 0
    ? allPlayers.reduce((s, p) => s + (p.accuracy || 0), 0) / totalPlays
    : 0;
  const avgScore = totalPlays > 0
    ? allPlayers.reduce((s, p) => s + p.score, 0) / totalPlays
    : 0;
  const topScore = totalPlays > 0
    ? Math.max(...allPlayers.map(p => p.score))
    : 0;

  // Aggregate question stats across all sessions
  const qMap = new Map<number, { text: string; correct: number; total: number; times: number[] }>();
  for (const r of results) {
    for (const qs of r.questionStats || []) {
      const existing = qMap.get(qs.qIndex);
      if (existing) {
        existing.correct += qs.correctCount;
        existing.total += qs.totalCount;
        if (qs.avgTimeMs != null) existing.times.push(qs.avgTimeMs);
      } else {
        qMap.set(qs.qIndex, {
          text: qs.text || `Question ${qs.qIndex + 1}`,
          correct: qs.correctCount,
          total: qs.totalCount,
          times: qs.avgTimeMs != null ? [qs.avgTimeMs] : [],
        });
      }
    }
  }

  const questionStats: QuestionStat[] = Array.from(qMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([qIndex, d]) => ({
      qIndex,
      text: d.text,
      correctCount: d.correct,
      totalCount: d.total,
      avgTimeMs: d.times.length > 0 ? d.times.reduce((a, b) => a + b, 0) / d.times.length : null,
      accuracy: d.total > 0 ? d.correct / d.total : 0,
    }));

  const hardest = [...questionStats].sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);
  const easiest = [...questionStats].sort((a, b) => b.accuracy - a.accuracy).slice(0, 3);

  const maxTotal = Math.max(...questionStats.map(q => q.totalCount), 1);

  // Leaderboard across all sessions (best score per student)
  const bestByStudent = new Map<string, { name: string; score: number; correct: number; total: number; accuracy: number; sessions: number }>();
  for (const p of allPlayers) {
    const key = p.name.toLowerCase().trim();
    const existing = bestByStudent.get(key);
    if (!existing || p.score > existing.score) {
      bestByStudent.set(key, {
        name: p.name,
        score: p.score,
        correct: p.correct,
        total: p.total,
        accuracy: p.accuracy,
        sessions: (existing?.sessions || 0) + 1,
      });
    } else {
      existing.sessions += 1;
    }
  }
  const allStudents = Array.from(bestByStudent.values()).sort((a, b) => b.score - a.score);

  function exportCSV() {
    const rows = [
      ['Student', 'Best Score', 'Best Accuracy', 'Sessions Played'],
      ...allStudents.map(s => [s.name, s.score, `${Math.round(s.accuracy * 100)}%`, s.sessions]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${quiz?.title || 'quiz'}_analytics.csv`;
    a.click();
  }

  const title = quiz?.title || 'Quiz Analytics';

  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>

      {/* ── Sticky nav ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(20px)', background: 'rgba(5,8,20,0.85)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px', height: 54, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.push('/teacher/quizzes')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ChevronLeft size={14} /> Quizzes
          </button>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {title}
          </span>
          <button
            onClick={exportCSV}
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', flexShrink: 0 }}
          >
            ⬇ CSV
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: '#fff', margin: '0 0 4px', lineHeight: 1.2 }}>{title}</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            {quiz?.questionIds?.length || 0} questions · {totalSessions} session{totalSessions !== 1 ? 's' : ''} · {uniqueStudents} unique student{uniqueStudents !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Top stat tiles ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 28 }}>
          {[
            { icon: Users,        label: 'Total Plays',    value: totalPlays,                       color: '#6ee7b7', glow: 'rgba(16,185,129,0.15)' },
            { icon: Target,       label: 'Avg Accuracy',   value: `${Math.round(avgAccuracy * 100)}%`, color: avgAccuracy >= 0.7 ? '#34d399' : avgAccuracy >= 0.4 ? '#fcd34d' : '#f87171', glow: 'rgba(52,211,153,0.12)' },
            { icon: TrendingUp,   label: 'Avg Score',      value: Math.round(avgScore).toLocaleString(), color: '#c4b5fd', glow: 'rgba(139,92,246,0.15)' },
            { icon: Trophy,       label: 'Top Score',      value: topScore.toLocaleString(),        color: '#fcd34d', glow: 'rgba(201,168,76,0.15)' },
            { icon: Clock,        label: 'Sessions',       value: totalSessions,                    color: '#7dd3fc', glow: 'rgba(56,189,248,0.12)' },
          ].map(s => (
            <div key={s.label} style={{ borderRadius: 16, padding: '16px 14px', textAlign: 'center', background: s.glow, border: '1px solid rgba(255,255,255,0.08)' }}>
              <s.icon size={18} color={s.color} strokeWidth={1.5} style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1, margin: '0 0 4px', fontFamily: 'var(--font-mono)' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {totalSessions === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 20 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📊</div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#fff', marginBottom: 8 }}>No sessions yet</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>Host a live session to start collecting results.</p>
            <button
              onClick={() => router.push(`/teacher/host/${quizId}`)}
              style={{ padding: '11px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#c9a84c,#e8d08a)', color: '#0d0d14', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}
            >
              Host a Session →
            </button>
          </div>
        ) : (
          <>
            {/* ── Tab bar ── */}
            <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
              {([
                { id: 'overview',  label: '📊 Overview' },
                { id: 'questions', label: '❓ Questions' },
                { id: 'students',  label: '👤 Students' },
                { id: 'sessions',  label: '🗂 Sessions' },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                    background: tab === t.id ? 'rgba(52,211,153,0.15)' : 'transparent',
                    color: tab === t.id ? '#34d399' : 'rgba(255,255,255,0.4)',
                    border: tab === t.id ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent',
                  }}
                >{t.label}</button>
              ))}
            </div>

            {/* ══ OVERVIEW TAB ══ */}
            {tab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Accuracy distribution */}
                <div style={{ borderRadius: 18, padding: '18px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 14 }}>Accuracy Distribution</h3>
                  {(() => {
                    const buckets = [
                      { label: '0–19%',  min: 0,   max: 0.2,  color: '#f87171' },
                      { label: '20–39%', min: 0.2,  max: 0.4,  color: '#fb923c' },
                      { label: '40–59%', min: 0.4,  max: 0.6,  color: '#fcd34d' },
                      { label: '60–79%', min: 0.6,  max: 0.8,  color: '#86efac' },
                      { label: '80–100%',min: 0.8,  max: 1.01, color: '#34d399' },
                    ];
                    const maxCount = Math.max(...buckets.map(b => allPlayers.filter(p => p.accuracy >= b.min && p.accuracy < b.max).length), 1);
                    return (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                        {buckets.map(b => {
                          const count = allPlayers.filter(p => p.accuracy >= b.min && p.accuracy < b.max).length;
                          const h = maxCount > 0 ? Math.max((count / maxCount) * 72, count > 0 ? 6 : 0) : 0;
                          return (
                            <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 11, color: b.color, fontWeight: 700 }}>{count > 0 ? count : ''}</span>
                              <div style={{ width: '100%', height: h, borderRadius: 4, background: b.color, opacity: 0.8, transition: 'height 0.3s' }} />
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{b.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Hardest and Easiest questions side by side */}
                {questionStats.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* Hardest */}
                    <div style={{ borderRadius: 18, padding: '16px 18px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <AlertTriangle size={14} color="#f87171" />
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f87171', margin: 0 }}>Hardest Questions</h3>
                      </div>
                      {hardest.map((q, i) => (
                        <div key={i} style={{ marginBottom: i < hardest.length - 1 ? 10 : 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>Q{q.qIndex + 1}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>{Math.round(q.accuracy * 100)}%</span>
                          </div>
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{q.text}</p>
                          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.round(q.accuracy * 100)}%`, background: '#f87171', borderRadius: 2 }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Easiest */}
                    <div style={{ borderRadius: 18, padding: '16px 18px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <CheckCircle2 size={14} color="#34d399" />
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#34d399', margin: 0 }}>Easiest Questions</h3>
                      </div>
                      {easiest.map((q, i) => (
                        <div key={i} style={{ marginBottom: i < easiest.length - 1 ? 10 : 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>Q{q.qIndex + 1}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>{Math.round(q.accuracy * 100)}%</span>
                          </div>
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{q.text}</p>
                          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.round(q.accuracy * 100)}%`, background: '#34d399', borderRadius: 2 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top students snapshot */}
                {allStudents.length > 0 && (
                  <div style={{ borderRadius: 18, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Top 5 Students</h3>
                    {allStudents.slice(0, 5).map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#fff' }}>{s.name}</span>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{s.sessions} play{s.sessions !== 1 ? 's' : ''}</span>
                        <span style={{ fontSize: 12, color: avgAccuracy >= 0.7 ? '#34d399' : avgAccuracy >= 0.4 ? '#fcd34d' : '#f87171', fontFamily: 'var(--font-mono)', width: 36, textAlign: 'right' }}>{Math.round(s.accuracy * 100)}%</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fcd34d', fontFamily: 'var(--font-mono)', width: 64, textAlign: 'right' }}>{s.score.toLocaleString()}</span>
                      </div>
                    ))}
                    {allStudents.length > 5 && (
                      <button onClick={() => setTab('students')} style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        + {allStudents.length - 5} more — view all →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══ QUESTIONS TAB ══ */}
            {tab === 'questions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {questionStats.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.3)' }}>No question data available yet</div>
                ) : questionStats.map((q, i) => {
                  const pct = Math.round(q.accuracy * 100);
                  const barColor = pct >= 70 ? '#34d399' : pct >= 40 ? '#fcd34d' : '#f87171';
                  return (
                    <div key={i} style={{ borderRadius: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)', flexShrink: 0, marginTop: 2 }}>Q{q.qIndex + 1}</span>
                        <p style={{ flex: 1, fontSize: 14, color: '#fff', margin: 0, lineHeight: 1.5 }}>{q.text}</p>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: 20, fontWeight: 800, color: barColor, margin: 0, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{pct}%</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>{q.correctCount}/{q.totalCount}</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
                      </div>

                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                        <span>answered by {q.totalCount} student{q.totalCount !== 1 ? 's' : ''}</span>
                        {q.avgTimeMs != null && <span>avg {(q.avgTimeMs / 1000).toFixed(1)}s</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ══ STUDENTS TAB ══ */}
            {tab === 'students' && (
              <div>
                <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>#</th>
                        <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Name</th>
                        <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Best Score</th>
                        <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Accuracy</th>
                        <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Sessions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allStudents.map((s, i) => {
                        const accColor = s.accuracy >= 0.7 ? '#34d399' : s.accuracy >= 0.4 ? '#fcd34d' : '#f87171';
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '11px 16px', color: 'rgba(255,255,255,0.3)' }}>{['🥇','🥈','🥉'][i] || i + 1}</td>
                            <td style={{ padding: '11px 16px', fontWeight: 600, color: '#fff' }}>{s.name}</td>
                            <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fcd34d' }}>{s.score.toLocaleString()}</td>
                            <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                              <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 12, background: `${accColor}22`, color: accColor }}>
                                {Math.round(s.accuracy * 100)}%
                              </span>
                            </td>
                            <td style={{ padding: '11px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.4)' }}>{s.sessions}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══ SESSIONS TAB ══ */}
            {tab === 'sessions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.map((r, i) => {
                  const date = new Date(r.completedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                  const time = new Date(r.completedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  const topPl = r.playerResults?.length ? [...r.playerResults].sort((a, b) => b.score - a.score)[0] : null;
                  const avgAcc = r.playerResults?.length
                    ? Math.round(r.playerResults.reduce((a, p) => a + (p.accuracy || 0), 0) / r.playerResults.length * 100)
                    : 0;
                  return (
                    <button
                      key={i}
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fcd34d', fontSize: 15 }}>{r.code}</span>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{date} · {time}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                          <span>{r.playerResults?.length || 0} players</span>
                          <span>{avgAcc}% avg accuracy</span>
                          {topPl && <span>🏆 {topPl.name} — {topPl.score.toLocaleString()}pts</span>}
                        </div>
                      </div>
                      <ChevronRight size={15} color="rgba(255,255,255,0.2)" />
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
