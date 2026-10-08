'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, BookOpen, Search, CheckCircle, Clock, Filter, Edit2, X, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFirebase } from '@/hooks/useFirebase';
import { getQuestionsByTopic, getPendingQuestions, updateApprovalStatus, updateQuestion } from '@/lib/firebase/questions';
import { useToast } from '@/components/ui/Toast';
import { TOPIC_LABELS } from '@/types/question';
import type { Question } from '@/types/question';

const BG = [
  'radial-gradient(ellipse 80% 50% at 30% 0%,   rgba(139,92,246,0.12) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 20%,  rgba(56,189,248,0.08)  0%, transparent 50%)',
  '#050814',
].join(',');

const TOPICS = Object.entries(TOPIC_LABELS);

export default function QuestionBankPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, ready } = useAuth();
  const { configured } = useFirebase();

  const [selectedTopic, setSelectedTopic] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'browse' | 'pending'>('browse');
  const [approvingAll, setApprovingAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    getPendingQuestions().then(setPendingQuestions);
  }, [ready, user]);

  useEffect(() => {
    if (!selectedTopic) return;
    setLoading(true);
    getQuestionsByTopic(selectedTopic).then(qs => {
      setQuestions(qs);
      setLoading(false);
    });
  }, [selectedTopic]);

  async function approveQuestion(id: string) {
    try {
      await updateApprovalStatus(id, 'approved');
      setPendingQuestions(prev => prev.filter(q => q.id !== id));
      toast('Question approved', 'success');
    } catch {
      toast('Failed to approve', 'error');
    }
  }

  async function approveAll() {
    if (pendingQuestions.length === 0) return;
    setApprovingAll(true);
    try {
      await Promise.all(pendingQuestions.map(q => updateApprovalStatus(q.id!, 'approved')));
      toast(`Approved all ${pendingQuestions.length} questions`, 'success');
      setPendingQuestions([]);
    } catch {
      toast('Some approvals failed — try again', 'error');
    } finally {
      setApprovingAll(false);
    }
  }

  function startEdit(q: Question) {
    setEditingId(q.id!);
    setEditText(q.text);
    setEditExplanation(q.explanation || '');
  }

  async function saveEdit(q: Question) {
    if (!editingId) return;
    setSaving(true);
    try {
      await updateQuestion(editingId, { text: editText, explanation: editExplanation, teacherModified: true });
      setQuestions(prev => prev.map(x => x.id === editingId ? { ...x, text: editText, explanation: editExplanation, teacherModified: true } : x));
      setPendingQuestions(prev => prev.map(x => x.id === editingId ? { ...x, text: editText, explanation: editExplanation, teacherModified: true } : x));
      toast('Question saved', 'success');
      setEditingId(null);
    } catch {
      toast('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return null;

  if (!configured || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center">
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Sign in as a teacher to access the question bank.</p>
          <button onClick={() => router.push('/teacher')} className="btn-glass">Go to Teacher Login</button>
        </div>
      </div>
    );
  }

  const filtered = questions.filter(q =>
    !search || q.text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>
      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(5,8,20,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => router.push('/teacher')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={14} /> Teacher
          </button>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>QUESTION BANK</span>
          <div style={{ width: 80 }} />
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: '#fff', marginBottom: 6 }}>
            Question <span style={{ color: '#c4b5fd' }}>Bank</span>
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
            Browse and manage all questions in the system
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(['browse', 'pending'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '9px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                background: tab === t ? 'rgba(196,181,253,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${tab === t ? 'rgba(196,181,253,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: tab === t ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {t === 'browse' ? <><BookOpen size={14} /> Browse All</> : <><Clock size={14} /> Pending ({pendingQuestions.length})</>}
            </button>
          ))}
        </div>

        {/* BROWSE TAB */}
        {tab === 'browse' && (
          <>
            {/* Topic selector + search */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <Filter size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                <select
                  value={selectedTopic}
                  onChange={e => setSelectedTopic(e.target.value)}
                  style={{
                    width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 11, paddingBottom: 11,
                    borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)', color: selectedTopic ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontSize: 14, cursor: 'pointer', appearance: 'none',
                  }}
                >
                  <option value="">Select a topic…</option>
                  {TOPICS.map(([key, label]) => (
                    <option key={key} value={key} style={{ background: '#1a1a2e', color: '#fff' }}>
                      {label.emoji} {label.title}
                    </option>
                  ))}
                </select>
              </div>
              {selectedTopic && (
                <div style={{ position: 'relative', flex: '1 1 200px' }}>
                  <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    placeholder="Search questions…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 11, paddingBottom: 11,
                      borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14,
                    }}
                  />
                </div>
              )}
            </div>

            {/* No topic selected */}
            {!selectedTopic && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.25)' }}>
                <BookOpen size={48} strokeWidth={1} style={{ margin: '0 auto 16px' }} />
                <p style={{ fontSize: 15 }}>Select a topic to view questions</p>
              </div>
            )}

            {/* Loading */}
            {selectedTopic && loading && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading…</div>
            )}

            {/* Question list */}
            {selectedTopic && !loading && (
              <div style={{ display: 'grid', gap: 10 }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                    No questions found for this topic.
                  </div>
                ) : (
                  filtered.map((q, i) => (
                    <div
                      key={q.id}
                      style={{
                        borderRadius: 14, padding: '16px 18px',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${editingId === q.id ? 'rgba(196,181,253,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {editingId === q.id ? (
                        <div style={{ display: 'grid', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>QUESTION TEXT</label>
                            <textarea
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              rows={3}
                              style={{
                                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14, lineHeight: 1.5,
                                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(196,181,253,0.3)',
                                color: '#fff', resize: 'vertical',
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>EXPLANATION</label>
                            <textarea
                              value={editExplanation}
                              onChange={e => setEditExplanation(e.target.value)}
                              rows={2}
                              style={{
                                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(196,181,253,0.3)',
                                color: 'rgba(255,255,255,0.7)', resize: 'vertical',
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingId(null)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, fontSize: 13, cursor: 'pointer', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}>
                              <X size={13} /> Cancel
                            </button>
                            <button onClick={() => saveEdit(q)} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(196,181,253,0.15)', color: '#c4b5fd', border: '1px solid rgba(196,181,253,0.3)' }}>
                              <Save size={13} /> {saving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                            <p style={{ fontSize: 14, color: '#fff', lineHeight: 1.55, flex: 1 }}>
                              <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                {i + 1}.
                              </span>
                              {q.text}
                            </p>
                            <span style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', flexShrink: 0,
                              padding: '3px 8px', borderRadius: 999,
                              background: q.type === 'mcq' ? 'rgba(56,189,248,0.12)' : 'rgba(16,185,129,0.12)',
                              color: q.type === 'mcq' ? '#7dd3fc' : '#6ee7b7',
                              border: `1px solid ${q.type === 'mcq' ? 'rgba(56,189,248,0.25)' : 'rgba(16,185,129,0.25)'}`,
                            }}>
                              {q.type === 'mcq' ? 'MCQ' : 'T/F'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)' }}>
                              {q.difficulty} · {q.points} pt{q.points !== 1 ? 's' : ''}
                            </p>
                            <button
                              onClick={() => startEdit(q)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)',
                                border: '1px solid rgba(255,255,255,0.1)',
                              }}
                            >
                              <Edit2 size={11} /> Edit
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
                {filtered.length > 0 && (
                  <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.25)', padding: '8px 0', fontFamily: 'var(--font-mono)' }}>
                    {filtered.length} question{filtered.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* PENDING TAB */}
        {tab === 'pending' && (
          <div style={{ display: 'grid', gap: 10 }}>
            {pendingQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.25)' }}>
                <CheckCircle size={48} strokeWidth={1} style={{ margin: '0 auto 16px', color: 'rgba(16,185,129,0.4)' }} />
                <p style={{ fontSize: 15 }}>No pending questions — all caught up!</p>
              </div>
            ) : (
              <>
                {/* Approve All row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, padding: '0 2px' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>
                    {pendingQuestions.length} pending
                  </span>
                  <button
                    onClick={approveAll}
                    disabled={approvingAll}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      color: '#fff', border: 'none',
                      boxShadow: '0 2px 12px rgba(16,185,129,0.3)',
                      opacity: approvingAll ? 0.6 : 1,
                    }}
                  >
                    <CheckCircle size={14} /> {approvingAll ? 'Approving…' : 'Approve All'}
                  </button>
                </div>

                {pendingQuestions.map((q, i) => (
                  <div
                    key={q.id}
                    style={{
                      borderRadius: 14, padding: '16px 18px',
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${editingId === q.id ? 'rgba(196,181,253,0.35)' : 'rgba(245,158,11,0.2)'}`,
                    }}
                  >
                    {editingId === q.id ? (
                      /* Inline edit form */
                      <div style={{ display: 'grid', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>QUESTION TEXT</label>
                          <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            rows={3}
                            style={{
                              width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14, lineHeight: 1.5,
                              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(196,181,253,0.3)',
                              color: '#fff', resize: 'vertical',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>EXPLANATION</label>
                          <textarea
                            value={editExplanation}
                            onChange={e => setEditExplanation(e.target.value)}
                            rows={2}
                            style={{
                              width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(196,181,253,0.3)',
                              color: 'rgba(255,255,255,0.7)', resize: 'vertical',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingId(null)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, fontSize: 13, cursor: 'pointer', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}>
                            <X size={13} /> Cancel
                          </button>
                          <button onClick={() => saveEdit(q)} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(196,181,253,0.15)', color: '#c4b5fd', border: '1px solid rgba(196,181,253,0.3)' }}>
                            <Save size={13} /> {saving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p style={{ fontSize: 14, color: '#fff', lineHeight: 1.55, marginBottom: 12 }}>
                          <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{i + 1}.</span>
                          {q.text}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>
                            {q.topicKey} · {q.type} · {q.difficulty}
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => startEdit(q)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '6px 13px', borderRadius: 9, fontSize: 12, cursor: 'pointer',
                                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                                border: '1px solid rgba(255,255,255,0.12)',
                              }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => approveQuestion(q.id!)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                background: 'rgba(16,185,129,0.15)', color: '#6ee7b7',
                                border: '1px solid rgba(16,185,129,0.3)',
                              }}
                            >
                              <CheckCircle size={12} /> Approve
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
