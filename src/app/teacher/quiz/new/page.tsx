'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  GraduationCap, ChevronLeft, Shuffle, Shield, Trophy, Rocket,
  Settings2, Hash, Clock4, Check, ChevronDown,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { getQuestionsByTopic, getRandomQuestions } from '@/lib/firebase/questions';
import { saveQuiz, getQuiz } from '@/lib/firebase/quizzes';
import { TOPIC_LABELS, getGroupedTopics } from '@/types/question';
import type { Question } from '@/types/question';
import type { Quiz } from '@/types/quiz';
import { uid } from '@/lib/utils';

const GROUPED_TOPICS = getGroupedTopics();

/* ── same background as teacher/page.tsx ─────────────────────────── */
const BG = [
  'radial-gradient(ellipse 80% 50% at 30% 0%,   rgba(56,189,248,0.13) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 20%,  rgba(99,102,241,0.1)  0%, transparent 50%)',
  'radial-gradient(ellipse 80% 50% at 10% 90%,  rgba(201,168,76,0.09) 0%, transparent 50%)',
  '#050814',
].join(',');

const CARD: React.CSSProperties = {
  borderRadius: 18,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '22px 22px 20px',
};

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 11,
  background: 'rgba(255,255,255,0.05)',
  border: '1.5px solid rgba(255,255,255,0.1)',
  color: '#f5f3ee',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-body)',
  transition: 'border-color 0.15s',
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', marginBottom: 7 }}>
      {children}
    </div>
  );
}

function Toggle({ on, onChange, label, icon: Icon }: {
  on: boolean; onChange: () => void; label: string; icon: React.ElementType;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer', userSelect: 'none' }}>
      <button type="button" role="switch" aria-checked={on} onClick={onChange}
        style={{ flexShrink: 0, width: 38, height: 21, borderRadius: 999, position: 'relative', border: 'none', cursor: 'pointer', background: on ? '#059669' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: 2.5, left: on ? 19 : 2.5, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.35)' }} />
      </button>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: on ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)', transition: 'color 0.2s' }}>
        <Icon size={13} strokeWidth={1.75} /> {label}
      </span>
    </label>
  );
}

/* ── inner component (needs useSearchParams so must be inside Suspense) ── */
function QuizBuilderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const { toast } = useToast();
  const { user, ready, loading } = useAuth();

  const [title, setTitle]             = useState('');
  const [topicKey, setTopicKey]       = useState('');
  const [timeLimit, setTimeLimit]     = useState(20);
  const [pointsPerQ, setPointsPerQ]   = useState(100);
  const [shuffleQ, setShuffleQ]       = useState(true);
  const [shuffleOpts, setShuffleOpts] = useState(false);
  const [antiCheat, setAntiCheat]     = useState(true);
  const [showLB, setShowLB]           = useState(true);
  const [questions, setQuestions]     = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingQ, setLoadingQ]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [topicOpen, setTopicOpen]     = useState(false);

  useEffect(() => {
    if (!topicKey) return;
    setLoadingQ(true);
    getQuestionsByTopic(topicKey).then(qs => { setQuestions(qs); setLoadingQ(false); });
  }, [topicKey]);

  useEffect(() => {
    if (!editId) return;
    getQuiz(editId).then(q => {
      if (!q) return;
      setTitle(q.title);
      setTopicKey(q.topicKey || '');
      setTimeLimit(q.settings?.timeLimit || 20);
      setPointsPerQ(q.settings?.pointsPerQ || 100);
      setShuffleQ(q.settings?.shuffleQuestions ?? true);
      setShuffleOpts(q.settings?.shuffleOptions ?? false);
      setAntiCheat(q.settings?.antiCheat ?? true);
      setShowLB(q.settings?.showLeaderboard ?? true);
      setSelectedIds(new Set(q.questionIds || []));
    });
  }, [editId]);

  function toggle(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function pickRandom(n: number) {
    if (!topicKey) return;
    const qs = await getRandomQuestions(topicKey, n);
    setSelectedIds(new Set(qs.map(q => q.id)));
  }

  async function handleSave(status: 'draft' | 'published') {
    if (!user)              { toast('Please sign in', 'error'); return; }
    if (!title.trim())      { toast('Enter a quiz title', 'error'); return; }
    if (selectedIds.size === 0) { toast('Select at least one question', 'error'); return; }
    setSaving(true);
    try {
      const quiz: Quiz = {
        id: editId || uid(),
        title: title.trim(),
        teacherId: user.uid,
        topicKey,
        questionIds: Array.from(selectedIds),
        questions: questions.filter(q => selectedIds.has(q.id)),
        status,
        createdAt: Date.now(),
        settings: { timeLimit, pointsPerQ, shuffleQuestions: shuffleQ, shuffleOptions: shuffleOpts, antiCheat, showLeaderboard: showLB },
      };
      await saveQuiz(quiz);
      toast(status === 'published' ? 'Quiz published!' : 'Saved as draft', 'success');
      router.push('/teacher');
    } catch {
      toast('Failed to save quiz', 'error');
    } finally {
      setSaving(false);
    }
  }

  /* ── loading / auth guards ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <GraduationCap size={32} color="#c9a84c" strokeWidth={1.5} style={{ opacity: 0.6 }} />
      </div>
    );
  }
  if (!ready || !user) { router.replace('/teacher'); return null; }

  const selectedLabel = topicKey ? TOPIC_LABELS[topicKey] : null;

  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee', fontFamily: 'var(--font-body)' }}>

      {/* ── sticky nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 22px',
        background: 'rgba(5,8,20,0.8)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <button onClick={() => router.push('/teacher')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: '4px 8px', borderRadius: 8, transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#c9a84c')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
          <ChevronLeft size={15} /> Teacher
        </button>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: '#fff', margin: 0 }}>
          {editId ? 'Edit Quiz' : 'New Quiz'}
        </h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 9 }}>
          <button onClick={() => handleSave('draft')} disabled={saving}
            style={{ padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
            Save draft
          </button>
          <button onClick={() => handleSave('published')} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#b8942a,#d4aa45,#c9a84c)', border: 'none', color: '#1a1200', cursor: saving ? 'default' : 'pointer', boxShadow: '0 2px 14px rgba(201,168,76,0.3)', opacity: saving ? 0.6 : 1 }}>
            <Rocket size={13} /> {saving ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </nav>

      {/* ── page body ── */}
      <div style={{ maxWidth: 660, margin: '0 auto', padding: '32px 20px 80px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Title + topic */}
        <div style={CARD}>
          <Label>QUIZ TITLE</Label>
          <input
            style={INPUT_STYLE} placeholder="e.g. HTML Basics — Chapter 6"
            value={title} onChange={e => setTitle(e.target.value)}
            onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.5)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          <div style={{ height: 14 }} />
          <Label>TOPIC</Label>
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => setTopicOpen(o => !o)}
              style={{ ...INPUT_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderColor: topicOpen ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.1)', textAlign: 'left' }}>
              <span style={{ color: selectedLabel ? '#f5f3ee' : 'rgba(255,255,255,0.25)' }}>
                {selectedLabel ? `${selectedLabel.emoji} ${selectedLabel.title}` : '— Choose a topic —'}
              </span>
              <ChevronDown size={13} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, transform: topicOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {topicOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, zIndex: 30, maxHeight: 300, overflowY: 'auto', background: 'rgba(12,11,28,0.98)', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(201,168,76,0.18)', borderRadius: 13, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
                {GROUPED_TOPICS.map(({ subject, topics }) => (
                  <div key={subject}>
                    <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 2 }}>
                      {subject}
                    </div>
                    {topics.map(t => (
                      <button key={t.key} type="button" onClick={() => { setTopicKey(t.key); setTopicOpen(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px 8px 22px', textAlign: 'left', background: topicKey === t.key ? 'rgba(201,168,76,0.12)' : 'none', border: 'none', cursor: 'pointer', color: topicKey === t.key ? '#c9a84c' : 'rgba(255,255,255,0.65)', fontSize: 13 }}
                        onMouseEnter={e => { if (topicKey !== t.key) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if (topicKey !== t.key) (e.currentTarget as HTMLElement).style.background = 'none'; }}>
                        <span style={{ fontSize: 14 }}>{t.emoji}</span>
                        <span>{t.title}</span>
                        {topicKey === t.key && <Check size={11} color="#c9a84c" style={{ marginLeft: 'auto' }} />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Settings2 size={14} color="rgba(255,255,255,0.4)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Settings</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginBottom: 20 }}>
            <div>
              <Label>SECONDS PER QUESTION</Label>
              <div style={{ position: 'relative' }}>
                <Clock4 size={12} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="number" min={5} max={120} value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value) || 20)}
                  style={{ ...INPUT_STYLE, paddingLeft: 32 }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
            </div>
            <div>
              <Label>POINTS PER QUESTION</Label>
              <div style={{ position: 'relative' }}>
                <Hash size={12} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="number" min={10} max={1000} step={10} value={pointsPerQ} onChange={e => setPointsPerQ(parseInt(e.target.value) || 100)}
                  style={{ ...INPUT_STYLE, paddingLeft: 32 }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Toggle on={shuffleQ}    onChange={() => setShuffleQ(v => !v)}    icon={Shuffle} label="Shuffle questions" />
            <Toggle on={shuffleOpts} onChange={() => setShuffleOpts(v => !v)} icon={Shuffle} label="Shuffle answer options" />
            <Toggle on={antiCheat}   onChange={() => setAntiCheat(v => !v)}   icon={Shield}  label="Anti-cheat — tab switch detection" />
            <Toggle on={showLB}      onChange={() => setShowLB(v => !v)}      icon={Trophy}  label="Show live leaderboard" />
          </div>
        </div>

        {/* Question picker */}
        {topicKey && (
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Questions</span>
                {selectedIds.size > 0 && (
                  <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 999, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c', fontFamily: 'var(--font-mono)' }}>
                    {selectedIds.size} selected
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                {[
                  { label: 'All',    fn: () => setSelectedIds(new Set(questions.map(q => q.id))) },
                  { label: 'Rnd 10', fn: () => pickRandom(10) },
                  { label: 'Rnd 20', fn: () => pickRandom(20) },
                ].map(({ label, fn }) => (
                  <button key={label} onClick={fn}
                    style={{ padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.11)'; el.style.color = '#fff'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.06)'; el.style.color = 'rgba(255,255,255,0.5)'; }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loadingQ ? (
              <p style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading questions…</p>
            ) : questions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No approved questions for this topic yet.</p>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 4 }}>Import questions in the Question Library first.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
                {questions.map(q => {
                  const checked = selectedIds.has(q.id);
                  return (
                    <label key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '11px 13px', borderRadius: 11, cursor: 'pointer', background: checked ? 'rgba(201,168,76,0.07)' : 'rgba(255,255,255,0.02)', border: `1.5px solid ${checked ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.15s' }}>
                      <div onClick={() => toggle(q.id)} style={{ flexShrink: 0, marginTop: 1, width: 17, height: 17, borderRadius: 5, background: checked ? '#c9a84c' : 'rgba(255,255,255,0.06)', border: `1.5px solid ${checked ? '#c9a84c' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        {checked && <Check size={10} color="#1a1200" strokeWidth={2.5} />}
                      </div>
                      <input type="checkbox" checked={checked} onChange={() => toggle(q.id)} style={{ display: 'none' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, lineHeight: 1.45, color: checked ? '#f5f3ee' : 'rgba(255,255,255,0.55)', margin: 0, marginBottom: 3 }}>{q.text}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)', margin: 0 }}>{q.type} · {q.difficulty || 'medium'}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bottom save row */}
        <div style={{ display: 'flex', gap: 11 }}>
          <button onClick={() => handleSave('draft')} disabled={saving}
            style={{ flexShrink: 0, padding: '13px 22px', borderRadius: 13, fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
            Save draft
          </button>
          <button onClick={() => handleSave('published')} disabled={saving}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 22px', borderRadius: 13, fontSize: 14, fontWeight: 700, background: saving ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg,#b8942a,#d4aa45,#c9a84c)', border: 'none', color: '#1a1200', cursor: saving ? 'default' : 'pointer', boxShadow: saving ? 'none' : '0 4px 20px rgba(201,168,76,0.3)', transition: 'all 0.2s' }}>
            <Rocket size={15} /> {saving ? 'Publishing…' : 'Publish quiz'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default function QuizBuilderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <GraduationCap size={32} color="#c9a84c" strokeWidth={1.5} style={{ opacity: 0.6 }} />
      </div>
    }>
      <QuizBuilderInner />
    </Suspense>
  );
}
