'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Rocket, Pencil, BarChart2, Plus, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getTeacherQuizzes } from '@/lib/firebase/quizzes';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    setLoading(true);
    getTeacherQuizzes(user.uid)
      .then(q => { setQuizzes(q); setLoading(false); })
      .catch(err => {
        setError(err?.message ?? 'Failed to load quizzes');
        setLoading(false);
      });
  }, [ready, user]);

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
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => router.push('/teacher')}
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', minHeight: 44, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <ChevronLeft size={14} /> Dashboard
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

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px 64px' }}>

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
          </p>
        </div>

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
          <div style={{ display: 'grid', gap: 10 }}>
            {quizzes.map((q, i) => {
              const hov = hovered === q.id;
              const qCount = q.questionIds?.length || q.questions?.length || 0;
              const isPublished = q.status === 'published';
              const date = q.updatedAt
                ? new Date(q.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '';
              return (
                <div
                  key={q.id}
                  className="animate-fadeUp"
                  onMouseEnter={() => setHovered(q.id!)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    animationDelay: `${i * 40}ms`,
                    borderRadius: 16,
                    border: `1.5px solid ${hov ? 'rgba(201,168,76,0.45)' : 'rgba(201,168,76,0.15)'}`,
                    background: hov ? 'rgba(201,168,76,0.08)' : 'rgba(201,168,76,0.04)',
                    padding: '16px 18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Icon + info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                      background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Rocket size={18} color="#e6c84a" strokeWidth={1.75} />
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
                        background: hov ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.2)',
                        border: '1px solid rgba(201,168,76,0.4)',
                        color: '#e6c84a', fontWeight: 700, fontSize: 13,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <Rocket size={13} strokeWidth={2} /> Host
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
