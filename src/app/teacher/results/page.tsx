'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, BarChart2, Users, CheckCircle, Clock, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFirebase } from '@/hooks/useFirebase';
import { getTeacherQuizzes } from '@/lib/firebase/quizzes';
import type { Quiz } from '@/types/quiz';

const BG = [
  'radial-gradient(ellipse 80% 50% at 30% 0%,   rgba(245,158,11,0.1) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 20%,  rgba(139,92,246,0.08) 0%, transparent 50%)',
  '#050814',
].join(',');

export default function ResultsPage() {
  const router = useRouter();
  const { user, profile, ready } = useAuth();
  const { configured } = useFirebase();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    getTeacherQuizzes(user.uid).then(qs => {
      setQuizzes(qs);
      setLoading(false);
    });
  }, [ready, user]);

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

  const firstName = (profile?.name || 'Teacher').split(' ')[0];
  const published = quizzes.filter(q => q.status === 'published');
  const draft = quizzes.filter(q => q.status !== 'published');

  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>
      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(5,8,20,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => router.push('/teacher')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={14} /> Teacher
          </button>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>RESULTS</span>
          <div style={{ width: 80 }} />
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: '#fff', marginBottom: 6 }}>
            Quiz <span style={{ color: '#fcd34d' }}>Results</span>
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
            Session data and scores for your quizzes
          </p>
        </div>

        {/* Stats row */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
            {[
              { label: 'Total Quizzes', value: quizzes.length, icon: BarChart2, color: '#fcd34d', glow: 'rgba(245,158,11,0.2)' },
              { label: 'Published', value: published.length, icon: CheckCircle, color: '#6ee7b7', glow: 'rgba(16,185,129,0.2)' },
              { label: 'Drafts', value: draft.length, icon: Clock, color: '#c4b5fd', glow: 'rgba(139,92,246,0.2)' },
            ].map(s => (
              <div
                key={s.label}
                style={{
                  borderRadius: 16, padding: '18px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  textAlign: 'center',
                }}
              >
                <s.icon size={22} color={s.color} strokeWidth={1.5} style={{ margin: '0 auto 10px' }} />
                <p style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading…</div>
        )}

        {/* Quiz list with host links */}
        {!loading && quizzes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 20 }}>
            <BarChart2 size={48} strokeWidth={1} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#fff', marginBottom: 8 }}>No quizzes yet</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>Create a quiz to start seeing results here.</p>
            <button
              onClick={() => router.push('/teacher/quiz/new')}
              style={{ padding: '11px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#c9a84c,#e8d08a)', color: '#0d0d14', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}
            >
              Create a Quiz →
            </button>
          </div>
        )}

        {!loading && quizzes.length > 0 && (
          <>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 14 }}>
              YOUR QUIZZES
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {quizzes.map((q, i) => {
                const hov = hovered === q.id;
                return (
                  <div
                    key={q.id}
                    style={{
                      borderRadius: 16, padding: '18px 20px',
                      background: hov ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${hov ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={() => setHovered(q.id!)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.title}
                        </h3>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>
                          {q.questionIds?.length || 0} questions · {q.topicKey}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', flexShrink: 0,
                        padding: '4px 10px', borderRadius: 999,
                        background: q.status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                        color: q.status === 'published' ? '#34d399' : 'rgba(255,255,255,0.3)',
                        border: `1px solid ${q.status === 'published' ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.1)'}`,
                      }}>
                        {q.status?.toUpperCase()}
                      </span>
                    </div>

                    {/* Placeholder stats — live session data would connect via sessions.ts */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
                        <Users size={13} /> <span>—</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
                        <Trophy size={13} /> <span>—</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => router.push(`/teacher/host/${q.id}`)}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                          background: 'linear-gradient(135deg,#c9a84c,#e8d08a)',
                          color: '#0d0d14', border: 'none',
                          boxShadow: '0 3px 14px rgba(201,168,76,0.25)',
                        }}
                      >
                        Host Session
                      </button>
                      <button
                        onClick={() => router.push(`/teacher/quiz/new?edit=${q.id}`)}
                        className="btn-glass"
                        style={{ fontSize: 14, padding: '10px 18px', borderRadius: 11 }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
