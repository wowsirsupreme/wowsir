'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Plus, Trash2, Image as ImageIcon, Upload,
  FileText, Settings2, Type, Layout, Eye, Save, Send,
  GripVertical, Check, ChevronDown, AlignLeft, BookOpen,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFirebase } from '@/hooks/useFirebase';
import { useToast } from '@/components/ui/Toast';
import { getQuestionsByTopic } from '@/lib/firebase/questions';
import { TOPIC_LABELS, getGroupedTopics } from '@/types/question';
import type { Question as BankQuestion } from '@/types/question';

/* ─── types ────────────────────────────────────────────────────────── */
type QType = 'mcq' | 'short' | 'true_false' | 'essay';

interface PaperQuestion {
  id: string;
  type: QType;
  text: string;
  options: string[];      // for MCQ
  answer: string;         // correct answer (not shown on paper)
  marks: number;
  imageUrl?: string;      // optional question image
}

interface AssessmentDraft {
  id: string;
  // metadata
  schoolName: string;
  subject: string;
  title: string;
  className: string;
  date: string;
  duration: string;
  examiner: string;
  totalMarks: number;
  instructions: string;
  endMessage: string;
  assignedClass: string;
  // logo
  logoUrl: string;
  logoPosition: 'left' | 'center' | 'right';
  // questions
  questions: PaperQuestion[];
  // formatting
  headerFont: string;
  bodyFont: string;
  borderStyle: 'none' | 'single' | 'double' | 'thick';
  showPageNumbers: boolean;
  footerText: string;
  status: 'draft' | 'published';
}

/* ─── helpers ──────────────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 10); }

const FONTS = [
  { id: 'Times New Roman, serif',  label: 'Times New Roman' },
  { id: 'Arial, sans-serif',       label: 'Arial' },
  { id: 'Georgia, serif',          label: 'Georgia' },
  { id: 'Garamond, serif',         label: 'Garamond' },
  { id: 'Calibri, sans-serif',     label: 'Calibri' },
];

const BORDER_STYLES = [
  { id: 'none',   label: 'None' },
  { id: 'single', label: 'Single' },
  { id: 'double', label: 'Double' },
  { id: 'thick',  label: 'Thick' },
];

const DEFAULT_Q: Omit<PaperQuestion, 'id'> = {
  type: 'mcq', text: '', options: ['', '', '', ''], answer: '', marks: 1,
};

const BG = [
  'radial-gradient(ellipse 80% 50% at 30% 0%,   rgba(56,189,248,0.13) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 20%,  rgba(99,102,241,0.1)  0%, transparent 50%)',
  'radial-gradient(ellipse 80% 50% at 10% 90%,  rgba(201,168,76,0.09) 0%, transparent 50%)',
  '#050814',
].join(',');

const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: 9,
  background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)',
  color: '#f5f3ee', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.15s',
};

const CARD: React.CSSProperties = {
  borderRadius: 16, background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)', padding: '20px',
  marginBottom: 14,
};

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <Icon size={14} color="rgba(255,255,255,0.4)" strokeWidth={1.75} />
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const }}>{children}</span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', marginBottom: 5 }}>{children}</div>;
}

/* ─── A4 paper preview ─────────────────────────────────────────────── */
function PaperPreview({ draft }: { draft: AssessmentDraft }) {
  const borderMap: Record<string, string> = {
    none: 'none',
    single: '1.5px solid #222',
    double: '3px double #222',
    thick: '4px solid #111',
  };

  const totalMarks = draft.questions.reduce((s, q) => s + q.marks, 0);

  return (
    <div style={{
      width: '100%', maxWidth: 540,
      background: '#fff', color: '#111',
      fontFamily: draft.bodyFont || 'Times New Roman, serif',
      padding: '36px 40px',
      border: borderMap[draft.borderStyle] || 'none',
      boxShadow: '0 4px 32px rgba(0,0,0,0.35)',
      minHeight: 700,
      position: 'relative',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        {/* Logo left */}
        {draft.logoPosition === 'left' && draft.logoUrl && (
          <img src={draft.logoUrl} alt="logo" style={{ height: 64, objectFit: 'contain' }} />
        )}
        {/* Center content */}
        <div style={{ flex: 1, textAlign: draft.logoPosition === 'center' ? 'center' : 'left', paddingLeft: draft.logoPosition === 'left' && draft.logoUrl ? 16 : 0 }}>
          {draft.logoPosition === 'center' && draft.logoUrl && (
            <div style={{ marginBottom: 8 }}>
              <img src={draft.logoUrl} alt="logo" style={{ height: 56, objectFit: 'contain' }} />
            </div>
          )}
          {draft.schoolName && (
            <div style={{ fontFamily: draft.headerFont || 'Times New Roman, serif', fontSize: 15, fontWeight: 700 }}>
              {draft.schoolName}
            </div>
          )}
          {draft.title && (
            <div style={{ fontFamily: draft.headerFont || 'Times New Roman, serif', fontSize: 18, fontWeight: 700, marginTop: 4 }}>
              {draft.title}
            </div>
          )}
          {draft.subject && (
            <div style={{ fontSize: 13, marginTop: 2 }}>{draft.subject}</div>
          )}
        </div>
        {/* Logo right */}
        {draft.logoPosition === 'right' && draft.logoUrl && (
          <img src={draft.logoUrl} alt="logo" style={{ height: 64, objectFit: 'contain', marginLeft: 16 }} />
        )}
      </div>

      {/* Info row */}
      <div style={{ borderTop: '1.5px solid #ccc', borderBottom: '1.5px solid #ccc', padding: '7px 0', marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, fontSize: 11 }}>
        {draft.className && <span><b>Class:</b> {draft.className}</span>}
        {draft.date      && <span><b>Date:</b> {draft.date}</span>}
        {draft.duration  && <span><b>Duration:</b> {draft.duration}</span>}
        {draft.examiner  && <span><b>Examiner:</b> {draft.examiner}</span>}
        <span><b>Total Marks:</b> {totalMarks || draft.totalMarks || '___'}</span>
        <span><b>Score:</b> _______ / {totalMarks || draft.totalMarks || '___'}</span>
      </div>

      {/* Student name line */}
      <div style={{ marginBottom: 12, fontSize: 12 }}>
        <b>Name:</b> _______________________________________________ &nbsp;&nbsp; <b>Candidate No.:</b> __________
      </div>

      {/* Instructions */}
      {draft.instructions && (
        <div style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 4, padding: '8px 12px', marginBottom: 14, fontSize: 11, lineHeight: 1.6 }}>
          <b>Instructions:</b> {draft.instructions}
        </div>
      )}

      {/* Questions */}
      {draft.questions.length === 0 ? (
        <div style={{ color: '#aaa', fontSize: 12, textAlign: 'center', padding: '32px 0' }}>
          No questions added yet
        </div>
      ) : (
        <div style={{ fontSize: 12, lineHeight: 1.8 }}>
          {draft.questions.map((q, i) => (
            <div key={q.id} style={{ marginBottom: 16, pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <div style={{ flex: 1 }}>
                  <span>{q.text || <em style={{ color: '#bbb' }}>Question text…</em>}</span>
                  <span style={{ marginLeft: 8, fontSize: 10, color: '#888' }}>({q.marks} mark{q.marks !== 1 ? 's' : ''})</span>
                  {q.imageUrl && (
                    <div style={{ margin: '6px 0' }}>
                      <img src={q.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }} />
                    </div>
                  )}
                  {q.type === 'mcq' && (
                    <div style={{ marginTop: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
                      {q.options.filter(Boolean).map((opt, oi) => (
                        <div key={oi} style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
                          <span style={{ fontWeight: 600 }}>{String.fromCharCode(65 + oi)}.</span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === 'true_false' && (
                    <div style={{ marginTop: 4, display: 'flex', gap: 20 }}>
                      <span>○ True</span><span>○ False</span>
                    </div>
                  )}
                  {(q.type === 'short' || q.type === 'essay') && (
                    <div style={{ borderBottom: '1px solid #bbb', marginTop: 8, height: q.type === 'essay' ? 56 : 20 }} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* End message */}
      <div style={{ marginTop: 32, textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#444', borderTop: '1px solid #ccc', paddingTop: 12 }}>
        {draft.endMessage || '— END OF PAPER —'}
      </div>

      {/* Footer */}
      {(draft.footerText || draft.showPageNumbers) && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', borderTop: '1px solid #eee', paddingTop: 6 }}>
          <span>{draft.footerText}</span>
          {draft.showPageNumbers && <span>Page 1</span>}
        </div>
      )}
    </div>
  );
}

/* ─── question editor row ──────────────────────────────────────────── */
function QuestionRow({
  q, index, onChange, onRemove, onImageUpload,
}: {
  q: PaperQuestion; index: number;
  onChange: (q: PaperQuestion) => void;
  onRemove: () => void;
  onImageUpload: (id: string, file: File) => void;
}) {
  const [open, setOpen] = useState(true);
  const imgRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof PaperQuestion>(key: K, val: PaperQuestion[K]) {
    onChange({ ...q, [key]: val });
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
      {/* header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
        onClick={() => setOpen(o => !o)}>
        <GripVertical size={13} color="rgba(255,255,255,0.2)" />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', minWidth: 24 }}>Q{index + 1}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {q.text || <em>Untitled question</em>}
        </span>
        <span style={{ fontSize: 10, color: '#c9a84c', marginRight: 6 }}>{q.marks}mk</span>
        <ChevronDown size={12} color="rgba(255,255,255,0.3)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'rgba(255,80,80,0.5)', display: 'flex', alignItems: 'center' }}>
          <Trash2 size={12} />
        </button>
      </div>

      {open && (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* type + marks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <div>
              <FieldLabel>QUESTION TYPE</FieldLabel>
              <select value={q.type} onChange={e => set('type', e.target.value as QType)}
                style={{ ...INPUT, cursor: 'pointer' }}>
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="true_false">True / False</option>
                <option value="short">Short Answer</option>
                <option value="essay">Essay / Long Answer</option>
              </select>
            </div>
            <div style={{ width: 80 }}>
              <FieldLabel>MARKS</FieldLabel>
              <input type="number" min={1} max={100} value={q.marks} onChange={e => set('marks', parseInt(e.target.value) || 1)}
                style={{ ...INPUT, textAlign: 'center' }} />
            </div>
          </div>

          {/* question text */}
          <div>
            <FieldLabel>QUESTION TEXT</FieldLabel>
            <textarea value={q.text} onChange={e => set('text', e.target.value)}
              placeholder="Type your question here…"
              rows={2}
              style={{ ...INPUT, resize: 'vertical', lineHeight: 1.5 }} />
          </div>

          {/* image */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => imgRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer' }}>
              <ImageIcon size={11} /> Add image
            </button>
            {q.imageUrl && (
              <>
                <img src={q.imageUrl} alt="" style={{ height: 36, borderRadius: 4, objectFit: 'contain' }} />
                <button onClick={() => set('imageUrl', undefined)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,80,80,0.6)', fontSize: 11 }}>remove</button>
              </>
            )}
            <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) onImageUpload(q.id, f); }} />
          </div>

          {/* MCQ options */}
          {q.type === 'mcq' && (
            <div>
              <FieldLabel>OPTIONS (tick correct answer)</FieldLabel>
              {q.options.map((opt, oi) => (
                <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <button onClick={() => set('answer', opt)}
                    style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 4, background: q.answer === opt && opt ? '#10b981' : 'rgba(255,255,255,0.06)', border: `1.5px solid ${q.answer === opt && opt ? '#10b981' : 'rgba(255,255,255,0.15)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {q.answer === opt && opt && <Check size={10} color="#fff" strokeWidth={2.5} />}
                  </button>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 14 }}>{String.fromCharCode(65 + oi)}.</span>
                  <input value={opt} onChange={e => { const opts = [...q.options]; opts[oi] = e.target.value; set('options', opts); }}
                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                    style={{ ...INPUT, flex: 1 }} />
                </div>
              ))}
              <button onClick={() => set('options', [...q.options, ''])}
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', paddingLeft: 30 }}>
                + add option
              </button>
            </div>
          )}

          {q.type === 'true_false' && (
            <div>
              <FieldLabel>CORRECT ANSWER</FieldLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                {['True', 'False'].map(v => (
                  <button key={v} onClick={() => set('answer', v)}
                    style={{ padding: '7px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: q.answer === v ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${q.answer === v ? '#10b981' : 'rgba(255,255,255,0.1)'}`, color: q.answer === v ? '#34d399' : 'rgba(255,255,255,0.45)' }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── bank import modal ────────────────────────────────────────────── */
function BankImportModal({ onClose, onImport }: {
  onClose: () => void;
  onImport: (qs: PaperQuestion[]) => void;
}) {
  const [topicKey, setTopicKey] = useState('');
  const [bankQs, setBankQs] = useState<BankQuestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);

  useEffect(() => {
    if (!topicKey) return;
    setLoading(true);
    getQuestionsByTopic(topicKey).then(qs => { setBankQs(qs); setLoading(false); });
  }, [topicKey]);

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function doImport() {
    const chosen = bankQs.filter(q => selected.has(q.id));
    const converted: PaperQuestion[] = chosen.map(q => ({
      id: uid(),
      type: q.type === 'truefalse' ? 'true_false' : q.type === 'mcq' ? 'mcq' : 'short',
      text: q.text,
      options: Array.isArray(q.options) ? q.options : [],
      answer: q.answer || '',
      marks: 1,
    }));
    onImport(converted);
    onClose();
  }

  const GROUPED = getGroupedTopics();
  const selectedLabel = topicKey ? TOPIC_LABELS[topicKey] : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0f0f1e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>Import from Question Bank</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
          <button type="button" onClick={() => setTopicOpen(o => !o)}
            style={{ ...INPUT, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ color: selectedLabel ? '#f5f3ee' : 'rgba(255,255,255,0.3)' }}>
              {selectedLabel ? `${selectedLabel.emoji} ${selectedLabel.title}` : '— Pick a class & topic —'}
            </span>
            <ChevronDown size={13} color="rgba(255,255,255,0.3)" style={{ transform: topicOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {topicOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% - 4px)', left: 22, right: 22, zIndex: 10, maxHeight: 260, overflowY: 'auto', background: 'rgba(12,11,28,0.98)', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(201,168,76,0.18)', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
              {GROUPED.map(({ subject, topics }) => (
                <div key={subject}>
                  <div style={{ padding: '8px 14px 3px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 2 }}>
                    {subject}
                  </div>
                  {topics.map(t => (
                    <button key={t.key} type="button" onClick={() => { setTopicKey(t.key); setTopicOpen(false); setSelected(new Set()); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px 8px 22px', background: topicKey === t.key ? 'rgba(201,168,76,0.12)' : 'none', border: 'none', cursor: 'pointer', color: topicKey === t.key ? '#c9a84c' : 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                      <span>{t.emoji}</span><span>{t.title}</span>
                      {topicKey === t.key && <Check size={11} color="#c9a84c" style={{ marginLeft: 'auto' }} />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 22px' }}>
          {loading && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Loading…</p>}
          {!loading && bankQs.length === 0 && topicKey && (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No approved questions for this topic.</p>
          )}
          {!loading && bankQs.map(q => {
            const checked = selected.has(q.id);
            return (
              <label key={q.id} onClick={() => toggle(q.id)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 6, background: checked ? 'rgba(201,168,76,0.07)' : 'rgba(255,255,255,0.02)', border: `1.5px solid ${checked ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.05)'}` }}>
                <div style={{ flexShrink: 0, marginTop: 1, width: 16, height: 16, borderRadius: 4, background: checked ? '#c9a84c' : 'rgba(255,255,255,0.06)', border: `1.5px solid ${checked ? '#c9a84c' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {checked && <Check size={9} color="#1a1200" strokeWidth={2.5} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, color: checked ? '#f5f3ee' : 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{q.text}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{q.type} · {q.difficulty || 'medium'}</p>
                </div>
              </label>
            );
          })}
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={doImport} disabled={selected.size === 0}
            style={{ flex: 1, padding: '10px', borderRadius: 10, background: selected.size > 0 ? 'linear-gradient(135deg,#b8942a,#d4aa45)' : 'rgba(255,255,255,0.06)', border: 'none', color: selected.size > 0 ? '#1a1200' : 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 700, cursor: selected.size > 0 ? 'pointer' : 'default' }}>
            Import {selected.size > 0 ? `${selected.size} question${selected.size > 1 ? 's' : ''}` : 'questions'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── auto-scaling preview wrapper ────────────────────────────────── */
function ScaledPreview({ draft }: { draft: AssessmentDraft }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const PAPER_W = 540;

  const rescale = useCallback(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;
    const avail = wrap.clientWidth - 4;
    const scale = Math.min(1, avail / PAPER_W);
    inner.style.transform = `scale(${scale})`;
    // collapse the whitespace created by scale-down
    inner.style.marginBottom = `${-(PAPER_W * (1 - scale) * 0.6)}px`;
  }, []);

  useEffect(() => {
    rescale();
    const ro = new ResizeObserver(rescale);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [rescale]);

  // re-apply margin whenever draft changes (paper height may change)
  useEffect(() => { rescale(); }, [draft, rescale]);

  return (
    <div ref={wrapRef} style={{ width: '100%', overflow: 'hidden' }}>
      <div ref={innerRef} style={{ width: PAPER_W, transformOrigin: 'top left', transition: 'transform 0.1s' }}>
        <PaperPreview draft={draft} />
      </div>
    </div>
  );
}

/* ─── main page ────────────────────────────────────────────────────── */
export default function AssessmentBuilderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, ready, loading } = useAuth();
  useFirebase();

  const [draft, setDraft] = useState<AssessmentDraft>({
    id: uid(),
    schoolName: '', subject: '', title: '', className: '',
    date: new Date().toISOString().slice(0, 10),
    duration: '1 hour', examiner: '', totalMarks: 0,
    instructions: 'Answer ALL questions. Write clearly and show all working where applicable.',
    endMessage: '— END OF PAPER —',
    assignedClass: '',
    logoUrl: '', logoPosition: 'left',
    questions: [],
    headerFont: 'Times New Roman, serif',
    bodyFont: 'Times New Roman, serif',
    borderStyle: 'single',
    showPageNumbers: true,
    footerText: '',
    status: 'draft',
  });

  const [activeTab, setActiveTab] = useState<'details' | 'questions' | 'format'>('details');
  const [showBankModal, setShowBankModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof AssessmentDraft>(key: K, val: AssessmentDraft[K]) {
    setDraft(d => ({ ...d, [key]: val }));
  }

  function addQuestion() {
    setDraft(d => ({ ...d, questions: [...d.questions, { ...DEFAULT_Q, id: uid(), options: ['', '', '', ''] }] }));
    setActiveTab('questions');
  }

  function updateQuestion(q: PaperQuestion) {
    setDraft(d => ({ ...d, questions: d.questions.map(x => x.id === q.id ? q : x) }));
  }

  function removeQuestion(id: string) {
    setDraft(d => ({ ...d, questions: d.questions.filter(q => q.id !== id) }));
  }

  function handleImageUpload(qId: string, file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target?.result as string;
      setDraft(d => ({ ...d, questions: d.questions.map(q => q.id === qId ? { ...q, imageUrl: url } : q) }));
    };
    reader.readAsDataURL(file);
  }

  function handleLogoUpload(file: File) {
    const reader = new FileReader();
    reader.onload = e => set('logoUrl', e.target?.result as string);
    reader.readAsDataURL(file);
  }

  const handleSave = useCallback(async (status: 'draft' | 'published') => {
    if (!draft.title.trim()) { toast('Enter an assessment title', 'error'); return; }
    setSaving(true);
    try {
      // Save to localStorage as draft (Firestore integration can be added later)
      const key = `assessment_${draft.id}`;
      const toSave = { ...draft, status, updatedAt: Date.now() };
      localStorage.setItem(key, JSON.stringify(toSave));
      // Keep index
      const idx: string[] = JSON.parse(localStorage.getItem('assessments_index') || '[]');
      if (!idx.includes(draft.id)) { idx.unshift(draft.id); localStorage.setItem('assessments_index', JSON.stringify(idx)); }
      toast(status === 'published' ? 'Assessment published!' : 'Draft saved', 'success');
      if (status === 'published') router.push('/teacher');
    } catch {
      toast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }, [draft, toast, router]);

  function handlePrint() {
    window.print();
  }

  const totalMarks = draft.questions.reduce((s, q) => s + q.marks, 0);

  if (!ready || loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</div>
    </div>;
  }
  if (!user) { router.replace('/teacher'); return null; }

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', border: 'none',
    background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
    color: active ? '#c9a84c' : 'rgba(255,255,255,0.4)',
    transition: 'all 0.15s',
  });

  return (
    <>
      {/* print styles */}
      <style>{`
        @media print {
          body > *:not(#print-area) { display: none !important; }
          #print-area { display: block !important; }
          @page { margin: 15mm; }
        }
        #print-area { display: none; }
      `}</style>

      {/* hidden print area */}
      <div id="print-area">
        <PaperPreview draft={draft} />
      </div>

      <div style={{ minHeight: '100vh', background: BG, color: '#f5f3ee' }}>

        {/* ── nav ── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: 'rgba(5,8,20,0.85)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => router.push('/teacher')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            <ChevronLeft size={14} /> Teacher
          </button>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Assessment Builder</span>
          {totalMarks > 0 && (
            <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 999, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)', color: '#c9a84c' }}>
              {draft.questions.length} Q · {totalMarks} marks
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={() => handleSave('draft')} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', fontSize: 12, cursor: 'pointer' }}>
              <Save size={12} /> Save draft
            </button>
            <button onClick={() => handleSave('published')} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#b8942a,#d4aa45)', border: 'none', color: '#1a1200', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 12px rgba(201,168,76,0.3)' }}>
              <Send size={12} /> {saving ? 'Saving…' : 'Publish'}
            </button>
          </div>
        </nav>

        <div style={{ display: 'flex', gap: 0, width: '100%' }}>

          {/* ── editor panel ── */}
          <div style={{ flex: '0 0 440px', minWidth: 0, padding: '24px 20px 80px', overflowY: 'auto', maxHeight: 'calc(100vh - 56px)' }}>

            {/* tab bar */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, width: 'fit-content' }}>
              <button style={TAB_STYLE(activeTab === 'details')} onClick={() => setActiveTab('details')}>
                <FileText size={11} style={{ marginRight: 5, display: 'inline' }} />Details
              </button>
              <button style={TAB_STYLE(activeTab === 'questions')} onClick={() => setActiveTab('questions')}>
                <AlignLeft size={11} style={{ marginRight: 5, display: 'inline' }} />Questions {draft.questions.length > 0 && `(${draft.questions.length})`}
              </button>
              <button style={TAB_STYLE(activeTab === 'format')} onClick={() => setActiveTab('format')}>
                <Layout size={11} style={{ marginRight: 5, display: 'inline' }} />Format
              </button>
            </div>

            {/* ── DETAILS tab ── */}
            {activeTab === 'details' && (
              <>
                <div style={CARD}>
                  <SectionTitle icon={FileText}>Paper Information</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <FieldLabel>SCHOOL NAME</FieldLabel>
                      <input style={INPUT} value={draft.schoolName} onChange={e => set('schoolName', e.target.value)} placeholder="DPS International Ghana" />
                    </div>
                    <div>
                      <FieldLabel>SUBJECT</FieldLabel>
                      <input style={INPUT} value={draft.subject} onChange={e => set('subject', e.target.value)} placeholder="Computer Science" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <FieldLabel>ASSESSMENT TITLE *</FieldLabel>
                    <input style={INPUT} value={draft.title} onChange={e => set('title', e.target.value)} placeholder="e.g. End of Term Examination" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <FieldLabel>CLASS / YEAR GROUP</FieldLabel>
                      <input style={INPUT} value={draft.className} onChange={e => set('className', e.target.value)} placeholder="Year 10A" />
                    </div>
                    <div>
                      <FieldLabel>DATE</FieldLabel>
                      <input type="date" style={INPUT} value={draft.date} onChange={e => set('date', e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <FieldLabel>DURATION</FieldLabel>
                      <input style={INPUT} value={draft.duration} onChange={e => set('duration', e.target.value)} placeholder="1 hour 30 minutes" />
                    </div>
                    <div>
                      <FieldLabel>EXAMINER / TEACHER</FieldLabel>
                      <input style={INPUT} value={draft.examiner} onChange={e => set('examiner', e.target.value)} placeholder="Mr. Wilfred" />
                    </div>
                  </div>
                </div>

                <div style={CARD}>
                  <SectionTitle icon={ImageIcon}>School Logo</SectionTitle>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <FieldLabel>LOGO POSITION</FieldLabel>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['left', 'center', 'right'] as const).map(p => (
                          <button key={p} onClick={() => set('logoPosition', p)}
                            style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: draft.logoPosition === p ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${draft.logoPosition === p ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`, color: draft.logoPosition === p ? '#c9a84c' : 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      {draft.logoUrl ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <img src={draft.logoUrl} alt="logo" style={{ height: 52, objectFit: 'contain', borderRadius: 6 }} />
                          <button onClick={() => set('logoUrl', '')}
                            style={{ fontSize: 10, color: 'rgba(255,80,80,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>remove</button>
                        </div>
                      ) : (
                        <button onClick={() => logoRef.current?.click()}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1.5px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.35)', fontSize: 11, cursor: 'pointer' }}>
                          <Upload size={18} strokeWidth={1.5} />
                          Upload logo
                        </button>
                      )}
                      <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
                    </div>
                  </div>
                </div>

                <div style={CARD}>
                  <SectionTitle icon={AlignLeft}>Instructions & Messages</SectionTitle>
                  <div style={{ marginBottom: 12 }}>
                    <FieldLabel>PAPER INSTRUCTIONS</FieldLabel>
                    <textarea value={draft.instructions} onChange={e => set('instructions', e.target.value)}
                      rows={3} style={{ ...INPUT, resize: 'vertical', lineHeight: 1.6 }} />
                  </div>
                  <div>
                    <FieldLabel>END OF PAPER MESSAGE</FieldLabel>
                    <input style={INPUT} value={draft.endMessage} onChange={e => set('endMessage', e.target.value)} placeholder="— END OF PAPER —" />
                  </div>
                </div>

                <div style={CARD}>
                  <SectionTitle icon={Send}>Assign to Class</SectionTitle>
                  <FieldLabel>CLASS CODE / NAME (students use this to access digitally)</FieldLabel>
                  <input style={INPUT} value={draft.assignedClass} onChange={e => set('assignedClass', e.target.value)} placeholder="e.g. CS-10A-2025 or Year 10 CS" />
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6, lineHeight: 1.6 }}>
                    Students can find and take this assessment by entering the class code on the student portal.
                  </p>
                </div>
              </>
            )}

            {/* ── QUESTIONS tab ── */}
            {activeTab === 'questions' && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button onClick={addQuestion}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1.5px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <Plus size={14} /> Add question manually
                  </button>
                  <button onClick={() => setShowBankModal(true)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: 10, background: 'rgba(201,168,76,0.08)', border: '1.5px dashed rgba(201,168,76,0.3)', color: '#c9a84c', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <BookOpen size={14} /> Import from bank
                  </button>
                </div>

                {draft.questions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: 'rgba(255,255,255,0.25)', fontSize: 13, border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 14 }}>
                    No questions yet. Add manually or import from the question bank.
                  </div>
                ) : (
                  draft.questions.map((q, i) => (
                    <QuestionRow key={q.id} q={q} index={i}
                      onChange={updateQuestion}
                      onRemove={() => removeQuestion(q.id)}
                      onImageUpload={handleImageUpload} />
                  ))
                )}

                {draft.questions.length > 0 && (
                  <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{draft.questions.length} question{draft.questions.length !== 1 ? 's' : ''}</span>
                    <span style={{ color: '#c9a84c', fontWeight: 700 }}>{totalMarks} total marks</span>
                  </div>
                )}
              </>
            )}

            {/* ── FORMAT tab ── */}
            {activeTab === 'format' && (
              <>
                <div style={CARD}>
                  <SectionTitle icon={Type}>Typography</SectionTitle>
                  <div style={{ marginBottom: 14 }}>
                    <FieldLabel>HEADER FONT</FieldLabel>
                    <select value={draft.headerFont} onChange={e => set('headerFont', e.target.value)}
                      style={{ ...INPUT, cursor: 'pointer' }}>
                      {FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                    <div style={{ marginTop: 6, fontSize: 18, fontFamily: draft.headerFont, color: 'rgba(255,255,255,0.4)', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 7 }}>
                      Assessment Title Preview
                    </div>
                  </div>
                  <div>
                    <FieldLabel>BODY / CONTENT FONT</FieldLabel>
                    <select value={draft.bodyFont} onChange={e => set('bodyFont', e.target.value)}
                      style={{ ...INPUT, cursor: 'pointer' }}>
                      {FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                    <div style={{ marginTop: 6, fontSize: 13, fontFamily: draft.bodyFont, color: 'rgba(255,255,255,0.4)', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 7 }}>
                      1. Question text and answer options will appear in this font.
                    </div>
                  </div>
                </div>

                <div style={CARD}>
                  <SectionTitle icon={Layout}>Page Border</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {BORDER_STYLES.map(b => (
                      <button key={b.id} onClick={() => set('borderStyle', b.id as AssessmentDraft['borderStyle'])}
                        style={{ padding: '12px', borderRadius: 10, cursor: 'pointer', background: draft.borderStyle === b.id ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${draft.borderStyle === b.id ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`, color: draft.borderStyle === b.id ? '#c9a84c' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={CARD}>
                  <SectionTitle icon={FileText}>Footer & Page Numbers</SectionTitle>
                  <div style={{ marginBottom: 12 }}>
                    <FieldLabel>FOOTER TEXT (left side)</FieldLabel>
                    <input style={INPUT} value={draft.footerText} onChange={e => set('footerText', e.target.value)} placeholder="e.g. DPS International · Confidential" />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <button type="button" role="switch" aria-checked={draft.showPageNumbers}
                      onClick={() => set('showPageNumbers', !draft.showPageNumbers)}
                      style={{ flexShrink: 0, width: 36, height: 20, borderRadius: 999, position: 'relative', border: 'none', cursor: 'pointer', background: draft.showPageNumbers ? '#059669' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }}>
                      <span style={{ position: 'absolute', top: 2, left: draft.showPageNumbers ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </button>
                    <span style={{ fontSize: 13, color: draft.showPageNumbers ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)' }}>Show page numbers</span>
                  </label>
                </div>

                <div style={{ ...CARD, marginBottom: 0 }}>
                  <button onClick={handlePrint}
                    style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    🖨 Print / Save as PDF
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── live preview panel — always visible ── */}
          <div style={{ flex: 1, minWidth: 0, position: 'sticky', top: 56, height: 'calc(100vh - 56px)', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', borderLeft: '1px solid rgba(255,255,255,0.07)', padding: '18px 20px 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Eye size={11} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em', fontWeight: 600 }}>LIVE PREVIEW</span>
              </div>
              <button onClick={handlePrint}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}>
                🖨 Print / PDF
              </button>
            </div>
            <ScaledPreview draft={draft} />
          </div>
        </div>
      </div>

      {showBankModal && (
        <BankImportModal
          onClose={() => setShowBankModal(false)}
          onImport={qs => setDraft(d => ({ ...d, questions: [...d.questions, ...qs] }))}
        />
      )}
    </>
  );
}
