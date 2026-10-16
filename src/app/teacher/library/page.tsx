'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, BookOpen, Search, CheckCircle, Clock, Edit2, X, Save, Plus, ChevronDown, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFirebase } from '@/hooks/useFirebase';
import { getQuestionsByTopic, getPendingQuestions, updateApprovalStatus, updateQuestion, saveQuestionDeduped, deleteQuestion } from '@/lib/firebase/questions';
import { useToast } from '@/components/ui/Toast';
import { TOPIC_LABELS } from '@/types/question';
import { resolveAnswerIndex } from '@/lib/utils';
import TopicPicker from '@/components/TopicPicker';
import type { Question } from '@/types/question';

/** Human-readable label + colour for each question type */
const TYPE_META: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  mcq:         { label: 'MCQ',         bg: 'rgba(56,189,248,0.12)',  fg: '#7dd3fc', border: 'rgba(56,189,248,0.25)' },
  truefalse:   { label: 'T/F',         bg: 'rgba(16,185,129,0.12)', fg: '#6ee7b7', border: 'rgba(16,185,129,0.25)' },
  shortanswer: { label: 'Short',       bg: 'rgba(245,158,11,0.12)', fg: '#fcd34d', border: 'rgba(245,158,11,0.25)' },
  fillinblank: { label: 'Fill',        bg: 'rgba(139,92,246,0.12)', fg: '#c4b5fd', border: 'rgba(139,92,246,0.25)' },
  matching:    { label: 'Match',       bg: 'rgba(236,72,153,0.12)', fg: '#f9a8d4', border: 'rgba(236,72,153,0.25)' },
  ordering:    { label: 'Order',       bg: 'rgba(249,115,22,0.12)', fg: '#fdba74', border: 'rgba(249,115,22,0.25)' },
};

function TypeBadge({ type }: { type: string }) {
  const m = TYPE_META[type] ?? { label: type, bg: 'rgba(255,255,255,0.06)', fg: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.12)' };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0, padding: '3px 8px', borderRadius: 999, background: m.bg, color: m.fg, border: `1px solid ${m.border}` }}>
      {m.label}
    </span>
  );
}

const BG = [
  'radial-gradient(ellipse 80% 50% at 30% 0%,   rgba(139,92,246,0.12) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 20%,  rgba(56,189,248,0.08)  0%, transparent 50%)',
  '#050814',
].join(',');


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
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [tab, setTab] = useState<'browse' | 'pending'>('browse');
  const [approvingAll, setApprovingAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [editType, setEditType] = useState<string>('mcq');
  const [editOptions, setEditOptions] = useState<string[]>(['', '', '', '']);
  const [editAnswer, setEditAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  // Add Question form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTopic, setAddTopic] = useState('');
  const [addType, setAddType] = useState<Question['type']>('mcq');
  const [addText, setAddText] = useState('');
  const [addOptionA, setAddOptionA] = useState('');
  const [addOptionB, setAddOptionB] = useState('');
  const [addOptionC, setAddOptionC] = useState('');
  const [addOptionD, setAddOptionD] = useState('');
  const [addAnswer, setAddAnswer] = useState('');
  const [addExplanation, setAddExplanation] = useState('');
  const [addDifficulty, setAddDifficulty] = useState<Question['difficulty']>('medium');
  const [addPoints, setAddPoints] = useState(1);
  const [addSaving, setAddSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    getPendingQuestions().then(setPendingQuestions);
  }, [ready, user]);

  useEffect(() => {
    if (!selectedTopic) return;
    setLoading(true);
    setSearch('');
    setFilterType('');
    setFilterStatus('');
    // Include both approved and pending so teachers can see all their questions
    getQuestionsByTopic(selectedTopic, ['approved', 'pending']).then(qs => {
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
    setEditType(q.type || 'mcq');
    // Pad options array to 4 slots for the UI
    const opts = q.options ? [...q.options] : [];
    while (opts.length < 4) opts.push('');
    setEditOptions(opts);
    setEditAnswer(q.answer ?? '');
  }

  async function saveEdit(q: Question) {
    if (!editingId) return;
    setSaving(true);
    try {
      // Build options based on type
      let options: string[] = q.options ?? [];
      let answer = editAnswer.trim();

      if (editType === 'mcq') {
        options = editOptions.map(o => o.trim()).filter(Boolean);
        if (options.length < 2) { toast('MCQ needs at least 2 options', 'error'); setSaving(false); return; }
        const idx = resolveAnswerIndex(answer);
        if (isNaN(idx) || idx < 0 || idx >= options.length) {
          toast(`Answer index must be 0–${options.length - 1}`, 'error'); setSaving(false); return;
        }
      } else if (editType === 'truefalse') {
        options = ['True', 'False'];
        const n = answer.toLowerCase();
        if (n !== '0' && n !== '1' && n !== 'true' && n !== 'false') {
          toast('True/False answer: 0 = True, 1 = False', 'error'); setSaving(false); return;
        }
        // Normalise to index string format used elsewhere
        answer = (n === 'true' || n === '0') ? '0' : '1';
      } else {
        options = editOptions.map(o => o.trim()).filter(Boolean);
      }

      const update = { text: editText, explanation: editExplanation, type: editType as Question['type'], options, answer, teacherModified: true };
      await updateQuestion(editingId, update);
      setQuestions(prev => prev.map(x => x.id === editingId ? { ...x, ...update } : x));
      setPendingQuestions(prev => prev.map(x => x.id === editingId ? { ...x, ...update } : x));
      toast('Question saved', 'success');
      setEditingId(null);
    } catch {
      toast('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await deleteQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
      setPendingQuestions(prev => prev.filter(q => q.id !== id));
      toast('Question deleted', 'success');
    } catch {
      toast('Delete failed', 'error');
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  }

  async function handleAddQuestion() {
    if (!addText.trim() || !addTopic) { toast('Topic and question text are required', 'error'); return; }
    setAddSaving(true);
    try {
      let options: string[] = [];
      let answer = addAnswer.trim();

      if (addType === 'mcq') {
        options = [addOptionA, addOptionB, addOptionC, addOptionD].map(o => o.trim()).filter(Boolean);
        if (options.length < 2) { toast('MCQ needs at least 2 options', 'error'); setAddSaving(false); return; }
        const idx = resolveAnswerIndex(answer);
        if (isNaN(idx) || idx < 0 || idx >= options.length) { toast(`MCQ answer must be a 0-based index (0–${options.length - 1})`, 'error'); setAddSaving(false); return; }
      } else if (addType === 'truefalse') {
        options = ['True', 'False'];
        const n = answer.toLowerCase();
        if (n !== 'true' && n !== 'false') { toast('True/False answer must be "true" or "false"', 'error'); setAddSaving(false); return; }
        answer = n;
      } else if (addType === 'matching') {
        options = [addOptionA, addOptionB, addOptionC, addOptionD].map(o => o.trim()).filter(Boolean);
        if (options.length < 2) { toast('Matching needs at least 2 left-side items', 'error'); setAddSaving(false); return; }
      } else if (addType === 'ordering') {
        options = [addOptionA, addOptionB, addOptionC, addOptionD].map(o => o.trim()).filter(Boolean);
        if (options.length < 2) { toast('Ordering needs at least 2 items', 'error'); setAddSaving(false); return; }
      }

      const q: Omit<Question, 'id'> = {
        quizId: null,
        topicKey: addTopic,
        type: addType,
        text: addText.trim(),
        options,
        answer,
        explanation: addExplanation.trim(),
        difficulty: addDifficulty,
        points: addPoints,
        chapter: 0,
        approvalStatus: 'pending',
        source: 'manual' as const,
        createdAt: Date.now(),
      };

      const result = await saveQuestionDeduped(q);
      if (!result.saved) {
        toast('A question with this text already exists in this topic', 'error');
        setAddSaving(false);
        return;
      }

      toast('Question added — it\'s in Pending for approval', 'success');
      // Refresh pending list
      getPendingQuestions().then(setPendingQuestions);
      // Reset form
      setShowAddForm(false);
      setAddText(''); setAddOptionA(''); setAddOptionB(''); setAddOptionC(''); setAddOptionD('');
      setAddAnswer(''); setAddExplanation(''); setAddDifficulty('medium'); setAddPoints(1);
    } catch (e) {
      console.error('Add question error:', e);
      toast('Failed to save question', 'error');
    } finally {
      setAddSaving(false);
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

  const filtered = questions.filter(q => {
    if (search && !q.text.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && q.type !== filterType) return false;
    if (filterStatus && q.approvalStatus !== filterStatus) return false;
    return true;
  });

  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>
      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(5,8,20,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => router.push('/teacher')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={14} /> Teacher
          </button>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>QUESTION BANK</span>
          <button
            onClick={() => setShowAddForm(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: showAddForm ? 'rgba(196,181,253,0.2)' : 'rgba(196,181,253,0.1)', color: '#c4b5fd', border: '1px solid rgba(196,181,253,0.3)' }}
          >
            <Plus size={13} strokeWidth={2.5} /> Add Question
          </button>
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

        {/* Add Question Form */}
        {showAddForm && (
          <div style={{ borderRadius: 18, padding: '20px 22px', background: 'rgba(196,181,253,0.06)', border: '1.5px solid rgba(196,181,253,0.25)', marginBottom: 24 }}>
            <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: '#c4b5fd', letterSpacing: '0.06em', marginBottom: 16 }}>ADD QUESTION</p>
            <div style={{ display: 'grid', gap: 12 }}>

              {/* Topic + Type row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>TOPIC *</label>
                  <TopicPicker value={addTopic} onChange={setAddTopic} inputStyle={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(196,181,253,0.25)', background: 'rgba(255,255,255,0.06)', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>TYPE *</label>
                  <select
                    value={addType}
                    onChange={e => { setAddType(e.target.value as Question['type']); setAddAnswer(''); }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(196,181,253,0.25)', background: 'rgba(255,255,255,0.06)', color: '#f5f3ee', fontSize: 13 }}
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="truefalse">True / False</option>
                    <option value="shortanswer">Short Answer</option>
                    <option value="fillinblank">Fill in the Blank</option>
                    <option value="matching">Matching</option>
                    <option value="ordering">Ordering</option>
                  </select>
                </div>
              </div>

              {/* Question text */}
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>QUESTION TEXT *</label>
                <textarea value={addText} onChange={e => setAddText(e.target.value)} rows={2} placeholder={addType === 'fillinblank' ? 'Use ___ for the blank, e.g. "A ___ connects a home network to the Internet."' : 'Enter the question…'} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(196,181,253,0.2)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13, resize: 'vertical', lineHeight: 1.5 }} />
              </div>

              {/* Options (MCQ / Matching / Ordering) */}
              {(addType === 'mcq' || addType === 'matching' || addType === 'ordering') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[['A', addOptionA, setAddOptionA], ['B', addOptionB, setAddOptionB], ['C', addOptionC, setAddOptionC], ['D', addOptionD, setAddOptionD]].map(([lbl, val, setter]) => (
                    <div key={String(lbl)}>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>
                        {addType === 'matching' ? `LEFT ${lbl}` : addType === 'ordering' ? `ITEM ${lbl}` : `OPTION ${lbl}`}
                      </label>
                      <input value={String(val)} onChange={e => (setter as (v: string) => void)(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13 }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Answer field */}
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>
                  {addType === 'mcq' ? 'CORRECT OPTION (0=A, 1=B, 2=C, 3=D) *' :
                   addType === 'truefalse' ? 'ANSWER (true / false) *' :
                   addType === 'matching' ? 'RIGHT-SIDE VALUES (pipe-separated, in matching order) *' :
                   addType === 'ordering' ? 'CORRECT ORDER (pipe-separated 0-based indices, e.g. 2|0|3|1) *' :
                   'CORRECT ANSWER *'}
                </label>
                <input value={addAnswer} onChange={e => setAddAnswer(e.target.value)} placeholder={addType === 'mcq' ? '0' : addType === 'truefalse' ? 'true' : addType === 'matching' ? 'Router|Switch|Hub|Modem' : addType === 'ordering' ? '2|0|3|1' : 'Expected answer'} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(196,181,253,0.2)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13 }} />
              </div>

              {/* Explanation + meta */}
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>EXPLANATION</label>
                <textarea value={addExplanation} onChange={e => setAddExplanation(e.target.value)} rows={2} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontSize: 13, resize: 'vertical', lineHeight: 1.5 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>DIFFICULTY</label>
                  <select value={addDifficulty} onChange={e => setAddDifficulty(e.target.value as Question['difficulty'])} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f5f3ee', fontSize: 13 }}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>POINTS</label>
                  <input type="number" min={1} max={10} value={addPoints} onChange={e => setAddPoints(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13 }} />
                </div>
              </div>

              {/* Save / Cancel */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={() => setShowAddForm(false)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 10, fontSize: 13, cursor: 'pointer', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <X size={13} /> Cancel
                </button>
                <button onClick={handleAddQuestion} disabled={addSaving} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: addSaving ? 'rgba(196,181,253,0.1)' : 'rgba(196,181,253,0.18)', color: '#c4b5fd', border: '1px solid rgba(196,181,253,0.35)' }}>
                  <Save size={13} /> {addSaving ? 'Saving…' : 'Add to Bank'}
                </button>
              </div>
            </div>
          </div>
        )}

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
              <div style={{ flex: '1 1 200px' }}>
                <TopicPicker
                  value={selectedTopic}
                  onChange={setSelectedTopic}
                  inputStyle={{
                    width: '100%', paddingLeft: 14, paddingRight: 14, paddingTop: 11, paddingBottom: 11,
                    borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)', fontSize: 14,
                  }}
                />
              </div>
              {selectedTopic && (
                <>
                  <div style={{ position: 'relative', flex: '1 1 180px' }}>
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
                  <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    style={{ flex: '0 0 auto', padding: '11px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: filterType ? '#c4b5fd' : 'rgba(255,255,255,0.45)', fontSize: 14, cursor: 'pointer' }}
                  >
                    <option value="">All types</option>
                    <option value="mcq">MCQ</option>
                    <option value="truefalse">True/False</option>
                    <option value="shortanswer">Short Answer</option>
                    <option value="fillinblank">Fill in Blank</option>
                    <option value="matching">Matching</option>
                    <option value="ordering">Ordering</option>
                  </select>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    style={{ flex: '0 0 auto', padding: '11px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: filterStatus ? '#c4b5fd' : 'rgba(255,255,255,0.45)', fontSize: 14, cursor: 'pointer' }}
                  >
                    <option value="">All statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </>
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
                          {/* Type selector */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>TYPE</label>
                              <select value={editType} onChange={e => { setEditType(e.target.value); setEditAnswer(''); }}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(196,181,253,0.25)', background: 'rgba(255,255,255,0.07)', color: '#f5f3ee', fontSize: 13 }}>
                                <option value="mcq">Multiple Choice (MCQ)</option>
                                <option value="truefalse">True / False</option>
                                <option value="shortanswer">Short Answer</option>
                                <option value="fillinblank">Fill in the Blank</option>
                                <option value="matching">Matching</option>
                                <option value="ordering">Ordering</option>
                              </select>
                            </div>
                          </div>
                          {/* Question text */}
                          <div>
                            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>QUESTION TEXT</label>
                            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3}
                              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14, lineHeight: 1.5, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(196,181,253,0.3)', color: '#fff', resize: 'vertical' }} />
                          </div>
                          {/* Options (MCQ, matching, ordering) */}
                          {(editType === 'mcq' || editType === 'matching' || editType === 'ordering') && (
                            <div>
                              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>
                                {editType === 'matching' ? 'LEFT-SIDE ITEMS' : editType === 'ordering' ? 'ITEMS (in any order)' : 'OPTIONS'}
                              </label>
                              <div style={{ display: 'grid', gap: 6 }}>
                                {editOptions.map((opt, oi) => (
                                  <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {editType === 'mcq' && (
                                      <button type="button"
                                        onClick={() => setEditAnswer(String(oi))}
                                        title="Mark as correct"
                                        style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', border: `2px solid ${editAnswer === String(oi) ? '#6ee7b7' : 'rgba(255,255,255,0.2)'}`, background: editAnswer === String(oi) ? 'rgba(16,185,129,0.25)' : 'transparent', cursor: 'pointer' }}>
                                        {editAnswer === String(oi) && <span style={{ display: 'block', width: 10, height: 10, borderRadius: '50%', background: '#6ee7b7', margin: '4px auto' }} />}
                                      </button>
                                    )}
                                    <input value={opt} onChange={e => { const o = [...editOptions]; o[oi] = e.target.value; setEditOptions(o); }}
                                      placeholder={`${editType === 'matching' ? 'Left' : 'Option'} ${String.fromCharCode(65 + oi)}`}
                                      style={{ flex: 1, padding: '8px 11px', borderRadius: 8, border: `1px solid ${editType === 'mcq' && editAnswer === String(oi) ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`, background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13 }} />
                                  </div>
                                ))}
                              </div>
                              {editType === 'mcq' && (
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>Click the circle next to the correct option</p>
                              )}
                            </div>
                          )}
                          {/* True/False answer */}
                          {editType === 'truefalse' && (
                            <div>
                              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 6 }}>CORRECT ANSWER</label>
                              <div style={{ display: 'flex', gap: 8 }}>
                                {[['0', 'True'], ['1', 'False']].map(([val, lbl]) => (
                                  <button key={val} type="button" onClick={() => setEditAnswer(val)}
                                    style={{ flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${editAnswer === val ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.12)'}`, background: editAnswer === val ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)', color: editAnswer === val ? '#6ee7b7' : 'rgba(255,255,255,0.5)' }}>
                                    {lbl}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Answer field for other types */}
                          {(editType === 'shortanswer' || editType === 'fillinblank' || editType === 'matching' || editType === 'ordering') && (
                            <div>
                              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>
                                {editType === 'matching' ? 'RIGHT-SIDE VALUES (pipe-separated)' : editType === 'ordering' ? 'CORRECT ORDER (pipe-separated 0-based, e.g. 2|0|3|1)' : 'CORRECT ANSWER'}
                              </label>
                              <input value={editAnswer} onChange={e => setEditAnswer(e.target.value)}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(196,181,253,0.2)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13 }} />
                            </div>
                          )}
                          {/* Explanation */}
                          <div>
                            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>EXPLANATION</label>
                            <textarea value={editExplanation} onChange={e => setEditExplanation(e.target.value)} rows={2}
                              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.5, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(196,181,253,0.3)', color: 'rgba(255,255,255,0.7)', resize: 'vertical' }} />
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
                            <TypeBadge type={q.type} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)' }}>
                              {q.difficulty} · {q.points} pt{q.points !== 1 ? 's' : ''}
                            </p>
                            <div style={{ display: 'flex', gap: 6 }}>
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
                              {confirmDeleteId === q.id ? (
                                <div style={{ display: 'flex', gap: 5 }}>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}
                                  >
                                    <X size={11} /> No
                                  </button>
                                  <button
                                    onClick={() => handleDelete(q.id!)}
                                    disabled={deleting}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.35)' }}
                                  >
                                    <Trash2 size={11} /> {deleting ? '…' : 'Yes, delete'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(q.id!)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.6)', border: '1px solid rgba(239,68,68,0.2)' }}
                                >
                                  <Trash2 size={11} /> Delete
                                </button>
                              )}
                            </div>
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
                      /* Inline edit form — same as browse tab */
                      <div style={{ display: 'grid', gap: 10 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>TYPE</label>
                            <select value={editType} onChange={e => { setEditType(e.target.value); setEditAnswer(''); }}
                              style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(196,181,253,0.25)', background: 'rgba(255,255,255,0.07)', color: '#f5f3ee', fontSize: 13 }}>
                              <option value="mcq">Multiple Choice (MCQ)</option>
                              <option value="truefalse">True / False</option>
                              <option value="shortanswer">Short Answer</option>
                              <option value="fillinblank">Fill in the Blank</option>
                              <option value="matching">Matching</option>
                              <option value="ordering">Ordering</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>QUESTION TEXT</label>
                          <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14, lineHeight: 1.5, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(196,181,253,0.3)', color: '#fff', resize: 'vertical' }} />
                        </div>
                        {(editType === 'mcq' || editType === 'matching' || editType === 'ordering') && (
                          <div>
                            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>OPTIONS</label>
                            <div style={{ display: 'grid', gap: 6 }}>
                              {editOptions.map((opt, oi) => (
                                <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {editType === 'mcq' && (
                                    <button type="button" onClick={() => setEditAnswer(String(oi))}
                                      style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', border: `2px solid ${editAnswer === String(oi) ? '#6ee7b7' : 'rgba(255,255,255,0.2)'}`, background: editAnswer === String(oi) ? 'rgba(16,185,129,0.25)' : 'transparent', cursor: 'pointer' }}>
                                      {editAnswer === String(oi) && <span style={{ display: 'block', width: 10, height: 10, borderRadius: '50%', background: '#6ee7b7', margin: '4px auto' }} />}
                                    </button>
                                  )}
                                  <input value={opt} onChange={e => { const o = [...editOptions]; o[oi] = e.target.value; setEditOptions(o); }}
                                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                    style={{ flex: 1, padding: '8px 11px', borderRadius: 8, border: `1px solid ${editType === 'mcq' && editAnswer === String(oi) ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`, background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13 }} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {editType === 'truefalse' && (
                          <div>
                            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 6 }}>CORRECT ANSWER</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {[['0', 'True'], ['1', 'False']].map(([val, lbl]) => (
                                <button key={val} type="button" onClick={() => setEditAnswer(val)}
                                  style={{ flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${editAnswer === val ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.12)'}`, background: editAnswer === val ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)', color: editAnswer === val ? '#6ee7b7' : 'rgba(255,255,255,0.5)' }}>
                                  {lbl}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {(editType === 'shortanswer' || editType === 'fillinblank' || editType === 'matching' || editType === 'ordering') && (
                          <div>
                            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>CORRECT ANSWER</label>
                            <input value={editAnswer} onChange={e => setEditAnswer(e.target.value)}
                              style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(196,181,253,0.2)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13 }} />
                          </div>
                        )}
                        <div>
                          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>EXPLANATION</label>
                          <textarea value={editExplanation} onChange={e => setEditExplanation(e.target.value)} rows={2}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.5, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(196,181,253,0.3)', color: 'rgba(255,255,255,0.7)', resize: 'vertical' }} />
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
                            {confirmDeleteId === q.id ? (
                              <div style={{ display: 'flex', gap: 5 }}>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 9, fontSize: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}
                                >
                                  <X size={11} /> No
                                </button>
                                <button
                                  onClick={() => handleDelete(q.id!)}
                                  disabled={deleting}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.35)' }}
                                >
                                  <Trash2 size={11} /> {deleting ? '…' : 'Yes, delete'}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(q.id!)}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, fontSize: 12, cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.6)', border: '1px solid rgba(239,68,68,0.2)' }}
                              >
                                <Trash2 size={11} /> Delete
                              </button>
                            )}
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
