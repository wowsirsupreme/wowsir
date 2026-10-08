'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plug, GraduationCap, Plus, BookOpen, FileDown, BarChart2, Rocket, FileText, ChevronLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useFirebase } from '@/hooks/useFirebase';
import { loginTeacher, registerTeacher, logoutTeacher } from '@/lib/firebase/auth';
import { getTeacherQuizzes } from '@/lib/firebase/quizzes';
import type { Quiz } from '@/types/quiz';

type AuthMode = 'login' | 'register';

/* ── shared dark-sky background (blue-indigo, professional but atmospheric) ── */
const BG = [
  'radial-gradient(ellipse 80% 50% at 30% 0%,   rgba(56,189,248,0.13) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 20%,  rgba(99,102,241,0.1)  0%, transparent 50%)',
  'radial-gradient(ellipse 80% 50% at 10% 90%,  rgba(201,168,76,0.09) 0%, transparent 50%)',
  '#050814',
].join(',');

export default function TeacherPage() {
  const router   = useRouter();
  const { toast } = useToast();
  const { user, profile, loading, ready } = useAuth();
  const { configured } = useFirebase();

  const [mode, setMode]   = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');
  const [name, setName]   = useState('');
  const [school, setSchool] = useState('');
  const [busy, setBusy]   = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [hoveredQuiz, setHoveredQuiz] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user && profile) {
      setQuizzesLoading(true);
      getTeacherQuizzes(user.uid).then(q => { setQuizzes(q); setQuizzesLoading(false); });
    }
  }, [ready, user, profile]);

  async function handleAuth() {
    if (!email || !pw) { toast('Fill in all fields', 'error'); return; }
    setBusy(true);
    try {
      if (mode === 'login') {
        await loginTeacher(email, pw);
        toast('Welcome back!', 'success');
      } else {
        if (!name) { toast('Enter your name', 'error'); setBusy(false); return; }
        await registerTeacher(email, pw, name, school);
        toast('Account created!', 'success');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Authentication failed';
      toast(msg.replace('Firebase: ', '').replace(/\(.*\)/, '').trim(), 'error');
    } finally {
      setBusy(false);
    }
  }

  /* ── NOT CONFIGURED ── */
  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
        <div className="text-center max-w-sm animate-slideUp">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl mb-5 mx-auto" style={{ background: 'rgba(201,168,76,0.1)', border: '1.5px solid rgba(201,168,76,0.2)', filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.3))' }}>
            <Plug size={40} color="#c9a84c" strokeWidth={1.5} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: '#fff', marginBottom: 12 }}>
            Firebase not connected
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 28 }}>
            Ask your admin for the access link, or configure Firebase from the admin panel.
          </p>
          <button
            onClick={() => router.push('/')}
            className="btn-glass"
            style={{ fontSize: 15 }}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  /* ── LOADING ── */
  if (loading || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div style={{ animation: 'float 2s ease-in-out infinite', filter: 'drop-shadow(0 0 16px rgba(56,189,248,0.4))' }}>
          <GraduationCap size={48} color="#7dd3fc" strokeWidth={1.5} />
        </div>
      </div>
    );
  }

  /* ── DASHBOARD ── */
  if (user && profile) {
    const QUICK_ACTIONS: {
      id: string; Icon: LucideIcon; label: string; href: string;
      accent: string; border: string; hoverBorder: string; glow: string; tagColor: string;
    }[] = [
      {
        id: 'new',    Icon: Plus, label: 'Paper Builder',
        href: '/teacher/quiz/new',
        accent: 'rgba(56,189,248,0.18)', border: 'rgba(56,189,248,0.3)',
        hoverBorder: 'rgba(56,189,248,0.6)', glow: 'rgba(56,189,248,0.22)',
        tagColor: '#7dd3fc',
      },
      {
        id: 'bank',   Icon: BookOpen, label: 'Question Bank',
        href: '/teacher/library',
        accent: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.28)',
        hoverBorder: 'rgba(139,92,246,0.6)', glow: 'rgba(139,92,246,0.22)',
        tagColor: '#c4b5fd',
      },
      {
        id: 'import', Icon: FileDown, label: 'Import CSV',
        href: '/teacher/import',
        accent: 'rgba(16,185,129,0.14)', border: 'rgba(16,185,129,0.28)',
        hoverBorder: 'rgba(16,185,129,0.6)', glow: 'rgba(16,185,129,0.22)',
        tagColor: '#6ee7b7',
      },
      {
        id: 'results', Icon: BarChart2, label: 'Results',
        href: '/teacher/results',
        accent: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.28)',
        hoverBorder: 'rgba(245,158,11,0.6)', glow: 'rgba(245,158,11,0.22)',
        tagColor: '#fcd34d',
      },
    ];

    // first name only
    const firstName = (profile.name || 'Teacher').split(' ')[0];

    return (
      <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>

        {/* ── sticky nav bar ── */}
        <div
          style={{
            position: 'sticky', top: 0, zIndex: 20,
            background: 'rgba(5,8,20,0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Nav inner — same max-width as page content */}
          <div
            style={{
              maxWidth: 720, margin: '0 auto',
              padding: '0 24px',
              height: 56,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <button
              onClick={() => router.push('/')}
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', minHeight: 44, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronLeft size={14} /> WOW Sir
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: 'rgba(201,168,76,0.15)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15,
                }}
              >
                <GraduationCap size={15} color="#c9a84c" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                {firstName}
              </span>
            </div>
            <button
              onClick={async () => { await logoutTeacher(); }}
              className="btn-glass"
              style={{ fontSize: 13, padding: '7px 14px', minHeight: 36, borderRadius: 9 }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* ── page content column ── */}
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px 64px' }}>

          {/* ── greeting ── */}
          <div className="animate-fadeUp" style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8 }}>
              TEACHER DASHBOARD
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 40,
                color: '#fff',
                lineHeight: 1.15,
                marginBottom: 6,
              }}
            >
              Good to see you,{' '}
              <span style={{ color: '#c9a84c', textShadow: '0 0 24px rgba(201,168,76,0.4)' }}>
                {firstName}.
              </span>
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
              {profile.school || profile.email}
            </p>
          </div>

          {/* ── quick actions — horizontal row, fixed height ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              marginBottom: 36,
            }}
          >
            {QUICK_ACTIONS.map((a, i) => {
              const hov = hoveredAction === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => router.push(a.href)}
                  onMouseEnter={() => setHoveredAction(a.id)}
                  onMouseLeave={() => setHoveredAction(null)}
                  className="animate-fadeUp"
                  style={{
                    animationDelay: `${i * 55}ms`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: '16px 8px',
                    borderRadius: 16, height: 96,
                    background: hov
                      ? a.accent.replace(/[\d.]+\)$/, '0.26)')
                      : a.accent,
                    border: `1.5px solid ${hov ? a.hoverBorder : a.border}`,
                    boxShadow: hov ? `0 4px 20px ${a.glow}` : 'none',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    transform: hov ? 'translateY(-2px)' : 'translateY(0)',
                    transition: 'transform 0.16s, box-shadow 0.16s, border-color 0.16s, background 0.16s',
                    cursor: 'pointer',
                  }}
                >
                  <a.Icon size={24} color={a.tagColor} strokeWidth={1.75} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: hov ? a.tagColor : 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 1.3 }}>
                    {a.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── my quizzes section ── */}
          <div className="animate-fadeUp" style={{ animationDelay: '280ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 4 }}>
                  MY QUIZZES
                </p>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: '#fff', lineHeight: 1 }}>
                  {quizzes.length > 0 ? `${quizzes.length} quiz${quizzes.length > 1 ? 'zes' : ''}` : 'My Quizzes'}
                </h2>
              </div>
            </div>

            {/* Loading */}
            {quizzesLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                <div style={{ marginBottom: 10, animation: 'float 2s ease-in-out infinite', display: 'flex', justifyContent: 'center' }}>
                  <BookOpen size={28} color="rgba(255,255,255,0.3)" strokeWidth={1.5} />
                </div>
                Loading quizzes…
              </div>
            )}

            {/* Empty state */}
            {!quizzesLoading && quizzes.length === 0 && (
              <div
                style={{
                  borderRadius: 20,
                  border: '2px dashed rgba(255,255,255,0.1)',
                  padding: '56px 24px',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                  <FileText size={48} color="rgba(255,255,255,0.2)" strokeWidth={1.25} />
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#fff', marginBottom: 8 }}>
                  No quizzes yet
                </p>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', marginBottom: 28, lineHeight: 1.6 }}>
                  Create your first quiz to start hosting sessions.
                </p>
                <button
                  onClick={() => router.push('/teacher/quiz/new')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '13px 28px', borderRadius: 14, minHeight: 52,
                    background: 'linear-gradient(135deg, #c9a84c 0%, #e8d08a 50%, #c9a84c 100%)',
                    color: '#0d0d14', fontWeight: 700, fontSize: 16,
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(201,168,76,0.35)',
                  }}
                >
                  Create your first quiz →
                </button>
              </div>
            )}

            {/* Quiz list */}
            {!quizzesLoading && quizzes.length > 0 && (
              <div style={{ display: 'grid', gap: 12 }}>
                {quizzes.map((q, i) => {
                  const hov = hoveredQuiz === q.id;
                  return (
                    <div
                      key={q.id}
                      className="animate-fadeUp"
                      style={{
                        animationDelay: `${320 + i * 50}ms`,
                        borderRadius: 18,
                        background: hov ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${hov ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
                        padding: '18px 20px',
                        transition: 'background 0.18s, border-color 0.18s',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                      }}
                      onMouseEnter={() => setHoveredQuiz(q.id!)}
                      onMouseLeave={() => setHoveredQuiz(null)}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {q.title}
                          </h3>
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-mono)' }}>
                            {q.questionIds?.length || 0} questions · {q.topicKey}
                          </p>
                        </div>
                        <span
                          style={{
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
                            padding: '4px 10px', borderRadius: 999, flexShrink: 0,
                            background: q.status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                            color: q.status === 'published' ? '#34d399' : 'rgba(255,255,255,0.3)',
                            border: `1px solid ${q.status === 'published' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                          }}
                        >
                          {q.status?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => router.push(`/teacher/host/${q.id}`)}
                          style={{
                            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '11px 0', borderRadius: 12, minHeight: 46,
                            background: 'linear-gradient(135deg, #c9a84c 0%, #e8d08a 50%, #c9a84c 100%)',
                            color: '#0d0d14', fontWeight: 700, fontSize: 14,
                            border: 'none', cursor: 'pointer',
                            boxShadow: '0 3px 14px rgba(201,168,76,0.3)',
                          }}
                        >
                          <Rocket size={15} strokeWidth={2} /> Host
                        </button>
                        <button
                          onClick={() => router.push(`/teacher/quiz/new?edit=${q.id}`)}
                          className="btn-glass"
                          style={{ fontSize: 14, padding: '11px 20px', minHeight: 46, borderRadius: 12 }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── AUTH FORM ── */
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: BG }}
    >
      {/* Back */}
      <button
        onClick={() => router.push('/')}
        style={{ position: 'absolute', top: 20, left: 20, fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <ChevronLeft size={14} /> WOW Sir
      </button>

      {/* Logo */}
      <div
        className="mb-6 animate-float flex items-center justify-center w-20 h-20 rounded-2xl"
        style={{ background: 'rgba(201,168,76,0.12)', border: '1.5px solid rgba(201,168,76,0.25)', filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.4))' }}
      >
        <GraduationCap size={40} color="#c9a84c" strokeWidth={1.5} />
      </div>

      <div className="w-full max-w-sm animate-slideUp">

        {/* Mode toggle pill */}
        <div
          className="flex p-1 rounded-2xl mb-7"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {(['login', 'register'] as AuthMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 14,
                fontSize: 15, fontWeight: 600,
                transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
                background: mode === m ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: mode === m ? '#fff' : 'rgba(255,255,255,0.35)',
                border: mode === m ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                boxShadow: mode === m ? 'inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                cursor: 'pointer',
              }}
            >
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 38, color: '#fff', textAlign: 'center',
            lineHeight: 1.15, marginBottom: 6,
            textShadow: '0 2px 20px rgba(255,255,255,0.08)',
          }}
        >
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: 28 }}>
          {mode === 'login' ? 'Sign in to your teacher account' : 'Register as a teacher'}
        </p>

        {/* Fields */}
        {mode === 'register' && (
          <>
            <label style={{ display: 'block', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 7 }}>
              NAME *
            </label>
            <input
              className="dark-input"
              placeholder="Your full name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <label style={{ display: 'block', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 7 }}>
              SCHOOL
            </label>
            <input
              className="dark-input"
              placeholder="DPS International Ghana"
              value={school}
              onChange={e => setSchool(e.target.value)}
            />
          </>
        )}

        <label style={{ display: 'block', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 7 }}>
          EMAIL *
        </label>
        <input
          className="dark-input"
          type="email"
          placeholder="teacher@school.edu"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAuth()}
        />

        <label style={{ display: 'block', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 7 }}>
          PASSWORD *
        </label>
        <input
          className="dark-input"
          type="password"
          placeholder="••••••••"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAuth()}
        />

        {/* CTA */}
        <button
          onClick={handleAuth}
          disabled={busy}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '15px 0', borderRadius: 14, minHeight: 56,
            background: busy ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, #c9a84c 0%, #e8d08a 50%, #c9a84c 100%)',
            color: '#0d0d14', fontWeight: 700, fontSize: 17,
            border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
            boxShadow: busy ? 'none' : '0 4px 24px rgba(201,168,76,0.4)',
            transition: 'opacity 0.15s, box-shadow 0.15s',
            marginBottom: 18,
          }}
        >
          {busy ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Please wait…
            </>
          ) : mode === 'login' ? 'Sign In →' : 'Create Account →'}
        </button>

        {/* Switch mode */}
        <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ fontWeight: 700, color: '#c9a84c', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
