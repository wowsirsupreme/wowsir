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
  wipeResults, wipePracticeLeaderboard, wipeRTDBSessions, wipeAllData, wipeAllQuestions, backupDatabase,
  type QuestionStat, type UsageStat, type GeoPoint,
} from '@/lib/firebase/adminHelpers';
import { deleteQuestionsByTopic, getAllQuestionsByTopic } from '@/lib/firebase/questions';
import { seedGradeBank, getGradeBankStats } from '@/lib/firebase/studySync';
import { loginTeacher, logoutTeacher, onAuthChange } from '@/lib/firebase/auth';
import type { User } from 'firebase/auth';
import { useFirebase } from '@/hooks/useFirebase';
import type { UserProfile } from '@/types/user';
import { TOPIC_LABELS } from '@/types/question';
import { allGradeQuestions } from '@/data/grades';

const ADMIN_PASSWORD = 'wowadmin2024';
const TABS = ['Approvals', 'Teachers', 'Usage', 'Geography', 'Question Bank', 'Question Quality', 'Database'] as const;
type Tab = typeof TABS[number];

const MAX_ATTEMPTS   = 5;
const LOCKOUT_MS     = 15 * 60 * 1000;  // 15 minutes
const SESSION_MS     = 2  * 60 * 60 * 1000; // 2 hours
const STORE_ATTEMPTS = 'admin_fail_attempts';
const STORE_LOCKOUT  = 'admin_lockout_until';
const STORE_SESSION  = 'admin_session_exp';

function getLockoutState(): { locked: boolean; remaining: number; attempts: number } {
  try {
    const until = parseInt(localStorage.getItem(STORE_LOCKOUT) ?? '0', 10);
    const now   = Date.now();
    if (until > now) return { locked: true, remaining: until - now, attempts: MAX_ATTEMPTS };
    const attempts = parseInt(localStorage.getItem(STORE_ATTEMPTS) ?? '0', 10);
    return { locked: false, remaining: 0, attempts };
  } catch { return { locked: false, remaining: 0, attempts: 0 }; }
}

function recordFailedAttempt(): { locked: boolean; remaining: number } {
  try {
    const prev = parseInt(localStorage.getItem(STORE_ATTEMPTS) ?? '0', 10);
    const next = prev + 1;
    if (next >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_MS;
      localStorage.setItem(STORE_LOCKOUT, String(until));
      localStorage.removeItem(STORE_ATTEMPTS);
      return { locked: true, remaining: LOCKOUT_MS };
    }
    localStorage.setItem(STORE_ATTEMPTS, String(next));
    return { locked: false, remaining: 0 };
  } catch { return { locked: false, remaining: 0 }; }
}

function clearLoginState() {
  try {
    localStorage.removeItem(STORE_ATTEMPTS);
    localStorage.removeItem(STORE_LOCKOUT);
  } catch { /* ignore */ }
}

function isSessionValid(): boolean {
  try {
    const exp = parseInt(sessionStorage.getItem(STORE_SESSION) ?? '0', 10);
    return exp > Date.now();
  } catch { return false; }
}

function startSession() {
  try { sessionStorage.setItem(STORE_SESSION, String(Date.now() + SESSION_MS)); } catch { /* ignore */ }
}

function endSession() {
  try { sessionStorage.removeItem(STORE_SESSION); } catch { /* ignore */ }
}

const BG = [
  'radial-gradient(ellipse 70% 50% at 20% 0%,   rgba(139,92,246,0.15) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 50% at 80% 20%,  rgba(217,70,239,0.09) 0%, transparent 50%)',
  '#050814',
].join(',');

export default function AdminPage() {
  const router = useRouter();
  const { configured } = useFirebase();

  const [authed, setAuthed]     = useState(false);
  const [pwInput, setPwInput]   = useState('');
  const [pwError, setPwError]   = useState('');
  const [tab, setTab]           = useState<Tab>('Approvals');
  const [loading, setLoading]   = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0); // ms remaining in lockout

  // Data
  const [pending,  setPending]  = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [usage,    setUsage]    = useState<UsageStat | null>(null);
  const [geo,      setGeo]      = useState<GeoPoint[]>([]);
  const [questions, setQuestions] = useState<QuestionStat[]>([]);

  // Database reset state
  const [resetStatus, setResetStatus] = useState<Record<string, 'idle' | 'confirm' | 'running' | 'done' | 'error'>>({
    results: 'idle',
    practice: 'idle',
    rtdb: 'idle',
    all: 'idle',
  });
  const [resetMsg, setResetMsg] = useState<Record<string, string>>({});
  const [backupStatus, setBackupStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [backupMsg, setBackupMsg] = useState('');

  // Firebase Auth state (for wipe operations that require credentials)
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [fbEmail, setFbEmail] = useState('');
  const [fbPass, setFbPass] = useState('');
  const [fbLoginErr, setFbLoginErr] = useState('');
  const [fbLogging, setFbLogging] = useState(false);

  // Restore session on mount, and set up lockout countdown timer
  useEffect(() => {
    if (isSessionValid()) setAuthed(true);
    const { locked, remaining } = getLockoutState();
    if (locked) setLockRemaining(remaining);
  }, []);

  useEffect(() => {
    if (lockRemaining <= 0) return;
    const id = setInterval(() => {
      setLockRemaining(prev => {
        const next = prev - 1000;
        if (next <= 0) { clearInterval(id); return 0; }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockRemaining]);

  // Track Firebase Auth state so Database tab wipe ops have credentials
  useEffect(() => {
    return onAuthChange(u => setFbUser(u));
  }, [configured]);

  async function handleFbLogin() {
    setFbLoginErr('');
    setFbLogging(true);
    try {
      await loginTeacher(fbEmail, fbPass);
      setFbEmail('');
      setFbPass('');
    } catch (e: unknown) {
      setFbLoginErr(e instanceof Error ? e.message.replace('Firebase: ', '') : 'Sign-in failed');
    } finally {
      setFbLogging(false);
    }
  }

  function tryLogin() {
    const state = getLockoutState();
    if (state.locked) {
      setLockRemaining(state.remaining);
      return;
    }
    if (pwInput === ADMIN_PASSWORD) {
      clearLoginState();
      startSession();
      setAuthed(true);
      setPwError('');
    } else {
      const result = recordFailedAttempt();
      if (result.locked) {
        setLockRemaining(result.remaining);
        setPwError(`Too many failed attempts. Locked for 15 minutes.`);
      } else {
        const { attempts } = getLockoutState();
        const left = MAX_ATTEMPTS - attempts;
        setPwError(`Incorrect password. ${left} attempt${left !== 1 ? 's' : ''} remaining.`);
      }
    }
  }

  function handleLogout() {
    endSession();
    setAuthed(false);
    setPwInput('');
    setPwError('');
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
          {lockRemaining > 0 ? (
            <div style={{ padding: '18px 0', borderRadius: 14, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#f87171', marginBottom: 4 }}>Too many failed attempts</p>
              <p style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color: '#fca5a5' }}>
                {String(Math.floor(lockRemaining / 60000)).padStart(2, '0')}:{String(Math.floor((lockRemaining % 60000) / 1000)).padStart(2, '0')}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>locked — try again after countdown</p>
            </div>
          ) : (
            <>
              <input
                className="dark-input"
                type="password"
                placeholder="Admin password"
                value={pwInput}
                onChange={e => { setPwInput(e.target.value); setPwError(''); }}
                onKeyDown={e => e.key === 'Enter' && tryLogin()}
                style={{ borderColor: pwError ? 'rgba(248,113,113,0.5)' : undefined }}
                autoFocus
              />
              {pwError && (
                <p style={{ fontSize: 13, color: '#f87171', marginBottom: 12 }}>{pwError}</p>
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
            </>
          )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => loadTab(tab)} title="Refresh" style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
              <RefreshCw size={14} />
            </button>
            <button onClick={handleLogout} title="Log out" style={{ color: 'rgba(248,113,113,0.6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
              Log out
            </button>
          </div>
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
        {!loading && tab === 'Question Bank' && (
          <QuestionBankTab />
        )}
        {!loading && tab === 'Question Quality' && (
          <QualityTab questions={questions} />
        )}
        {tab === 'Database' && (
          <DatabaseTab
            resetStatus={resetStatus}
            resetMsg={resetMsg}
            backupStatus={backupStatus}
            backupMsg={backupMsg}
            onWipe={async (key) => {
              if (resetStatus[key] !== 'confirm') {
                setResetStatus(s => ({ ...s, [key]: 'confirm' }));
                return;
              }
              setResetStatus(s => ({ ...s, [key]: 'running' }));
              try {
                let result;
                if (key === 'results') result = await wipeResults();
                else if (key === 'practice') result = await wipePracticeLeaderboard();
                else if (key === 'all') result = await wipeAllData();
                else if (key === 'questions') result = await wipeAllQuestions();
                else result = await wipeRTDBSessions();
                setResetMsg(m => ({ ...m, [key]: `Deleted ${result.deleted} record${result.deleted !== 1 ? 's' : ''}${result.errors ? ` (${result.errors} errors)` : ''}` }));
                setResetStatus(s => ({ ...s, [key]: 'done' }));
              } catch (e: unknown) {
                setResetMsg(m => ({ ...m, [key]: e instanceof Error ? e.message : 'Error occurred' }));
                setResetStatus(s => ({ ...s, [key]: 'error' }));
              }
            }}
            onCancel={(key) => setResetStatus(s => ({ ...s, [key]: 'idle' }))}
            onBackup={async () => {
              setBackupStatus('running');
              try {
                await backupDatabase();
                setBackupStatus('done');
                setBackupMsg('Backup downloaded successfully');
              } catch (e: unknown) {
                setBackupStatus('error');
                setBackupMsg(e instanceof Error ? e.message : 'Backup failed');
              }
            }}
            fbUser={fbUser}
            fbEmail={fbEmail}
            fbPass={fbPass}
            fbLoginErr={fbLoginErr}
            fbLogging={fbLogging}
            onFbEmailChange={setFbEmail}
            onFbPassChange={setFbPass}
            onFbLogin={handleFbLogin}
            onFbLogout={() => logoutTeacher()}
          />
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

// Keys that were renamed — used to migrate existing orphaned Firestore questions
const TOPIC_REMAP: Record<string, string> = {
  'gr5-computer-evolution':          'gr5-ch1-history',
  'gr5-storage-media':               'gr5-ch2-storage',
  'gr8-artificial-intelligence':     'gr8-ch1-ai',
  'gr8-technology-trends':           'gr8-ch2-tech',
  'gr9-cs-cpu-architecture':         'gr9-cpu',
  'gr9-cs-data-storage':             'gr9-storage',
  'gr9-cs-os-accounts-security':     'gr9-os',
  'gr9-cs-os-file-management':       'gr9-os',
  'gr9-cs-os-interrupts':            'gr9-os',
  'gr9-cs-os-memory-management':     'gr9-os',
  'gr9-cs-os-peripherals-drivers':   'gr9-os',
  'gr9-cs-os-process-management':    'gr9-os',
  'gr9-cs-os-purpose':               'gr9-os',
  'gr9-dt-defining':                 'gr9dt-design-brief',
  'gr9-dt-developing':               'gr9dt-developing',
  'gr9-dt-identifying':              'gr9dt-design1',
  'gr9-dt-influences-designing':     'gr9dt-influences',
  'gr9-dt-proposing':                'gr9dt-plan',
};

/* ─────────────── Question Bank Tab ─────────────── */
function QuestionBankTab() {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // topicKey pending confirm
  const [deleting, setDeleting] = useState<string | null>(null);           // topicKey being deleted
  const [deleteResult, setDeleteResult] = useState<{ topicKey: string; deleted: number; errors: number } | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<{ migrated: number; skipped: number; errors: number } | null>(null);
  const [purgingOrphans, setPurgingOrphans] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ deleted: number; keys: string[]; errors: number } | null>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);    // topicKey being exported
  const [seedingGrade, setSeedingGrade] = useState<string | null>(null);
  const [seedingAll, setSeedingAll] = useState(false);
  const [seedResult, setSeedResult] = useState<{ written: number; protected: number } | null>(null);

  const gradeBankStats = getGradeBankStats();
  const totalSeedQ = gradeBankStats.reduce((s, g) => s + g.count, 0);

  async function handleSeedGrade(grade: string) {
    setSeedingGrade(grade);
    setSeedResult(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await seedGradeBank(grade as any);
      setSeedResult(result);
      await refreshCounts();
    } finally {
      setSeedingGrade(null);
    }
  }

  async function handleSeedAll() {
    setSeedingAll(true);
    setSeedResult(null);
    try {
      const result = await seedGradeBank(undefined);
      setSeedResult(result);
      await refreshCounts();
    } finally {
      setSeedingAll(false);
    }
  }

  const handleDownloadCSV = async (topicKey: string, topicTitle: string) => {
    setDownloading(topicKey);
    try {
      const questions = await getAllQuestionsByTopic(topicKey);
      if (!questions.length) { alert(`No questions found for "${topicTitle}".`); return; }
      const escape = (s: string) => `"${String(s ?? '').replace(/"/g, '""')}"`;
      const header = 'id,topicKey,type,text,optionA,optionB,optionC,optionD,answer,correctAnswerText,explanation,difficulty,points,chapter,imageUrl';
      const rows = questions.map(q => {
        const ansIdx = parseInt(String(q.answer ?? '0'), 10);
        const correctText = q.options?.[ansIdx] ?? '';
        return [
          q.id ?? '',
          q.topicKey,
          q.type,
          q.text,
          q.options?.[0] ?? '',
          q.options?.[1] ?? '',
          q.options?.[2] ?? '',
          q.options?.[3] ?? '',
          q.answer ?? '',
          correctText,
          q.explanation ?? '',
          q.difficulty ?? 'easy',
          q.points ?? 1,
          q.chapter ?? 1,
          q.imageUrl ?? '',
        ].map(v => escape(String(v ?? ''))).join(',');
      });
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${topicKey}_questions.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + String(err));
    } finally {
      setDownloading(null);
    }
  };

  // Firestore-backed question counts per topicKey
  const [fsTopicCounts, setFsTopicCounts] = useState<Record<string, number> | null>(null);
  const [fsLoading, setFsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchCounts() {
      try {
        const { getFirebaseInstances } = await import('@/lib/firebase/config');
        const { collection, getDocs } = await import('firebase/firestore');
        const { fs } = getFirebaseInstances();
        if (!fs) { setFsTopicCounts({}); setFsLoading(false); return; }
        const snap = await getDocs(collection(fs, 'questions'));
        if (cancelled) return;
        const counts: Record<string, number> = {};
        snap.forEach(doc => {
          const tk = (doc.data() as { topicKey?: string }).topicKey;
          if (tk) counts[tk] = (counts[tk] ?? 0) + 1;
        });
        setFsTopicCounts(counts);
      } catch {
        setFsTopicCounts({});
      } finally {
        if (!cancelled) setFsLoading(false);
      }
    }
    fetchCounts();
    return () => { cancelled = true; };
  }, []);

  // Re-fetch after a successful delete so counts stay accurate
  const refreshCounts = useCallback(async () => {
    try {
      const { getFirebaseInstances } = await import('@/lib/firebase/config');
      const { collection, getDocs } = await import('firebase/firestore');
      const { fs } = getFirebaseInstances();
      if (!fs) return;
      const snap = await getDocs(collection(fs, 'questions'));
      const counts: Record<string, number> = {};
      snap.forEach(doc => {
        const tk = (doc.data() as { topicKey?: string }).topicKey;
        if (tk) counts[tk] = (counts[tk] ?? 0) + 1;
      });
      setFsTopicCounts(counts);
    } catch { /* silently ignore refresh errors */ }
  }, []);

  // Migrate orphaned questions whose topicKey appears in TOPIC_REMAP → canonical key
  const handleRepairOrphans = useCallback(async () => {
    setRepairing(true);
    setRepairResult(null);
    try {
      const { getFirebaseInstances } = await import('@/lib/firebase/config');
      const { collection, getDocs, writeBatch, doc } = await import('firebase/firestore');
      const { fs } = getFirebaseInstances();
      if (!fs) { setRepairing(false); return; }

      const snap = await getDocs(collection(fs, 'questions'));
      let migrated = 0, skipped = 0, errors = 0;
      const BATCH_SIZE = 400;

      const toMigrate: { id: string; newKey: string }[] = [];
      snap.forEach(d => {
        const tk = (d.data() as { topicKey?: string }).topicKey;
        if (tk && TOPIC_REMAP[tk]) toMigrate.push({ id: d.id, newKey: TOPIC_REMAP[tk] });
        else if (tk && !TOPIC_LABELS[tk]) skipped++;
      });

      for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
        const batch = writeBatch(fs);
        const chunk = toMigrate.slice(i, i + BATCH_SIZE);
        chunk.forEach(({ id, newKey }) => batch.update(doc(fs, 'questions', id), { topicKey: newKey }));
        try { await batch.commit(); migrated += chunk.length; }
        catch { errors += chunk.length; }
      }

      setRepairResult({ migrated, skipped, errors });
      await refreshCounts();
    } catch {
      setRepairResult({ migrated: 0, skipped: 0, errors: 1 });
    } finally {
      setRepairing(false);
    }
  }, [refreshCounts]);

  // Permanently delete all questions whose topicKey is not in TOPIC_LABELS
  const handlePurgeOrphans = useCallback(async () => {
    setPurgingOrphans(true);
    setPurgeResult(null);
    setConfirmPurge(false);
    try {
      const { getFirebaseInstances } = await import('@/lib/firebase/config');
      const { collection, getDocs, writeBatch, doc } = await import('firebase/firestore');
      const { fs } = getFirebaseInstances();
      if (!fs) { setPurgingOrphans(false); return; }

      const snap = await getDocs(collection(fs, 'questions'));
      const knownKeys = new Set(Object.keys(TOPIC_LABELS));
      const toDelete: { id: string; topicKey: string }[] = [];
      snap.forEach(d => {
        const tk = (d.data() as { topicKey?: string }).topicKey;
        if (tk && !knownKeys.has(tk)) toDelete.push({ id: d.id, topicKey: tk });
      });

      const orphanKeys = [...new Set(toDelete.map(d => d.topicKey))];
      let deleted = 0, errors = 0;
      const BATCH_SIZE = 400;

      for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const batch = writeBatch(fs);
        const chunk = toDelete.slice(i, i + BATCH_SIZE);
        chunk.forEach(({ id }) => batch.delete(doc(fs, 'questions', id)));
        try { await batch.commit(); deleted += chunk.length; }
        catch { errors += chunk.length; }
      }

      setPurgeResult({ deleted, keys: orphanKeys, errors });
      await refreshCounts();
    } catch {
      setPurgeResult({ deleted: 0, keys: [], errors: 1 });
    } finally {
      setPurgingOrphans(false);
    }
  }, [refreshCounts]);

  // Build subject → chapter map from TOPIC_LABELS + Firestore counts
  const topicCounts = fsTopicCounts ?? {};
  const bySubject: Record<string, { topicKey: string; title: string; emoji: string; count: number }[]> = {};

  for (const [topicKey, topic] of Object.entries(TOPIC_LABELS)) {
    const count = topicCounts[topicKey] ?? 0;
    if (count === 0) continue; // only show topics that have questions
    const subj = topic.subject;
    if (!bySubject[subj]) bySubject[subj] = [];
    bySubject[subj].push({ topicKey, title: topic.title, emoji: topic.emoji, count });
  }

  // Sort subjects by grade number
  const subjectOrder = [
    'Grade 4 Computing', 'Grade 5 Computing', 'Grade 6 Computing',
    'Grade 7 CS', 'Grade 7 Computing',
    'Grade 8 Computing',
    'Grade 9 CS (IGCSE)', 'Grade 9 DT (IGCSE)',
    'Grade 10 CS (IGCSE)',
    'Grade 11 CS (IGCSE)',
    'CS (A Level 9618)',
  ];
  const subjects = subjectOrder.filter(s => bySubject[s]);

  // Only count questions that belong to a recognised topicKey (what's actually displayed)
  const knownTopicKeys = new Set(Object.keys(TOPIC_LABELS));
  const total = Object.entries(topicCounts)
    .filter(([tk]) => knownTopicKeys.has(tk))
    .reduce((s, [, n]) => s + n, 0);
  const orphanTotal = Object.entries(topicCounts)
    .filter(([tk]) => !knownTopicKeys.has(tk))
    .reduce((s, [, n]) => s + n, 0);

  const handleDelete = async (topicKey: string) => {
    setDeleting(topicKey);
    setConfirmDelete(null);
    try {
      const result = await deleteQuestionsByTopic(topicKey);
      setDeleteResult({ topicKey, ...result });
      await refreshCounts();
    } catch {
      setDeleteResult({ topicKey, deleted: 0, errors: 1 });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <SectionHeader title="Question Bank" count={fsLoading ? undefined : total} accent="#34d399" />

      {/* Grand total summary */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderRadius: 12, marginBottom: 20,
        background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
      }}>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
          {fsLoading ? 'Loading question counts…' : `Total questions across all classes (${subjects.length} class${subjects.length !== 1 ? 'es' : ''})`}
        </span>
        {fsLoading ? (
          <span className="animate-spin inline-block w-5 h-5 border-2 rounded-full" style={{ borderColor: 'rgba(52,211,153,0.3)', borderTopColor: '#34d399' }} />
        ) : (
          <span style={{ fontSize: 22, fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
            {total.toLocaleString()}
          </span>
        )}
      </div>

      {!fsLoading && subjects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
          No questions found in Firestore.
        </div>
      )}

      {/* Orphan warning — questions with unrecognised topicKeys */}
      {!fsLoading && orphanTotal > 0 && (
        <div style={{
          padding: '12px 18px', borderRadius: 10, marginBottom: 16,
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#fbbf24' }}>
              ⚠️ {orphanTotal.toLocaleString()} question{orphanTotal !== 1 ? 's' : ''} in Firestore have an unrecognised topic key and are not shown below. These may be leftover pre-built questions or imports with mismatched keys.
            </span>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={handleRepairOrphans}
                disabled={repairing || purgingOrphans}
                style={{
                  fontSize: 12, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                  background: repairing ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.2)',
                  border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24',
                }}
              >
                {repairing ? 'Repairing…' : 'Repair Keys'}
              </button>
              {!confirmPurge ? (
                <button
                  onClick={() => setConfirmPurge(true)}
                  disabled={repairing || purgingOrphans}
                  style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171',
                  }}
                >
                  Delete Orphans
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePurgeOrphans}
                    disabled={purgingOrphans}
                    style={{
                      fontSize: 12, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                      background: 'rgba(239,68,68,0.3)', border: '1px solid rgba(239,68,68,0.6)', color: '#fca5a5', fontWeight: 700,
                    }}
                  >
                    {purgingOrphans ? 'Deleting…' : `Yes, delete ${orphanTotal}`}
                  </button>
                  <button
                    onClick={() => setConfirmPurge(false)}
                    disabled={purgingOrphans}
                    style={{
                      fontSize: 12, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Repair result banner */}
      {repairResult && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderRadius: 10, marginBottom: 16,
          background: repairResult.errors > 0 ? 'rgba(251,191,36,0.1)' : 'rgba(52,211,153,0.1)',
          border: `1px solid ${repairResult.errors > 0 ? 'rgba(251,191,36,0.3)' : 'rgba(52,211,153,0.3)'}`,
        }}>
          <span style={{ fontSize: 13, color: repairResult.errors > 0 ? '#fbbf24' : '#34d399' }}>
            {repairResult.errors > 0
              ? `⚠️ Repaired ${repairResult.migrated} question${repairResult.migrated !== 1 ? 's' : ''} with ${repairResult.errors} error(s). ${repairResult.skipped} key(s) have no known mapping.`
              : repairResult.migrated === 0
                ? `✓ No questions with remappable keys found. ${repairResult.skipped} question${repairResult.skipped !== 1 ? 's' : ''} still have unknown keys (not in remap table).`
                : `✓ Repaired ${repairResult.migrated} question${repairResult.migrated !== 1 ? 's' : ''} — topic keys updated to canonical names.`
            }
          </span>
          <button onClick={() => setRepairResult(null)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: repairResult.errors > 0 ? '#fbbf24' : '#34d399', fontSize: 16,
          }}>✕</button>
        </div>
      )}

      {/* Purge orphans result banner */}
      {purgeResult && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderRadius: 10, marginBottom: 16,
          background: purgeResult.errors > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)',
          border: `1px solid ${purgeResult.errors > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.3)'}`,
        }}>
          <span style={{ fontSize: 13, color: purgeResult.errors > 0 ? '#f87171' : '#34d399' }}>
            {purgeResult.errors > 0
              ? `⚠️ Deleted ${purgeResult.deleted} orphan question${purgeResult.deleted !== 1 ? 's' : ''} with ${purgeResult.errors} error(s).`
              : purgeResult.deleted === 0
                ? `✓ No orphan questions found to delete.`
                : `✓ Permanently deleted ${purgeResult.deleted} orphan question${purgeResult.deleted !== 1 ? 's' : ''} (keys: ${purgeResult.keys.join(', ')}).`
            }
          </span>
          <button onClick={() => setPurgeResult(null)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: purgeResult.errors > 0 ? '#f87171' : '#34d399', fontSize: 16,
          }}>✕</button>
        </div>
      )}

      {/* Delete result banner */}
      {deleteResult && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderRadius: 10, marginBottom: 16,
          background: deleteResult.errors > 0 ? 'rgba(251,191,36,0.1)' : 'rgba(52,211,153,0.1)',
          border: `1px solid ${deleteResult.errors > 0 ? 'rgba(251,191,36,0.3)' : 'rgba(52,211,153,0.3)'}`,
        }}>
          <span style={{ fontSize: 13, color: deleteResult.errors > 0 ? '#fbbf24' : '#34d399' }}>
            {deleteResult.errors > 0
              ? `⚠️ Deleted ${deleteResult.deleted} questions with ${deleteResult.errors} batch error(s)`
              : deleteResult.deleted === 0
                ? `✓ No Firestore questions found for that chapter (built-in questions are read-only)`
                : `✓ Deleted ${deleteResult.deleted} Firestore question${deleteResult.deleted !== 1 ? 's' : ''} for ${TOPIC_LABELS[deleteResult.topicKey]?.title ?? deleteResult.topicKey}`
            }
          </span>
          <button
            onClick={() => setDeleteResult(null)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, padding: 0 }}
          >×</button>
        </div>
      )}

      {/* ── Seed Grade Banks ── */}
      <div style={{
        borderRadius: 14, border: '1px solid rgba(201,168,76,0.2)',
        background: 'rgba(201,168,76,0.04)', padding: '18px 20px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#c9a84c' }}>Seed Grade Banks</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 10 }}>
              {totalSeedQ.toLocaleString()} questions available — teacher-modified questions are never overwritten
            </span>
          </div>
          <button
            onClick={handleSeedAll}
            disabled={seedingAll || seedingGrade !== null}
            style={{
              fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 8, cursor: seedingAll ? 'default' : 'pointer',
              background: seedingAll ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.18)',
              border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c', whiteSpace: 'nowrap',
            }}
          >
            {seedingAll ? 'Seeding…' : `Seed ALL (${totalSeedQ.toLocaleString()}q)`}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {gradeBankStats.map(gs => (
            <button
              key={gs.grade}
              onClick={() => handleSeedGrade(String(gs.grade))}
              disabled={seedingGrade === String(gs.grade) || seedingAll}
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                background: seedingGrade === String(gs.grade) ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
              }}
            >
              {seedingGrade === String(gs.grade) ? '…' : `${gs.subject} (${gs.count}q)`}
            </button>
          ))}
        </div>
        {seedResult && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#34d399' }}>
            ✓ {seedResult.written} written, {seedResult.protected} protected (teacher-modified)
            <button onClick={() => setSeedResult(null)} style={{ marginLeft: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>✕</button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {subjects.map(subj => {
          const chapters = bySubject[subj];
          const classTotal = chapters.reduce((s, c) => s + c.count, 0);
          return (
            <div
              key={subj}
              style={{
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.025)',
                overflow: 'hidden',
              }}
            >
              {/* Class header */}
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(52,211,153,0.06)',
              }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{subj}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{
                    fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    padding: '3px 12px', borderRadius: 999,
                    background: 'rgba(52,211,153,0.15)', color: '#34d399',
                    border: '1px solid rgba(52,211,153,0.3)',
                  }}>
                    {classTotal} questions
                  </span>
                </div>
              </div>
              {/* Chapters */}
              <div style={{ padding: '10px 0' }}>
                {chapters.map((ch, i) => {
                  const isConfirming = confirmDelete === ch.topicKey;
                  const isDeleting = deleting === ch.topicKey;
                  return (
                    <div
                      key={ch.topicKey}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 20px',
                        borderBottom: i < chapters.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        background: isConfirming ? 'rgba(239,68,68,0.06)' : 'transparent',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16 }}>{ch.emoji}</span>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{ch.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {/* Mini progress bar */}
                        <div style={{ width: 60, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 2,
                            width: `${Math.min(100, (ch.count / 100) * 100)}%`,
                            background: ch.count >= 50 ? '#34d399' : ch.count >= 20 ? '#60a5fa' : '#fbbf24',
                            transition: 'width 0.4s',
                          }} />
                        </div>
                        <span style={{
                          fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700,
                          color: ch.count >= 50 ? '#34d399' : ch.count >= 20 ? '#60a5fa' : '#fbbf24',
                          minWidth: 80, textAlign: 'right',
                        }}>
                          {ch.count} question{ch.count !== 1 ? 's' : ''}
                        </span>

                        {/* Download CSV button */}
                        <button
                          onClick={() => handleDownloadCSV(ch.topicKey, ch.title)}
                          disabled={downloading === ch.topicKey || ch.count === 0}
                          title={ch.count > 0 ? `Download all ${ch.count} questions as CSV` : 'No questions to download'}
                          style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: 11,
                            background: 'rgba(96,165,250,0.08)', color: downloading === ch.topicKey ? 'rgba(255,255,255,0.3)' : ch.count > 0 ? 'rgba(96,165,250,0.7)' : 'rgba(255,255,255,0.2)',
                            border: '1px solid rgba(96,165,250,0.15)', cursor: ch.count > 0 ? 'pointer' : 'default',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { if (ch.count > 0) { (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.18)'; (e.currentTarget as HTMLElement).style.color = '#60a5fa'; } }}
                          onMouseLeave={e => { if (ch.count > 0) { (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(96,165,250,0.7)'; } }}
                        >
                          {downloading === ch.topicKey ? '…' : '⬇'}
                        </button>

                        {/* Delete controls */}
                        {isDeleting ? (
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', minWidth: 80, textAlign: 'right' }}>
                            Deleting…
                          </span>
                        ) : isConfirming ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                            <span style={{ fontSize: 11, color: '#f87171' }}>Delete all?</span>
                            <button
                              onClick={() => handleDelete(ch.topicKey)}
                              style={{
                                padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                background: 'rgba(239,68,68,0.2)', color: '#f87171',
                                border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer',
                              }}
                            >Yes</button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              style={{
                                padding: '3px 10px', borderRadius: 6, fontSize: 11,
                                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                                border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
                              }}
                            >No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(ch.topicKey)}
                            title={`Delete all Firestore questions for ${ch.title}`}
                            style={{
                              marginLeft: 6,
                              padding: '3px 8px', borderRadius: 6, fontSize: 12,
                              background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.5)',
                              border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.18)';
                              (e.currentTarget as HTMLElement).style.color = '#f87171';
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
                              (e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.5)';
                            }}
                          >🗑</button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Chapter subtotal footer */}
                <div style={{
                  display: 'flex', justifyContent: 'flex-end',
                  padding: '8px 20px 4px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  marginTop: 4,
                }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    Total: <strong style={{ color: 'rgba(255,255,255,0.55)' }}>{classTotal}</strong>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
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

/* ─────────────── Database Tab ─────────────── */
type ResetKey = 'results' | 'practice' | 'rtdb' | 'all' | 'questions';
interface DatabaseTabProps {
  resetStatus: Record<string, 'idle' | 'confirm' | 'running' | 'done' | 'error'>;
  resetMsg: Record<string, string>;
  backupStatus: 'idle' | 'running' | 'done' | 'error';
  backupMsg: string;
  onWipe: (key: ResetKey) => void;
  onCancel: (key: ResetKey) => void;
  onBackup: () => void;
  fbUser: User | null;
  fbEmail: string;
  fbPass: string;
  fbLoginErr: string;
  fbLogging: boolean;
  onFbEmailChange: (v: string) => void;
  onFbPassChange: (v: string) => void;
  onFbLogin: () => void;
  onFbLogout: () => void;
}

function DatabaseTab({ resetStatus, resetMsg, backupStatus, backupMsg, onWipe, onCancel, onBackup,
  fbUser, fbEmail, fbPass, fbLoginErr, fbLogging, onFbEmailChange, onFbPassChange, onFbLogin, onFbLogout }: DatabaseTabProps) {
  const actions: { key: ResetKey; label: string; desc: string; accent: string }[] = [
    {
      key: 'results',
      label: 'Wipe Session Results',
      desc: 'Deletes all documents in the Firestore "results" collection. Session history and player scores will be permanently removed.',
      accent: '#f87171',
    },
    {
      key: 'practice',
      label: 'Wipe Practice Leaderboard',
      desc: 'Deletes all documents in the Firestore "practiceLeaderboard" collection. All solo-play scores will be permanently removed.',
      accent: '#fb923c',
    },
    {
      key: 'rtdb',
      label: 'Wipe RTDB Sessions',
      desc: 'Removes all live-session data from Realtime Database (sessions, session_codes, teacher_sessions, session_pub_questions, sessions_questions).',
      accent: '#facc15',
    },
    {
      key: 'all',
      label: 'Reset Everything',
      desc: 'Wipes session results, practice leaderboard, AND all RTDB sessions in one go. Use this for a full clean slate.',
      accent: '#e879f9',
    },
    {
      key: 'questions',
      label: 'Wipe All Questions',
      desc: 'Permanently deletes every document in the Firestore "questions" collection. Use this before re-importing a clean question set.',
      accent: '#f43f5e',
    },
  ];

  return (
    <div>
      <SectionHeader title="Database Reset" accent="#f87171" />

      {/* Firebase Auth — needed for RTDB and Firestore wipe operations */}
      <div style={{
        borderRadius: 12, padding: '16px 20px', marginBottom: 28,
        background: fbUser ? 'rgba(74,222,128,0.06)' : 'rgba(251,191,36,0.06)',
        border: `1.5px solid ${fbUser ? 'rgba(74,222,128,0.25)' : 'rgba(251,191,36,0.25)'}`,
      }}>
        {fbUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#4ade80', flex: 1 }}>
              🔓 Firebase signed in as <strong>{fbUser.email}</strong>
            </span>
            <button
              onClick={onFbLogout}
              style={{ padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: 'rgba(251,191,36,0.9)', marginBottom: 10, fontWeight: 600 }}>
              🔒 Sign in with your Firebase teacher account to allow wipe operations
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="email"
                placeholder="Email"
                value={fbEmail}
                onChange={e => onFbEmailChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onFbLogin()}
                style={{ padding: '7px 12px', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none', width: 200 }}
              />
              <input
                type="password"
                placeholder="Password"
                value={fbPass}
                onChange={e => onFbPassChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onFbLogin()}
                style={{ padding: '7px 12px', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none', width: 160 }}
              />
              <button
                onClick={onFbLogin}
                disabled={fbLogging || !fbEmail || !fbPass}
                style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: fbLogging ? 'wait' : 'pointer', background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24', opacity: (!fbEmail || !fbPass) ? 0.5 : 1 }}
              >
                {fbLogging ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
            {fbLoginErr && <p style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{fbLoginErr}</p>}
          </div>
        )}
      </div>

      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 28 }}>
        Permanently delete data from the database. These actions cannot be undone.
      </p>
      <div style={{ display: 'grid', gap: 16 }}>
        {actions.map(({ key, label, desc, accent }) => {
          const status = resetStatus[key] || 'idle';
          const msg = resetMsg[key] || '';
          return (
            <div
              key={key}
              style={{
                borderRadius: 16,
                padding: '20px 24px',
                background: 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${status === 'confirm' || status === 'running' ? `${accent}55` : 'rgba(255,255,255,0.08)'}`,
                transition: 'border-color 0.2s',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{label}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 16 }}>{desc}</p>

              {status === 'done' && (
                <div style={{ fontSize: 13, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={14} /> {msg}
                </div>
              )}
              {status === 'error' && (
                <div style={{ fontSize: 13, color: '#f87171' }}>⚠ {msg}</div>
              )}
              {status === 'running' && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Deleting…
                </div>
              )}

              {(status === 'idle' || status === 'done' || status === 'error') && (
                <button
                  onClick={() => onWipe(key)}
                  style={{
                    padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    background: `${accent}22`, border: `1px solid ${accent}44`,
                    color: accent, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${accent}33`)}
                  onMouseLeave={e => (e.currentTarget.style.background = `${accent}22`)}
                >
                  {status === 'done' ? 'Wipe again' : 'Wipe'}
                </button>
              )}

              {status === 'confirm' && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: accent, fontWeight: 600 }}>Are you sure? This cannot be undone.</span>
                  <button
                    onClick={() => onWipe(key)}
                    style={{ padding: '7px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: accent, color: '#0d0d14', border: 'none' }}
                  >
                    Yes, wipe
                  </button>
                  <button
                    onClick={() => onCancel(key)}
                    className="btn-glass"
                    style={{ padding: '7px 14px', fontSize: 13, minHeight: 0 }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Backup */}
      <div style={{ marginTop: 28, borderRadius: 16, padding: '20px 24px', background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(99,179,237,0.2)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Backup Database</h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 16 }}>
          Downloads a full JSON snapshot of all Firestore collections (users, quizzes, questions, results, leaderboard) and the Realtime Database.
        </p>
        {backupStatus === 'done' && (
          <div style={{ fontSize: 13, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Check size={14} /> {backupMsg}
          </div>
        )}
        {backupStatus === 'error' && (
          <div style={{ fontSize: 13, color: '#f87171', marginBottom: 12 }}>⚠ {backupMsg}</div>
        )}
        <button
          onClick={onBackup}
          disabled={backupStatus === 'running'}
          style={{
            padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: backupStatus === 'running' ? 'not-allowed' : 'pointer',
            background: 'rgba(99,179,237,0.12)', border: '1px solid rgba(99,179,237,0.3)',
            color: '#93c5fd', transition: 'background 0.15s', opacity: backupStatus === 'running' ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (backupStatus !== 'running') (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,179,237,0.22)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,179,237,0.12)'; }}
        >
          {backupStatus === 'running' ? '⏳ Exporting…' : backupStatus === 'done' ? 'Download again' : '⬇ Download Backup'}
        </button>
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
