'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, Users, BarChart2, Globe, Star,
  Check, X, Pause, ChevronLeft, RefreshCw,
} from 'lucide-react';
import {
  getAllUsers, getPendingTeachers, approveTeacher, suspendTeacher,
  getUsageStats, getGeoStats, getAllQuestions,
  type QuestionStat, type UsageStat, type GeoPoint,
} from '@/lib/firebase/adminHelpers';
import { useFirebase } from '@/hooks/useFirebase';
import type { UserProfile } from '@/types/user';
import { TOPIC_LABELS } from '@/types/question';

const ADMIN_PASSWORD = 'wowadmin2024';
const TABS = ['Approvals', 'Teachers', 'Usage', 'Geography', 'Question Quality'] as const;
type Tab = typeof TABS[number];

const BG = [
  'radial-gradient(ellipse 70% 50% at 20% 0%,   rgba(139,92,246,0.15) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 50% at 80% 20%,  rgba(217,70,239,0.09) 0%, transparent 50%)',
  '#050814',
].join(',');

export default function AdminPage() {
  const router = useRouter();
  const { configured } = useFirebase();

  const [authed, setAuthed]   = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [tab, setTab]         = useState<Tab>('Approvals');
  const [loading, setLoading] = useState(false);

  // Data
  const [pending,  setPending]  = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [usage,    setUsage]    = useState<UsageStat | null>(null);
  const [geo,      setGeo]      = useState<GeoPoint[]>([]);
  const [questions, setQuestions] = useState<QuestionStat[]>([]);

  function tryLogin() {
    if (pwInput === ADMIN_PASSWORD) { setAuthed(true); setPwError(false); }
    else { setPwError(true); }
  }

  const loadTab = useCallback(async (t: Tab) => {
    if (!configured) return;
    setLoading(true);
    try {
      if (t === 'Approvals')         setPending(await getPendingTeachers());
      else if (t === 'Teachers')     setAllUsers(await getAllUsers());
      else if (t === 'Usage')        setUsage(await getUsageStats());
      else if (t === 'Geography')    setGeo(await getGeoStats());
      else if (t === 'Question Quality') setQuestions(await getAllQuestions());
    } finally {
      setLoading(false);
    }
  }, [configured]);

  useEffect(() => { if (authed) loadTab(tab); }, [authed, tab, loadTab]);

  async function handleApprove(uid: string) {
    await approveTeacher(uid);
    setPending(p => p.filter(u => u.uid !== uid));
    setAllUsers(p => p.map(u => u.uid === uid ? { ...u, status: 'approved' } : u));
  }

  async function handleSuspend(uid: string) {
    await suspendTeacher(uid);
    setPending(p => p.filter(u => u.uid !== uid));
    setAllUsers(p => p.map(u => u.uid === uid ? { ...u, status: 'suspended' } : u));
  }

  /* ── Not configured ── */
  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Firebase not configured.</p>
        </div>
      </div>
    );
  }

  /* ── Auth gate ── */
  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: BG }}>
        <button
          onClick={() => router.push('/')}
          style={{ position: 'absolute', top: 20, left: 20, fontSize: 13, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <ChevronLeft size={14} /> Back
        </button>
        <div className="animate-slideUp" style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(139,92,246,0.15)', border: '1.5px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', filter: 'drop-shadow(0 0 16px rgba(139,92,246,0.4))' }}>
            <ShieldCheck size={34} color="#a78bfa" strokeWidth={1.5} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: '#fff', marginBottom: 6 }}>Admin Panel</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 28 }}>Enter the admin password to continue</p>
          <input
            className="dark-input"
            type="password"
            placeholder="Admin password"
            value={pwInput}
            onChange={e => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={e => e.key === 'Enter' && tryLogin()}
            style={{ borderColor: pwError ? 'rgba(248,113,113,0.5)' : undefined }}
            autoFocus
          />
          {pwError && (
            <p style={{ fontSize: 13, color: '#f87171', marginBottom: 12 }}>Incorrect password</p>
          )}
          <button
            onClick={tryLogin}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14, marginTop: 4,
              background: 'linear-gradient(135deg,rgba(139,92,246,0.8),rgba(217,70,239,0.7))',
              color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(139,92,246,0.3)',
            }}
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  /* ── Admin dashboard ── */
  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>

      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(5,8,20,0.82)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => router.push('/teacher')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={14} /> Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} color="#a78bfa" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: '#fff' }}>Admin Panel</span>
          </div>
          <button onClick={() => loadTab(tab)} style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {TABS.map(t => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '10px 16px', fontSize: 13, fontWeight: active ? 700 : 500,
                  color: active ? '#c4b5fd' : 'rgba(255,255,255,0.38)',
                  background: 'none', border: 'none',
                  borderBottom: active ? '2px solid #8b5cf6' : '2px solid transparent',
                  cursor: 'pointer', transition: 'color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 64px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.25)' }}>
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14 }}>Loading…</p>
          </div>
        )}

        {!loading && tab === 'Approvals' && (
          <ApprovalsTab pending={pending} onApprove={handleApprove} onSuspend={handleSuspend} />
        )}
        {!loading && tab === 'Teachers' && (
          <TeachersTab users={allUsers} onApprove={handleApprove} onSuspend={handleSuspend} />
        )}
        {!loading && tab === 'Usage' && (
          <UsageTab stat={usage} />
        )}
        {!loading && tab === 'Geography' && (
          <GeoTab points={geo} />
        )}
        {!loading && tab === 'Question Quality' && (
          <QualityTab questions={questions} />
        )}
      </div>
    </div>
  );
}

/* ─────────────── Approvals Tab ─────────────── */
function ApprovalsTab({ pending, onApprove, onSuspend }: {
  pending: UserProfile[];
  onApprove: (uid: string) => void;
  onSuspend: (uid: string) => void;
}) {
  if (pending.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Check size={40} color="rgba(74,222,128,0.4)" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#fff', marginBottom: 8 }}>All caught up!</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>No pending approvals.</p>
      </div>
    );
  }
  return (
    <div>
      <SectionHeader title="Pending Approvals" count={pending.length} accent="#a78bfa" />
      <div style={{ display: 'grid', gap: 12 }}>
        {pending.map(u => (
          <UserRow key={u.uid} user={u} onApprove={onApprove} onSuspend={onSuspend} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Teachers Tab ─────────────── */
function TeachersTab({ users, onApprove, onSuspend }: {
  users: UserProfile[];
  onApprove: (uid: string) => void;
  onSuspend: (uid: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'suspended'>('all');
  const filtered = filter === 'all' ? users : users.filter(u => u.status === filter);

  return (
    <div>
      <SectionHeader title="All Teachers" count={users.length} accent="#7dd3fc" />
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'pending', 'approved', 'suspended'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              background: filter === f ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
              color: filter === f ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${filter === f ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? users.length : users.filter(u => u.status === f).length})
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map(u => (
          <UserRow key={u.uid} user={u} onApprove={onApprove} onSuspend={onSuspend} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Usage Tab ─────────────── */
function UsageTab({ stat }: { stat: UsageStat | null }) {
  if (!stat) return null;
  const cards = [
    { label: 'Quizzes',          value: stat.totalQuizzes,    color: '#7dd3fc' },
    { label: 'Questions',        value: stat.totalQuestions,  color: '#c4b5fd' },
    { label: 'Teachers',         value: stat.totalTeachers,   color: '#fcd34d' },
    { label: 'Pending',          value: stat.pendingTeachers, color: '#fbbf24' },
    { label: 'Approved',         value: stat.approvedTeachers,color: '#6ee7b7' },
    { label: 'Suspended',        value: stat.suspendedTeachers,color: '#f87171' },
    { label: 'Sessions Played',  value: stat.totalSessions,   color: '#f9a8d4' },
  ];
  return (
    <div>
      <SectionHeader title="Platform Usage" accent="#fcd34d" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
        {cards.map(c => (
          <div
            key={c.label}
            style={{
              borderRadius: 18, padding: '20px 18px',
              background: 'rgba(255,255,255,0.04)',
              border: '1.5px solid rgba(255,255,255,0.08)',
            }}
          >
            <p style={{ fontSize: 32, fontFamily: 'var(--font-mono)', fontWeight: 700, color: c.color, marginBottom: 6 }}>
              {c.value.toLocaleString()}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.05em' }}>
              {c.label}
            </p>
          </div>
        ))}
      </div>

      {/* Approval funnel */}
      {stat.totalTeachers > 0 && (
        <div style={{ marginTop: 28, borderRadius: 18, padding: '20px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>APPROVAL RATE</p>
          <div style={{ display: 'flex', height: 20, borderRadius: 10, overflow: 'hidden', gap: 2 }}>
            {stat.approvedTeachers > 0 && (
              <div style={{ flex: stat.approvedTeachers, background: '#4ade80', borderRadius: '10px 0 0 10px' }} title={`Approved: ${stat.approvedTeachers}`} />
            )}
            {stat.pendingTeachers > 0 && (
              <div style={{ flex: stat.pendingTeachers, background: '#fbbf24' }} title={`Pending: ${stat.pendingTeachers}`} />
            )}
            {stat.suspendedTeachers > 0 && (
              <div style={{ flex: stat.suspendedTeachers, background: '#f87171', borderRadius: '0 10px 10px 0' }} title={`Suspended: ${stat.suspendedTeachers}`} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
            {[
              { label: 'Approved', v: stat.approvedTeachers, color: '#4ade80' },
              { label: 'Pending',  v: stat.pendingTeachers,  color: '#fbbf24' },
              { label: 'Suspended',v: stat.suspendedTeachers,color: '#f87171' },
            ].map(x => (
              <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{x.label}: {x.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Geography Tab ─────────────── */
function GeoTab({ points }: { points: GeoPoint[] }) {
  if (points.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Globe size={40} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No geography data yet. Teachers need city/country in their profiles.</p>
      </div>
    );
  }
  const max = Math.max(...points.map(p => p.count));
  return (
    <div>
      <SectionHeader title="Teacher Locations" count={points.reduce((s, p) => s + p.count, 0)} accent="#6ee7b7" />
      <div style={{ display: 'grid', gap: 10 }}>
        {points.map((p, i) => (
          <div
            key={i}
            style={{
              borderRadius: 14, padding: '14px 18px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', flex: 1 }}>
                {p.city ? `${p.city}, ` : ''}{p.country || 'Unknown'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: '#6ee7b7' }}>
                {p.count}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(p.count / max) * 100}%`, background: 'linear-gradient(90deg, #6ee7b7, #34d399)', borderRadius: 3, transition: 'width 0.4s' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Question Quality Tab ─────────────── */
function QualityTab({ questions }: { questions: QuestionStat[] }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'peer-approved' | 'approved'>('all');
  const filtered = filter === 'all' ? questions : questions.filter(q => q.approvalStatus === filter);

  const counts = {
    all: questions.length,
    pending: questions.filter(q => q.approvalStatus === 'pending').length,
    'peer-approved': questions.filter(q => q.approvalStatus === 'peer-approved').length,
    approved: questions.filter(q => q.approvalStatus === 'approved').length,
  };

  return (
    <div>
      <SectionHeader title="Question Quality" count={questions.length} accent="#fcd34d" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['all', 'pending', 'peer-approved', 'approved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              background: filter === f ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
              color: filter === f ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${filter === f ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map(q => {
          const topic = TOPIC_LABELS[q.topicKey];
          const statusColor = q.approvalStatus === 'approved' ? '#4ade80' : q.approvalStatus === 'peer-approved' ? '#60a5fa' : '#fbbf24';
          return (
            <div
              key={q.id}
              style={{
                borderRadius: 14, padding: '14px 18px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 6, lineHeight: 1.5 }}>
                    {q.text.length > 120 ? q.text.slice(0, 120) + '…' : q.text}
                  </p>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {topic && (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>
                        {topic.emoji} {topic.title}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                      Used {q.useCount}×
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                    padding: '4px 10px', borderRadius: 999,
                    background: `${statusColor}18`, color: statusColor,
                    border: `1px solid ${statusColor}44`,
                  }}
                >
                  {q.approvalStatus}
                </span>
              </div>
              {/* Use count bar */}
              <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%', borderRadius: 2,
                    width: `${Math.min(100, (q.useCount / 10) * 100)}%`,
                    background: q.useCount >= 3 ? '#60a5fa' : '#fbbf24',
                    transition: 'width 0.4s',
                  }}
                />
              </div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                {q.useCount >= 3 ? 'Auto peer-approved threshold reached' : `${3 - q.useCount} more uses to auto peer-approve`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────── Shared: UserRow ─────────────── */
function UserRow({ user, onApprove, onSuspend }: {
  user: UserProfile;
  onApprove: (uid: string) => void;
  onSuspend: (uid: string) => void;
}) {
  const statusColor = user.status === 'approved' ? '#4ade80' : user.status === 'suspended' ? '#f87171' : '#fbbf24';
  return (
    <div
      style={{
        borderRadius: 16, padding: '14px 18px',
        background: 'rgba(255,255,255,0.03)',
        border: '1.5px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name}
          </span>
          <span
            style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
              padding: '2px 8px', borderRadius: 999, flexShrink: 0,
              background: `${statusColor}18`, color: statusColor,
              border: `1px solid ${statusColor}44`,
            }}
          >
            {user.status?.toUpperCase() ?? 'PENDING'}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.email}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
          {[user.school, user.city, user.country].filter(Boolean).join(' · ')}
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
          Joined {new Date(user.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {user.status !== 'approved' && (
          <button
            onClick={() => onApprove(user.uid)}
            style={{
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(74,222,128,0.12)', border: '1.5px solid rgba(74,222,128,0.3)', cursor: 'pointer',
              color: '#4ade80',
            }}
            title="Approve"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.12)')}
          >
            <Check size={16} />
          </button>
        )}
        {user.status !== 'suspended' && (
          <button
            onClick={() => onSuspend(user.uid)}
            style={{
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(248,113,113,0.1)', border: '1.5px solid rgba(248,113,113,0.25)', cursor: 'pointer',
              color: '#f87171',
            }}
            title="Suspend"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
          >
            <Pause size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Shared: SectionHeader ─────────────── */
function SectionHeader({ title, count, accent = '#fff' }: { title: string; count?: number; accent?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: '#fff', lineHeight: 1 }}>
        {title}
        {count !== undefined && (
          <span style={{ fontSize: 16, color: accent, marginLeft: 10, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {count}
          </span>
        )}
      </h2>
    </div>
  );
}
