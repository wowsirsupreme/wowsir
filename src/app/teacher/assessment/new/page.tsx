'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Plus, Trash2, Image as ImageIcon, Upload,
  FileText, Settings2, Type, Layout, Eye, Save, Send,
  GripVertical, Check, ChevronDown, AlignLeft, BookOpen,
  Table2, Pencil, Layers, Code, Square,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFirebase } from '@/hooks/useFirebase';
import { useToast } from '@/components/ui/Toast';
import { getQuestionsByTopic } from '@/lib/firebase/questions';
import { TOPIC_LABELS } from '@/types/question';
import type { Question as BankQuestion } from '@/types/question';
import TopicPicker from '@/components/TopicPicker';

/* ─── types ────────────────────────────────────────────────────────── */
type QType = 'mcq' | 'short' | 'true_false' | 'essay' | 'fill_blank' | 'table' | 'label' | 'code_block' | 'draw_box';

interface SubPart {
  id: string;
  label: string;
  text: string;
  marks: number;
  answerLines: number;
}

interface RubricItem {
  id: string;
  text: string;
  marks: number;
}

interface PaperQuestion {
  id: string;
  type: QType;
  text: string;
  options: string[];
  answer: string;
  marks: number;
  imageUrl?: string;
  imageCaption: string;
  imagePosition: 'above' | 'right';
  answerLines: number;
  subParts: SubPart[];
  tableHeaders: string[];
  tableRows: string[][];
  tableCols: number;
  tableRowCount: number;
  // code_block
  codeText: string;
  codeLanguage: string;
  // draw_box
  boxHeight: number;
  // rubric
  rubric: RubricItem[];
}

interface PaperPart {
  id: string;
  title: string;
  instruction: string;
  style: 'normal' | 'italic-underline';
  questions: PaperQuestion[];
}

interface PaperSection {
  id: string;
  title: string;
  marks: number;
  instruction: string;
  wordBank: string[];
  questions: PaperQuestion[];
  parts: PaperPart[];
}

interface AssessmentDraft {
  id: string;
  schoolName: string;
  subject: string;
  term: string;
  assessmentType: string;
  title: string;
  className: string;
  grade: string;
  date: string;
  duration: string;
  examiner: string;
  totalMarks: number;
  instructions: string;
  endMessage: string;
  assignedClass: string;
  logoUrl: string;
  logoPosition: 'left' | 'center' | 'right';
  sections: PaperSection[];
  headerFont: string;
  bodyFont: string;
  headerFontSize: number;   // pt, for section/title headings
  bodyFontSize: number;     // pt, for question body text
  borderStyle: 'none' | 'single' | 'double' | 'thick';
  showPageNumbers: boolean;
  footerText: string;
  status: 'draft' | 'published';
  // cover page
  showCoverPage: boolean;
  examType: string;
  practicalMarks: number;
  theoryMarks: number;
  rollNumber: string;
  invigilatorField: boolean;
  coverInstructions: string;
}

/* ─── helpers ──────────────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 10); }

function newQuestion(): PaperQuestion {
  return {
    id: uid(), type: 'short', text: '', options: ['', '', '', ''],
    answer: '', marks: 1, answerLines: 2, subParts: [],
    tableHeaders: ['Column 1', 'Column 2'], tableRows: [['', ''], ['', '']],
    tableCols: 2, tableRowCount: 2,
    imageCaption: '', imagePosition: 'above',
    codeText: '', codeLanguage: 'Python',
    boxHeight: 60,
    rubric: [],
  };
}

function newPart(): PaperPart {
  return { id: uid(), title: 'Part 1', instruction: '', style: 'normal', questions: [] };
}

function newSection(label: string): PaperSection {
  return { id: uid(), title: label, marks: 0, instruction: 'Answer all questions.', wordBank: [], questions: [], parts: [] };
}

const FONTS = [
  { id: 'Times New Roman, serif', label: 'Times New Roman' },
  { id: 'Arial, sans-serif',      label: 'Arial' },
  { id: 'Georgia, serif',         label: 'Georgia' },
  { id: 'Garamond, serif',        label: 'Garamond' },
  { id: 'Calibri, sans-serif',    label: 'Calibri' },
];

const BORDER_STYLES = [
  { id: 'none',   label: 'None' },
  { id: 'single', label: 'Single' },
  { id: 'double', label: 'Double' },
  { id: 'thick',  label: 'Thick' },
];

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const ASSESSMENT_TYPES = ['CA1', 'CA2', 'CA3', 'Mid-Term Exam', 'End of Term Exam', 'Mock Exam', 'Test', 'Quiz', 'Assignment'];
const EXAM_TYPES = ['Theory Exam', 'Practical Exam', 'CA', 'Mid-Term Exam', 'End of Term Exam', 'Mock Exam'];

const DEFAULT_COVER_INSTRUCTIONS: Record<string, string> = {
  'Theory Exam': [
    'Write your name, class, and roll number clearly on the cover page.',
    'Answer ALL questions unless otherwise instructed.',
    'Write neatly and legibly. Marks may be deducted for illegible answers.',
    'Do not write outside the answer lines or in the margins.',
    'Electronic devices are NOT permitted during this examination.',
    'Hand in your paper when instructed by the invigilator.',
  ].join('\n'),
  'Practical Exam': [
    'Log in using your assigned school username and password.',
    'Read each task carefully before you begin.',
    'Save your work regularly using the filename given in each task.',
    'Do not browse the internet or open files unrelated to this examination.',
    'Raise your hand silently if you need assistance from the invigilator.',
    'When finished, ensure all files are saved in the correct location before calling the invigilator.',
  ].join('\n'),
  'CA': [
    'Write your name, class, and section clearly at the top of your paper.',
    'Answer ALL questions.',
    'Show all working where applicable.',
    'Write neatly. Marks may be deducted for untidy work.',
    'Do not copy from a neighbour. Any act of cheating will result in cancellation.',
  ].join('\n'),
  'Mid-Term Exam': [
    'Write your name, class, and roll number clearly on the cover page.',
    'Answer ALL questions unless otherwise instructed.',
    'Write neatly and legibly.',
    'Electronic devices are NOT permitted during this examination.',
    'Do not talk or communicate with other candidates during the examination.',
  ].join('\n'),
  'End of Term Exam': [
    'Write your name, class, roll number, and section clearly on the cover page.',
    'Answer ALL questions unless otherwise instructed.',
    'Write neatly and legibly. Marks may be deducted for illegible answers.',
    'Electronic devices including calculators are NOT permitted unless stated.',
    'Do not write outside the answer lines or in the margins.',
    'Hand in your paper quietly when the invigilator announces time is up.',
  ].join('\n'),
  'Mock Exam': [
    'This is a practice examination. Treat it with the same seriousness as the real exam.',
    'Write your name, class, and roll number clearly on the cover page.',
    'Answer ALL questions unless otherwise instructed.',
    'Electronic devices are NOT permitted during this examination.',
    'Write neatly and legibly.',
  ].join('\n'),
  default: [
    'Write your name, class, and roll number clearly.',
    'Answer all questions unless otherwise instructed.',
    'Write clearly and legibly.',
    'Do not write in the margins.',
  ].join('\n'),
};

const BG = [
  'radial-gradient(ellipse 80% 50% at 30% 0%,   rgba(56,189,248,0.13) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 20%,  rgba(99,102,241,0.1)  0%, transparent 50%)',
  'radial-gradient(ellipse 80% 50% at 10% 90%,  rgba(201,168,76,0.09) 0%, transparent 50%)',
  '#050814',
].join(',');

const INPUT: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 9,
  background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)',
  color: '#f5f3ee', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.15s',
};
const CARD: React.CSSProperties = {
  borderRadius: 16, background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)', padding: '18px',
  marginBottom: 12,
};

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <Icon size={13} color="rgba(255,255,255,0.4)" strokeWidth={1.75} />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const }}>{children}</span>
    </div>
  );
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', marginBottom: 5 }}>{children}</div>;
}

/* ─── dotted answer lines ───────────────────────────────────────────── */
function DottedLines({ count }: { count: number }) {
  return (
    <div style={{ marginTop: 6 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ borderBottom: '1px dotted #bbb', marginBottom: 14, height: 1 }} />
      ))}
    </div>
  );
}

/* ─── fill-blank renderer ───────────────────────────────────────────── */
function FillBlankText({ text }: { text: string }) {
  const parts = text.split('___');
  return (
    <span>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <span style={{ display: 'inline-block', borderBottom: '1px solid #444', minWidth: 60, margin: '0 2px' }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          )}
        </span>
      ))}
    </span>
  );
}

/* ─── rubric preview ─────────────────────────────────────────────────── */
function RubricPreview({ items }: { items: RubricItem[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 8, border: '1px solid #ccc', borderRadius: 4, overflow: 'hidden', fontSize: 11 }}>
      {items.map((item, i) => (
        <div key={item.id} style={{ display: 'flex', borderTop: i > 0 ? '1px solid #eee' : 'none' }}>
          <div style={{ flex: 1, padding: '4px 8px' }}>✓ {item.text}</div>
          <div style={{ padding: '4px 8px', borderLeft: '1px solid #eee', minWidth: 40, textAlign: 'right', fontWeight: 600 }}>{item.marks}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── single question preview ────────────────────────────────────────── */
function QuestionPreview({ q, qNum, bodyFont, headerFont, bodyFontSize }: { q: PaperQuestion; qNum: number; bodyFont: string; headerFont: string; bodyFontSize: number }) {
  const qMarks = q.marks + q.subParts.reduce((a, sp) => a + sp.marks, 0);
  const hasRightImage = q.imageUrl && q.imagePosition === 'right';

  const questionContent = (
    <>
      {q.type === 'fill_blank' ? (
        <span><FillBlankText text={q.text || 'Question text…'} /><span style={{ marginLeft: 6, fontSize: 10, color: '#888' }}>[{qMarks}]</span></span>
      ) : (
        <span>
          {q.text || <em style={{ color: '#bbb' }}>Question text…</em>}
          <span style={{ marginLeft: 6, fontSize: 10, color: '#888' }}>[{qMarks}]</span>
        </span>
      )}

      {/* image above */}
      {q.imageUrl && q.imagePosition === 'above' && (
        <div style={{ margin: '8px 0', textAlign: 'center' }}>
          <img src={q.imageUrl} alt="" style={{ maxWidth: '80%', maxHeight: 150, objectFit: 'contain', border: '1px solid #ddd' }} />
          {q.imageCaption && <div style={{ fontSize: 10, color: '#888', marginTop: 3, fontStyle: 'italic' }}>{q.imageCaption}</div>}
        </div>
      )}

      {/* code_block */}
      {q.type === 'code_block' && q.codeText && (
        <div style={{ margin: '8px 0', position: 'relative' }}>
          <div style={{ fontSize: 9, color: '#666', fontFamily: 'monospace', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{q.codeLanguage}</div>
          <pre style={{ background: '#f5f5f5', border: '1px solid #ccc', borderRadius: 4, padding: '8px 10px', fontFamily: 'Courier New, monospace', fontSize: 11, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>{q.codeText}</pre>
        </div>
      )}

      {/* draw_box */}
      {q.type === 'draw_box' && (
        <div style={{ margin: '8px 0', border: '1.5px solid #555', borderRadius: 2, height: q.boxHeight, width: '100%', background: '#fafafa' }} />
      )}

      {/* MCQ options */}
      {q.type === 'mcq' && (
        <div style={{ marginTop: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 20px' }}>
          {q.options.filter(Boolean).map((opt, oi) => (
            <div key={oi} style={{ display: 'flex', gap: 4 }}>
              <span style={{ fontWeight: 600 }}>{String.fromCharCode(65 + oi)}.</span><span>{opt}</span>
            </div>
          ))}
        </div>
      )}

      {/* True / False */}
      {q.type === 'true_false' && (
        <div style={{ marginTop: 4, display: 'flex', gap: 24 }}>
          <span>○ True</span><span>○ False</span>
        </div>
      )}

      {/* Table */}
      {q.type === 'table' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6, fontSize: 11 }}>
          <thead>
            <tr>
              {q.tableHeaders.map((h, hi) => (
                <th key={hi} style={{ border: '1px solid #999', padding: '5px 8px', background: '#f0f0f0', fontWeight: 700, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.tableRows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ border: '1px solid #999', padding: '6px 8px', minHeight: 24, height: 28 }}>{cell || ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Answer lines */}
      {(q.type === 'short' || q.type === 'essay' || q.type === 'label') && q.subParts.length === 0 && (
        <DottedLines count={q.answerLines} />
      )}

      {/* Rubric */}
      <RubricPreview items={q.rubric} />

      {/* Sub-parts */}
      {q.subParts.length > 0 && (
        <div style={{ marginTop: 6, paddingLeft: 12 }}>
          {q.subParts.map((sp) => (
            <div key={sp.id} style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>{sp.label}.</span>
              <span style={{ marginLeft: 4 }}>{sp.text || <em style={{ color: '#bbb' }}>Sub-part text…</em>}</span>
              <span style={{ marginLeft: 6, fontSize: 10, color: '#888' }}>[{sp.marks}]</span>
              <DottedLines count={sp.answerLines} />
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div style={{ marginBottom: 14, fontSize: bodyFontSize, lineHeight: 1.7 }}>
      {hasRightImage ? (
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, flexShrink: 0 }}>{qNum}.</span>
              <div style={{ flex: 1 }}>{questionContent}</div>
            </div>
          </div>
          <div style={{ flexShrink: 0, maxWidth: '35%', textAlign: 'center' }}>
            <img src={q.imageUrl!} alt="" style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', border: '1px solid #ddd' }} />
            {q.imageCaption && <div style={{ fontSize: 10, color: '#888', marginTop: 3, fontStyle: 'italic' }}>{q.imageCaption}</div>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 700, flexShrink: 0 }}>{qNum}.</span>
          <div style={{ flex: 1 }}>{questionContent}</div>
        </div>
      )}
    </div>
  );
}

/* ─── cover page preview ─────────────────────────────────────────────── */
function CoverPage({ draft }: { draft: AssessmentDraft }) {
  const totalMarks = draft.sections.reduce((sum, s) => {
    const sm = s.questions.reduce((a, q) => a + q.marks + q.subParts.reduce((b, sp) => b + sp.marks, 0), 0);
    return sum + (s.marks || sm);
  }, 0) || draft.totalMarks;

  const showMarksRow = (draft.practicalMarks > 0 || draft.theoryMarks > 0);
  const instructions = draft.coverInstructions
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const fieldLine: React.CSSProperties = {
    borderBottom: '1px solid #444',
    display: 'inline-block',
    minWidth: 90,
  };

  return (
    <div style={{
      width: '100%', background: '#fff', color: '#111',
      fontFamily: draft.bodyFont || 'Times New Roman, serif',
      padding: '28px 32px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.35)',
      minHeight: 700,
      marginBottom: 18,
      pageBreakAfter: 'always',
    }}>
      {/* School header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 10, gap: 12 }}>
        {draft.logoUrl && (
          <img src={draft.logoUrl} alt="" style={{ height: 56, objectFit: 'contain', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, textAlign: 'center' }}>
          {draft.schoolName && (
            <div style={{ fontFamily: draft.headerFont, fontSize: 14, fontWeight: 700, textTransform: 'uppercase' as const }}>
              {draft.schoolName}
            </div>
          )}
          {draft.subject && (
            <div style={{ fontFamily: draft.headerFont, fontSize: 12, fontWeight: 700, marginTop: 2 }}>
              {draft.subject.toUpperCase()}
            </div>
          )}
          {(draft.examType || draft.assessmentType) && (
            <div style={{ fontFamily: draft.headerFont, fontSize: 11, marginTop: 2 }}>
              {draft.examType || draft.assessmentType}
            </div>
          )}
        </div>
      </div>

      <div style={{ borderTop: '2px solid #111', borderBottom: '2px solid #111', margin: '8px 0 12px' }} />

      {/* Student fields grid */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
        <tbody>
          {/* Row 1: Name full width */}
          <tr>
            <td colSpan={2} style={{ padding: '5px 0' }}>
              Name of Student: <span style={{ ...fieldLine, minWidth: 240 }}>&nbsp;</span>
            </td>
          </tr>
          {/* Row 2: Class | Section */}
          <tr>
            <td style={{ padding: '5px 0', width: '50%' }}>
              Class: <b>{draft.className || '___'}</b>{draft.grade ? ` (Grade ${draft.grade})` : ''}
            </td>
            <td style={{ padding: '5px 0' }}>
              Section: <span style={fieldLine}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            </td>
          </tr>
          {/* Row 3: Roll Number | Subject */}
          <tr>
            <td style={{ padding: '5px 0' }}>
              Roll Number: <span style={{ ...fieldLine, minWidth: 80 }}>&nbsp;</span>
            </td>
            <td style={{ padding: '5px 0' }}>
              Subject: <b>{draft.subject || '___'}</b>
            </td>
          </tr>
          {/* Row 4: Date | Exam Type */}
          <tr>
            <td style={{ padding: '5px 0' }}>
              Date of Examination: <span style={{ ...fieldLine, minWidth: 80 }}>&nbsp;</span>
            </td>
            <td style={{ padding: '5px 0' }}>
              Exam Type: <b>{draft.examType || draft.assessmentType || '___'}</b>
            </td>
          </tr>
          {/* Row 5: Invigilator | Duration */}
          {draft.invigilatorField && (
            <tr>
              <td style={{ padding: '5px 0' }}>
                Invigilator&apos;s Signature: <span style={{ ...fieldLine, minWidth: 80 }}>&nbsp;</span>
              </td>
              <td style={{ padding: '5px 0' }}>
                Duration: <b>{draft.duration || '___'}</b>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Practical / Theory / Total marks row */}
      {showMarksRow && (
        <div style={{ display: 'flex', gap: 20, fontSize: 12, marginBottom: 12, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4 }}>
          {draft.practicalMarks > 0 && (
            <span>Practical marks: <span style={{ display: 'inline-block', borderBottom: '1px solid #444', minWidth: 24 }}>&nbsp;</span> / {draft.practicalMarks}</span>
          )}
          {draft.theoryMarks > 0 && (
            <span>Theory marks: <span style={{ display: 'inline-block', borderBottom: '1px solid #444', minWidth: 24 }}>&nbsp;</span> / {draft.theoryMarks}</span>
          )}
          <span>Total marks: <span style={{ display: 'inline-block', borderBottom: '1px solid #444', minWidth: 24 }}>&nbsp;</span> / {totalMarks}</span>
        </div>
      )}

      {/* Important Instructions */}
      {instructions.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, textDecoration: 'underline' }}>Important Instructions:</div>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: 11, lineHeight: 1.8 }}>
            {instructions.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* For Office Use Only */}
      {draft.sections.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>For Office Use Only:</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {['Section Number', 'Marks Allotted', 'Marks Obtained', "Examiner's Initials"].map((h, i) => (
                  <th key={i} style={{ border: '1px solid #888', padding: '5px 8px', background: '#f0f0f0', fontWeight: 700, textAlign: 'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draft.sections.map((sec) => {
                const sm = sec.marks || sec.questions.reduce((a, q) => a + q.marks + q.subParts.reduce((b, sp) => b + sp.marks, 0), 0);
                return (
                  <tr key={sec.id}>
                    <td style={{ border: '1px solid #888', padding: '6px 8px', textAlign: 'center' }}>{sec.title}</td>
                    <td style={{ border: '1px solid #888', padding: '6px 8px', textAlign: 'center' }}>{sm || ''}</td>
                    <td style={{ border: '1px solid #888', padding: '6px 8px', textAlign: 'center' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #888', padding: '6px 8px', textAlign: 'center' }}>&nbsp;</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ border: '1px solid #888', padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Total</td>
                <td style={{ border: '1px solid #888', padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>{totalMarks || ''}</td>
                <td style={{ border: '1px solid #888', padding: '6px 8px', textAlign: 'center' }}>&nbsp;</td>
                <td style={{ border: '1px solid #888', padding: '6px 8px', textAlign: 'center' }}>&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── A4 paper preview ─────────────────────────────────────────────── */
function PaperPreview({ draft }: { draft: AssessmentDraft }) {
  const borderMap: Record<string, string> = {
    none: 'none', single: '1.5px solid #222', double: '3px double #222', thick: '4px solid #111',
  };

  const totalMarks = draft.sections.reduce((sum, s) => {
    const sm = s.questions.reduce((a, q) => a + q.marks + q.subParts.reduce((b, sp) => b + sp.marks, 0), 0);
    return sum + (s.marks || sm);
  }, 0) || draft.totalMarks;

  let qCounter = 0;

  function renderQuestions(questions: PaperQuestion[]) {
    return questions.map((q) => {
      qCounter++;
      const qNum = qCounter;
      return (
        <QuestionPreview key={q.id} q={q} qNum={qNum} bodyFont={draft.bodyFont} headerFont={draft.headerFont} bodyFontSize={draft.bodyFontSize} />
      );
    });
  }

  return (
    <>
      {draft.showCoverPage && <CoverPage draft={draft} />}

      <div style={{
        width: '100%', background: '#fff', color: '#111',
        fontFamily: draft.bodyFont || 'Times New Roman, serif',
        fontSize: draft.bodyFontSize || 11,
        padding: '28px 32px',
        border: borderMap[draft.borderStyle] || 'none',
        boxShadow: '0 4px 32px rgba(0,0,0,0.35)',
        minHeight: 700, position: 'relative',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 8, textAlign: 'center' }}>
          {draft.logoPosition === 'left' && draft.logoUrl && (
            <img src={draft.logoUrl} alt="" style={{ height: 56, objectFit: 'contain', marginRight: 14, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, textAlign: 'center' }}>
            {draft.logoPosition === 'center' && draft.logoUrl && (
              <div style={{ marginBottom: 6 }}><img src={draft.logoUrl} alt="" style={{ height: 52, objectFit: 'contain' }} /></div>
            )}
            {draft.schoolName && (
              <div style={{ fontFamily: draft.headerFont, fontSize: draft.headerFontSize + 2, fontWeight: 700, textTransform: 'uppercase' as const }}>
                {draft.schoolName}
              </div>
            )}
            {draft.subject && (
              <div style={{ fontFamily: draft.headerFont, fontSize: draft.headerFontSize, fontWeight: 700, marginTop: 1 }}>
                {draft.subject.toUpperCase()}
              </div>
            )}
            {(draft.term || draft.assessmentType) && (
              <div style={{ fontFamily: draft.headerFont, fontSize: draft.headerFontSize - 1, fontWeight: 600, marginTop: 1 }}>
                {[draft.term, draft.assessmentType].filter(Boolean).join(' ')}
                {draft.className || draft.grade ? ` (${[draft.className || ('Grade ' + draft.grade)].filter(Boolean).join('')})` : ''}
              </div>
            )}
            {draft.title && (
              <div style={{ fontFamily: draft.headerFont, fontSize: draft.headerFontSize - 1, marginTop: 2 }}>
                {draft.title}
              </div>
            )}
          </div>
          {draft.logoPosition === 'right' && draft.logoUrl && (
            <img src={draft.logoUrl} alt="" style={{ height: 56, objectFit: 'contain', marginLeft: 14, flexShrink: 0 }} />
          )}
        </div>

        {/* Name / Grade / Section row */}
        <div style={{ borderTop: '1.5px solid #111', borderBottom: '1.5px solid #111', padding: '5px 0', marginBottom: 8, fontSize: draft.bodyFontSize, display: 'flex', gap: 8 }}>
          <span style={{ flex: 2 }}>Name: <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 140 }}>&nbsp;</span></span>
          <span>Grade: <b>{draft.grade || '___'}</b></span>
          <span>Section: <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 30 }}>&nbsp;</span></span>
        </div>

        {/* Date / Duration / Total marks row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: draft.bodyFontSize, marginBottom: 8 }}>
          <span>Date: <b>{draft.date ? new Date(draft.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '___'}</b></span>
          {draft.duration && <span>Duration: <b>{draft.duration}</b></span>}
          <span>Total mark: <b>{totalMarks || '___'}</b></span>
        </div>

        {/* Instructions */}
        {draft.instructions && (
          <div style={{ fontSize: draft.bodyFontSize, marginBottom: 10, textAlign: 'center' }}>
            <span style={{ textDecoration: 'underline', fontWeight: 700 }}>INSTRUCTION</span>
            <span style={{ fontWeight: 400 }}> : {draft.instructions}</span>
          </div>
        )}

        {/* Sections */}
        {draft.sections.length === 0 ? (
          <div style={{ color: '#aaa', fontSize: 12, textAlign: 'center', padding: '32px 0' }}>
            No sections yet — add a section to begin
          </div>
        ) : (
          draft.sections.map((sec) => {
            const secMarks = sec.marks || sec.questions.reduce((a, q) => a + q.marks + q.subParts.reduce((b, sp) => b + sp.marks, 0), 0);
            const hasParts = sec.parts && sec.parts.length > 0;
            return (
              <div key={sec.id} style={{ marginBottom: 18 }}>
                {/* Section heading */}
                {sec.title && (
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: draft.headerFontSize + 2, marginBottom: 4, fontFamily: draft.headerFont }}>
                    {sec.title}{secMarks > 0 ? ` [${secMarks} Marks]` : ''}
                  </div>
                )}
                {sec.instruction && (
                  <div style={{ fontSize: draft.bodyFontSize, textAlign: 'center', marginBottom: 6, textDecoration: 'underline' }}>
                    {sec.instruction}
                  </div>
                )}

                {/* Word bank */}
                {sec.wordBank.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, fontSize: draft.bodyFontSize }}>
                    <tbody>
                      <tr>
                        {sec.wordBank.map((w, wi) => (
                          <td key={wi} style={{ border: '1px solid #999', padding: '4px 8px', textAlign: 'center' }}>{w}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                )}

                {/* Parts or direct questions */}
                {hasParts ? (
                  sec.parts.map((part) => (
                    <div key={part.id} style={{ marginBottom: 14 }}>
                      <div style={{
                        fontWeight: 700, fontSize: draft.headerFontSize, marginBottom: part.instruction ? 2 : 6,
                        fontStyle: part.style === 'italic-underline' ? 'italic' : 'normal',
                        textDecoration: part.style === 'italic-underline' ? 'underline' : 'none',
                      }}>
                        {part.title}
                      </div>
                      {part.instruction && (
                        <div style={{ fontSize: draft.bodyFontSize, fontStyle: 'italic', marginBottom: 6, color: '#444' }}>
                          {part.instruction}
                        </div>
                      )}
                      {renderQuestions(part.questions)}
                    </div>
                  ))
                ) : (
                  renderQuestions(sec.questions)
                )}
              </div>
            );
          })
        )}

        {/* End message */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#444', borderTop: '1px solid #ccc', paddingTop: 10 }}>
          {draft.endMessage || '— END OF PAPER —'}
        </div>

        {/* Footer */}
        {(draft.footerText || draft.examiner || draft.showPageNumbers) && (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', borderTop: '1px solid #eee', paddingTop: 6 }}>
            <span>{draft.footerText || (draft.examiner ? `By ${draft.examiner}` : '')}</span>
            {draft.showPageNumbers && <span>Page 1</span>}
          </div>
        )}
      </div>
    </>
  );
}

/* ─── question editor row ───────────────────────────────────────────── */
function QuestionRow({
  q, index, onChange, onRemove, onImageUpload,
}: {
  q: PaperQuestion; index: number;
  onChange: (q: PaperQuestion) => void;
  onRemove: () => void;
  onImageUpload: (id: string, file: File) => void;
}) {
  const [open, setOpen] = useState(true);
  const [rubricOpen, setRubricOpen] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof PaperQuestion>(key: K, val: PaperQuestion[K]) {
    onChange({ ...q, [key]: val });
  }

  function addSubPart() {
    const labels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const label = labels[q.subParts.length] || String(q.subParts.length + 1);
    set('subParts', [...q.subParts, { id: uid(), label, text: '', marks: 1, answerLines: 2 }]);
  }

  function updateSubPart(sp: SubPart) {
    set('subParts', q.subParts.map(x => x.id === sp.id ? sp : x));
  }

  function removeSubPart(id: string) {
    set('subParts', q.subParts.filter(sp => sp.id !== id));
  }

  function addRubricItem() {
    set('rubric', [...q.rubric, { id: uid(), text: '', marks: 1 }]);
  }

  function updateRubricItem(item: RubricItem) {
    set('rubric', q.rubric.map(r => r.id === item.id ? item : r));
  }

  function removeRubricItem(id: string) {
    set('rubric', q.rubric.filter(r => r.id !== id));
  }

  function resizeTable(cols: number, rows: number) {
    const headers = Array.from({ length: cols }, (_, i) => q.tableHeaders[i] || `Column ${i + 1}`);
    const tableRows = Array.from({ length: rows }, (_, ri) =>
      Array.from({ length: cols }, (_, ci) => (q.tableRows[ri] ?? [])[ci] ?? '')
    );
    onChange({ ...q, tableCols: cols, tableRowCount: rows, tableHeaders: headers, tableRows });
  }

  function updateHeader(i: number, val: string) {
    const h = [...q.tableHeaders]; h[i] = val;
    set('tableHeaders', h);
  }

  function updateCell(ri: number, ci: number, val: string) {
    const rows = q.tableRows.map(r => [...r]);
    rows[ri][ci] = val;
    set('tableRows', rows);
  }

  const typeLabels: Record<QType, string> = {
    mcq: 'Multiple Choice', true_false: 'True / False', short: 'Short Answer',
    essay: 'Essay / Long', fill_blank: 'Fill in the Blank', table: 'Table Fill-in',
    label: 'Image / Label', code_block: 'Code Block', draw_box: 'Draw Box',
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
        onClick={() => setOpen(o => !o)}>
        <GripVertical size={13} color="rgba(255,255,255,0.2)" />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', minWidth: 24 }}>Q{index + 1}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginRight: 4 }}>{typeLabels[q.type]}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {q.text || <em>Untitled</em>}
        </span>
        <span style={{ fontSize: 10, color: '#c9a84c', marginRight: 6 }}>{q.marks}mk</span>
        <ChevronDown size={12} color="rgba(255,255,255,0.3)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'rgba(255,80,80,0.5)', display: 'flex', alignItems: 'center' }}>
          <Trash2 size={12} />
        </button>
      </div>

      {open && (
        <div style={{ padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* type + marks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <div>
              <FieldLabel>QUESTION TYPE</FieldLabel>
              <select value={q.type} onChange={e => set('type', e.target.value as QType)} style={{ ...INPUT, cursor: 'pointer' }}>
                <option value="short">Short Answer</option>
                <option value="essay">Essay / Long Answer</option>
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="true_false">True / False</option>
                <option value="fill_blank">Fill in the Blank</option>
                <option value="table">Table Fill-in</option>
                <option value="label">Image Identification / Label</option>
                <option value="code_block">Code Block</option>
                <option value="draw_box">Draw Box</option>
              </select>
            </div>
            <div style={{ width: 75 }}>
              <FieldLabel>MARKS</FieldLabel>
              <input type="number" min={0} max={100} value={q.marks} onChange={e => set('marks', parseInt(e.target.value) || 0)}
                style={{ ...INPUT, textAlign: 'center' }} />
            </div>
          </div>

          {/* question text */}
          <div>
            <FieldLabel>
              {q.type === 'fill_blank' ? 'QUESTION TEXT (use ___ for each blank)' :
               q.type === 'code_block' ? 'INSTRUCTION ABOVE CODE (optional)' :
               q.type === 'draw_box' ? 'INSTRUCTION ABOVE BOX (optional)' : 'QUESTION TEXT'}
            </FieldLabel>
            <textarea value={q.text} onChange={e => set('text', e.target.value)}
              placeholder={
                q.type === 'fill_blank' ? 'e.g. The CPU stands for ___ Processing Unit.' :
                q.type === 'code_block' ? 'e.g. Study the code below and answer the questions.' :
                q.type === 'draw_box' ? 'e.g. Draw and label the diagram.' :
                'Type your question here…'
              }
              rows={2} style={{ ...INPUT, resize: 'vertical', lineHeight: 1.5 }} />
            {q.type === 'fill_blank' && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
                Use ___ (three underscores) wherever you want a blank line to appear.
              </div>
            )}
          </div>

          {/* code_block fields */}
          {q.type === 'code_block' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                <div>
                  <FieldLabel>CODE LANGUAGE</FieldLabel>
                  <input value={q.codeLanguage} onChange={e => set('codeLanguage', e.target.value)}
                    placeholder="Python, HTML, Small Basic…" style={INPUT} />
                </div>
              </div>
              <div>
                <FieldLabel>CODE CONTENT</FieldLabel>
                <textarea value={q.codeText} onChange={e => set('codeText', e.target.value)}
                  placeholder={'print("Hello World")\nfor i in range(5):\n    print(i)'}
                  rows={6} style={{ ...INPUT, fontFamily: 'Courier New, monospace', fontSize: 12, resize: 'vertical', lineHeight: 1.6 }} />
              </div>
            </>
          )}

          {/* draw_box fields */}
          {q.type === 'draw_box' && (
            <div>
              <FieldLabel>BOX HEIGHT (mm)</FieldLabel>
              <input type="number" min={20} max={200} value={q.boxHeight} onChange={e => set('boxHeight', parseInt(e.target.value) || 60)}
                style={{ ...INPUT, width: 100 }} />
            </div>
          )}

          {/* image upload (not for code_block) */}
          {q.type !== 'code_block' && (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: q.imageUrl ? 8 : 0 }}>
                <button onClick={() => imgRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer' }}>
                  <ImageIcon size={11} /> {q.type === 'label' ? 'Upload image to identify' : 'Add image'}
                </button>
                {q.imageUrl && (
                  <>
                    <img src={q.imageUrl} alt="" style={{ height: 36, borderRadius: 4, objectFit: 'contain' }} />
                    <button onClick={() => set('imageUrl', undefined)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,80,80,0.6)', fontSize: 11 }}>remove</button>
                  </>
                )}
                <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) onImageUpload(q.id, f); }} />
              </div>
              {q.imageUrl && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                  <div>
                    <FieldLabel>IMAGE CAPTION (optional)</FieldLabel>
                    <input value={q.imageCaption} onChange={e => set('imageCaption', e.target.value)}
                      placeholder="Fig. 1: …" style={INPUT} />
                  </div>
                  <div>
                    <FieldLabel>POSITION</FieldLabel>
                    <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                      {(['above', 'right'] as const).map(p => (
                        <button key={p} onClick={() => set('imagePosition', p)}
                          style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: q.imagePosition === p ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${q.imagePosition === p ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`, color: q.imagePosition === p ? '#c9a84c' : 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MCQ options */}
          {q.type === 'mcq' && (
            <div>
              <FieldLabel>OPTIONS (click checkbox to mark correct answer)</FieldLabel>
              {q.options.map((opt, oi) => (
                <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <button onClick={() => set('answer', opt)}
                    style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 4, background: q.answer === opt && opt ? '#10b981' : 'rgba(255,255,255,0.06)', border: `1.5px solid ${q.answer === opt && opt ? '#10b981' : 'rgba(255,255,255,0.15)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {q.answer === opt && opt && <Check size={10} color="#fff" strokeWidth={2.5} />}
                  </button>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 14 }}>{String.fromCharCode(65 + oi)}.</span>
                  <input value={opt} onChange={e => { const opts = [...q.options]; opts[oi] = e.target.value; set('options', opts); }}
                    placeholder={`Option ${String.fromCharCode(65 + oi)}`} style={{ ...INPUT, flex: 1 }} />
                </div>
              ))}
              <button onClick={() => set('options', [...q.options, ''])}
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', paddingLeft: 30 }}>+ add option</button>
            </div>
          )}

          {/* True/False */}
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

          {/* Table editor */}
          {q.type === 'table' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <FieldLabel>COLUMNS</FieldLabel>
                  <input type="number" min={1} max={8} value={q.tableCols}
                    onChange={e => resizeTable(Math.max(1, parseInt(e.target.value) || 1), q.tableRowCount)}
                    style={{ ...INPUT, textAlign: 'center' }} />
                </div>
                <div>
                  <FieldLabel>ROWS (student fills)</FieldLabel>
                  <input type="number" min={1} max={20} value={q.tableRowCount}
                    onChange={e => resizeTable(q.tableCols, Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ ...INPUT, textAlign: 'center' }} />
                </div>
              </div>
              <FieldLabel>COLUMN HEADERS</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${q.tableCols}, 1fr)`, gap: 6, marginBottom: 10 }}>
                {q.tableHeaders.map((h, i) => (
                  <input key={i} value={h} onChange={e => updateHeader(i, e.target.value)}
                    placeholder={`Col ${i + 1}`} style={{ ...INPUT }} />
                ))}
              </div>
              <FieldLabel>PRE-FILLED CONTENT (leave blank = student fills in)</FieldLabel>
              {q.tableRows.map((row, ri) => (
                <div key={ri} style={{ display: 'grid', gridTemplateColumns: `repeat(${q.tableCols}, 1fr)`, gap: 6, marginBottom: 6 }}>
                  {row.map((cell, ci) => (
                    <input key={ci} value={cell} onChange={e => updateCell(ri, ci, e.target.value)}
                      placeholder={`R${ri + 1}C${ci + 1}`} style={{ ...INPUT, fontSize: 11 }} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Answer lines */}
          {(q.type === 'short' || q.type === 'essay' || q.type === 'label') && (
            <div>
              <FieldLabel>ANSWER LINES (dotted lines on paper)</FieldLabel>
              <input type="number" min={1} max={20} value={q.answerLines} onChange={e => set('answerLines', parseInt(e.target.value) || 1)}
                style={{ ...INPUT, width: 80, display: 'inline-block' }} />
            </div>
          )}

          {/* Rubric */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <button onClick={() => setRubricOpen(o => !o)}
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ChevronDown size={10} style={{ transform: rubricOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                RUBRIC / CRITERIA {q.rubric.length > 0 ? `(${q.rubric.length})` : ''}
              </button>
              {rubricOpen && (
                <button onClick={addRubricItem}
                  style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                  <Plus size={10} /> Add criterion
                </button>
              )}
            </div>
            {rubricOpen && q.rubric.map(item => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <input value={item.text} onChange={e => updateRubricItem({ ...item, text: e.target.value })}
                  placeholder="Criterion description…" style={INPUT} />
                <input type="number" min={0} max={20} value={item.marks} onChange={e => updateRubricItem({ ...item, marks: parseInt(e.target.value) || 0 })}
                  style={{ ...INPUT, width: 50, textAlign: 'center' }} />
                <button onClick={() => removeRubricItem(item.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,80,80,0.5)' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Sub-parts */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <FieldLabel>SUB-PARTS (a, b, c …)</FieldLabel>
              <button onClick={addSubPart}
                style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                <Plus size={10} /> Add sub-part
              </button>
            </div>
            {q.subParts.map(sp => (
              <div key={sp.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '9px 11px', marginBottom: 7 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#c9a84c', minWidth: 18 }}>{sp.label}.</span>
                  <input value={sp.text} onChange={e => updateSubPart({ ...sp, text: e.target.value })}
                    placeholder="Sub-part text…" style={{ ...INPUT }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>MK</span>
                    <input type="number" min={0} max={50} value={sp.marks} onChange={e => updateSubPart({ ...sp, marks: parseInt(e.target.value) || 0 })}
                      style={{ ...INPUT, width: 46, textAlign: 'center', padding: '4px 6px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>LINES</span>
                    <input type="number" min={1} max={15} value={sp.answerLines} onChange={e => updateSubPart({ ...sp, answerLines: parseInt(e.target.value) || 1 })}
                      style={{ ...INPUT, width: 46, textAlign: 'center', padding: '4px 6px' }} />
                  </div>
                </div>
                <button onClick={() => removeSubPart(sp.id)}
                  style={{ fontSize: 10, color: 'rgba(255,80,80,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  remove sub-part
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── part editor ────────────────────────────────────────────────────── */
function PartEditor({
  part, partIndex, onChange, onRemove, onAddQuestion, onUpdateQuestion, onRemoveQuestion, onImageUpload,
}: {
  part: PaperPart; partIndex: number;
  onChange: (p: PaperPart) => void;
  onRemove: () => void;
  onAddQuestion: () => void;
  onUpdateQuestion: (q: PaperQuestion) => void;
  onRemoveQuestion: (id: string) => void;
  onImageUpload: (id: string, file: File) => void;
}) {
  const [open, setOpen] = useState(true);

  function set<K extends keyof PaperPart>(key: K, val: PaperPart[K]) {
    onChange({ ...part, [key]: val });
  }

  return (
    <div style={{ border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, marginBottom: 10, overflow: 'hidden', background: 'rgba(99,102,241,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', background: 'rgba(99,102,241,0.06)' }}
        onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(99,102,241,0.9)', flex: 1 }}>{part.title || `Part ${partIndex + 1}`}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{part.questions.length} Q</span>
        <ChevronDown size={11} color="rgba(99,102,241,0.5)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,80,80,0.5)' }}>
          <Trash2 size={11} />
        </button>
      </div>
      {open && (
        <div style={{ padding: '10px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 8 }}>
            <div>
              <FieldLabel>PART TITLE</FieldLabel>
              <input value={part.title} onChange={e => set('title', e.target.value)}
                placeholder="e.g. Part 1: Fill in the Blanks" style={INPUT} />
            </div>
            <div style={{ width: 140 }}>
              <FieldLabel>TITLE STYLE</FieldLabel>
              <select value={part.style} onChange={e => set('style', e.target.value as PaperPart['style'])} style={{ ...INPUT, cursor: 'pointer' }}>
                <option value="normal">Normal</option>
                <option value="italic-underline">Italic + Underline</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <FieldLabel>PART INSTRUCTION (italic, shown below title)</FieldLabel>
            <input value={part.instruction} onChange={e => set('instruction', e.target.value)}
              placeholder="e.g. Answer all questions in this part." style={INPUT} />
          </div>

          {part.questions.map((q, qi) => (
            <QuestionRow key={q.id} q={q} index={qi}
              onChange={onUpdateQuestion}
              onRemove={() => onRemoveQuestion(q.id)}
              onImageUpload={onImageUpload} />
          ))}

          <button onClick={onAddQuestion}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px', borderRadius: 9, background: 'rgba(99,102,241,0.06)', border: '1.5px dashed rgba(99,102,241,0.25)', color: 'rgba(99,102,241,0.7)', fontSize: 11, cursor: 'pointer', marginTop: 6 }}>
            <Plus size={11} /> Add question to this part
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── section editor ────────────────────────────────────────────────── */
function SectionEditor({
  sec, index, onChange, onRemove, onAddQuestion, onUpdateQuestion, onRemoveQuestion, onImageUpload,
  onShowBank,
}: {
  sec: PaperSection; index: number;
  onChange: (s: PaperSection) => void;
  onRemove: () => void;
  onAddQuestion: () => void;
  onUpdateQuestion: (q: PaperQuestion) => void;
  onRemoveQuestion: (id: string) => void;
  onImageUpload: (id: string, file: File) => void;
  onShowBank: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [wordBankInput, setWordBankInput] = useState('');
  const hasParts = sec.parts && sec.parts.length > 0;

  function set<K extends keyof PaperSection>(key: K, val: PaperSection[K]) {
    onChange({ ...sec, [key]: val });
  }

  function addWordBankItem() {
    const v = wordBankInput.trim();
    if (!v) return;
    set('wordBank', [...sec.wordBank, v]);
    setWordBankInput('');
  }

  function addPart() {
    set('parts', [...(sec.parts || []), newPart()]);
  }

  function updatePart(part: PaperPart) {
    set('parts', (sec.parts || []).map(p => p.id === part.id ? part : p));
  }

  function removePart(id: string) {
    set('parts', (sec.parts || []).filter(p => p.id !== id));
  }

  function addQuestionToPart(partId: string) {
    set('parts', (sec.parts || []).map(p =>
      p.id === partId ? { ...p, questions: [...p.questions, newQuestion()] } : p
    ));
  }

  function updateQuestionInPart(partId: string, q: PaperQuestion) {
    set('parts', (sec.parts || []).map(p =>
      p.id === partId ? { ...p, questions: p.questions.map(x => x.id === q.id ? q : x) } : p
    ));
  }

  function removeQuestionFromPart(partId: string, qId: string) {
    set('parts', (sec.parts || []).map(p =>
      p.id === partId ? { ...p, questions: p.questions.filter(q => q.id !== qId) } : p
    ));
  }

  const totalQInSection = hasParts
    ? (sec.parts || []).reduce((a, p) => a + p.questions.length, 0)
    : sec.questions.length;

  const secMarks = sec.marks || (hasParts
    ? (sec.parts || []).reduce((a, p) => a + p.questions.reduce((b, q) => b + q.marks + q.subParts.reduce((c, sp) => c + sp.marks, 0), 0), 0)
    : sec.questions.reduce((a, q) => a + q.marks + q.subParts.reduce((b, sp) => b + sp.marks, 0), 0));

  return (
    <div style={{ border: '1.5px solid rgba(201,168,76,0.15)', borderRadius: 14, marginBottom: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', cursor: 'pointer', background: 'rgba(201,168,76,0.05)' }}
        onClick={() => setOpen(o => !o)}>
        <Layers size={13} color="#c9a84c" />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#c9a84c', flex: 1 }}>
          {sec.title || `Section ${index + 1}`}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{totalQInSection} Q · {sec.marks || secMarks} marks</span>
        <ChevronDown size={12} color="#c9a84c" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,80,80,0.5)' }}>
          <Trash2 size={12} />
        </button>
      </div>

      {open && (
        <div style={{ padding: '12px 14px' }}>
          {/* Section metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 10 }}>
            <div>
              <FieldLabel>SECTION TITLE</FieldLabel>
              <input value={sec.title} onChange={e => set('title', e.target.value)}
                placeholder="e.g. Section A" style={INPUT} />
            </div>
            <div style={{ width: 80 }}>
              <FieldLabel>MARKS</FieldLabel>
              <input type="number" min={0} value={sec.marks} onChange={e => set('marks', parseInt(e.target.value) || 0)}
                placeholder="auto" style={{ ...INPUT, textAlign: 'center' }} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <FieldLabel>SECTION INSTRUCTION</FieldLabel>
            <input value={sec.instruction} onChange={e => set('instruction', e.target.value)}
              placeholder="e.g. Answer all questions in this section." style={INPUT} />
          </div>

          {/* Word bank */}
          <div style={{ marginBottom: 12 }}>
            <FieldLabel>WORD BANK (match/select options shown at top of section)</FieldLabel>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input value={wordBankInput} onChange={e => setWordBankInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addWordBankItem()}
                placeholder="Type a word and press Enter or Add" style={{ ...INPUT, flex: 1 }} />
              <button onClick={addWordBankItem}
                style={{ padding: '8px 14px', borderRadius: 9, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                Add
              </button>
            </div>
            {sec.wordBank.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sec.wordBank.map((w, wi) => (
                  <div key={wi} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                    {w}
                    <button onClick={() => set('wordBank', sec.wordBank.filter((_, i) => i !== wi))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,80,80,0.5)', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Parts or direct questions */}
          {hasParts ? (
            <>
              {(sec.parts || []).map((part, pi) => (
                <PartEditor
                  key={part.id}
                  part={part}
                  partIndex={pi}
                  onChange={updatePart}
                  onRemove={() => removePart(part.id)}
                  onAddQuestion={() => addQuestionToPart(part.id)}
                  onUpdateQuestion={q => updateQuestionInPart(part.id, q)}
                  onRemoveQuestion={qId => removeQuestionFromPart(part.id, qId)}
                  onImageUpload={onImageUpload}
                />
              ))}
              <button onClick={addPart}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px', borderRadius: 9, background: 'rgba(99,102,241,0.06)', border: '1.5px dashed rgba(99,102,241,0.2)', color: 'rgba(99,102,241,0.6)', fontSize: 11, cursor: 'pointer', marginBottom: 8 }}>
                <Plus size={11} /> Add another part
              </button>
            </>
          ) : (
            <>
              {sec.questions.map((q, qi) => (
                <QuestionRow key={q.id} q={q} index={qi}
                  onChange={onUpdateQuestion}
                  onRemove={() => onRemoveQuestion(q.id)}
                  onImageUpload={onImageUpload} />
              ))}
            </>
          )}

          {/* Add question / part / import buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {!hasParts && (
              <button onClick={onAddQuestion}
                style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1.5px dashed rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', fontSize: 12, cursor: 'pointer' }}>
                <Plus size={12} /> Add question
              </button>
            )}
            <button onClick={addPart}
              style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 9, background: 'rgba(99,102,241,0.06)', border: '1.5px dashed rgba(99,102,241,0.2)', color: 'rgba(99,102,241,0.6)', fontSize: 12, cursor: 'pointer' }}>
              <Layers size={12} /> Add part
            </button>
            {!hasParts && (
              <button onClick={onShowBank}
                style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 9, background: 'rgba(201,168,76,0.06)', border: '1.5px dashed rgba(201,168,76,0.25)', color: '#c9a84c', fontSize: 12, cursor: 'pointer' }}>
                <BookOpen size={12} /> Import from bank
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── bank import modal ─────────────────────────────────────────────── */
function BankImportModal({ onClose, onImport }: {
  onClose: () => void;
  onImport: (qs: PaperQuestion[]) => void;
}) {
  const [topicKey, setTopicKey] = useState('');
  const [bankQs, setBankQs] = useState<BankQuestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

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
      type: q.type === 'truefalse' ? 'true_false' as const : q.type === 'mcq' ? 'mcq' as const : 'short' as const,
      text: q.text, options: Array.isArray(q.options) ? q.options : [],
      answer: q.answer || '', marks: 1, answerLines: 2, subParts: [],
      tableHeaders: ['Column 1', 'Column 2'], tableRows: [['', ''], ['', '']],
      tableCols: 2, tableRowCount: 2,
      imageCaption: '', imagePosition: 'above' as const,
      codeText: '', codeLanguage: 'Python',
      boxHeight: 60,
      rubric: [],
    }));
    onImport(converted);
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0f0f1e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Import from Question Bank</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <TopicPicker
            value={topicKey}
            onChange={key => { setTopicKey(key); setSelected(new Set()); }}
            inputStyle={INPUT}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px' }}>
          {loading && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Loading…</p>}
          {!loading && bankQs.length === 0 && topicKey && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No approved questions for this topic.</p>}
          {!loading && bankQs.map(q => {
            const checked = selected.has(q.id);
            return (
              <label key={q.id} onClick={() => toggle(q.id)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 11px', borderRadius: 10, cursor: 'pointer', marginBottom: 6, background: checked ? 'rgba(201,168,76,0.07)' : 'rgba(255,255,255,0.02)', border: `1.5px solid ${checked ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.05)'}` }}>
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
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={doImport} disabled={selected.size === 0}
            style={{ flex: 1, padding: '10px', borderRadius: 10, background: selected.size > 0 ? 'linear-gradient(135deg,#b8942a,#d4aa45)' : 'rgba(255,255,255,0.06)', border: 'none', color: selected.size > 0 ? '#1a1200' : 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 700, cursor: selected.size > 0 ? 'pointer' : 'default' }}>
            Import {selected.size > 0 ? `${selected.size} question${selected.size > 1 ? 's' : ''}` : 'questions'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── auto-scaling preview ──────────────────────────────────────────── */
function ScaledPreview({ draft }: { draft: AssessmentDraft }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const PAPER_W = 794; // A4 at 96dpi ≈ 794px wide

  const rescale = useCallback(() => {
    const wrap = wrapRef.current; const inner = innerRef.current;
    if (!wrap || !inner) return;
    const avail = wrap.clientWidth - 4;
    const scale = Math.min(1, avail / PAPER_W);
    inner.style.transform = `scale(${scale})`;
    inner.style.transformOrigin = 'top left';
    // After scaling, the element still occupies its natural height in layout.
    // We need to shrink the wrapper to the visually-rendered height.
    const naturalH = inner.scrollHeight;
    const scaledH = naturalH * scale;
    inner.style.marginBottom = `${scaledH - naturalH}px`;
    wrap.style.height = `${scaledH}px`;
  }, []);

  useEffect(() => {
    rescale();
    const ro = new ResizeObserver(rescale);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [rescale]);
  useEffect(() => { rescale(); }, [draft, rescale]);

  return (
    <div ref={wrapRef} style={{ width: '100%', overflow: 'hidden', position: 'relative' }}>
      <div ref={innerRef} style={{ width: PAPER_W, transition: 'transform 0.1s' }}>
        <PaperPreview draft={draft} />
      </div>
    </div>
  );
}

/* ─── toggle switch ─────────────────────────────────────────────────── */
function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <button type="button" onClick={onToggle}
        style={{ flexShrink: 0, width: 36, height: 20, borderRadius: 999, position: 'relative', border: 'none', cursor: 'pointer', background: on ? '#059669' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </button>
      <span style={{ fontSize: 13, color: on ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)' }}>{label}</span>
    </label>
  );
}

/* ─── main page ─────────────────────────────────────────────────────── */
export default function AssessmentBuilderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, ready, loading } = useAuth();
  useFirebase();

  const [draft, setDraft] = useState<AssessmentDraft>({
    id: uid(),
    schoolName: '', subject: '', term: 'Term 1', assessmentType: 'CA1',
    title: '', className: '', grade: '',
    date: new Date().toISOString().slice(0, 10),
    duration: '1 hour', examiner: '', totalMarks: 0,
    instructions: 'Answer all questions clearly.',
    endMessage: '— All the best! —',
    assignedClass: '',
    logoUrl: '', logoPosition: 'left',
    sections: [newSection('Section A')],
    headerFont: 'Times New Roman, serif',
    bodyFont: 'Times New Roman, serif',
    headerFontSize: 15,
    bodyFontSize: 12,
    borderStyle: 'single',
    showPageNumbers: false,
    footerText: '',
    status: 'draft',
    // cover page defaults
    showCoverPage: false,
    examType: '',
    practicalMarks: 0,
    theoryMarks: 0,
    rollNumber: '',
    invigilatorField: true,
    coverInstructions: 'Write clearly and legibly.\nAnswer all questions unless otherwise instructed.\nDo not write in the margins.',
  });

  const [activeTab, setActiveTab] = useState<'details' | 'sections' | 'format'>('details');
  const [bankTargetSection, setBankTargetSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof AssessmentDraft>(key: K, val: AssessmentDraft[K]) {
    setDraft(d => ({ ...d, [key]: val }));
  }

  function addSection() {
    const labels = ['Section A', 'Section B', 'Section C', 'Section D', 'Section E'];
    const label = labels[draft.sections.length] || `Section ${draft.sections.length + 1}`;
    setDraft(d => ({ ...d, sections: [...d.sections, newSection(label)] }));
  }

  function updateSection(sec: PaperSection) {
    setDraft(d => ({ ...d, sections: d.sections.map(s => s.id === sec.id ? sec : s) }));
  }

  function removeSection(id: string) {
    setDraft(d => ({ ...d, sections: d.sections.filter(s => s.id !== id) }));
  }

  function addQuestion(sectionId: string) {
    setDraft(d => ({
      ...d, sections: d.sections.map(s =>
        s.id === sectionId ? { ...s, questions: [...s.questions, newQuestion()] } : s
      ),
    }));
  }

  function updateQuestion(sectionId: string, q: PaperQuestion) {
    setDraft(d => ({
      ...d, sections: d.sections.map(s =>
        s.id === sectionId ? { ...s, questions: s.questions.map(x => x.id === q.id ? q : x) } : s
      ),
    }));
  }

  function removeQuestion(sectionId: string, qId: string) {
    setDraft(d => ({
      ...d, sections: d.sections.map(s =>
        s.id === sectionId ? { ...s, questions: s.questions.filter(q => q.id !== qId) } : s
      ),
    }));
  }

  function handleImageUpload(qId: string, file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target?.result as string;
      setDraft(d => ({
        ...d, sections: d.sections.map(s => ({
          ...s,
          questions: s.questions.map(q => q.id === qId ? { ...q, imageUrl: url } : q),
          parts: (s.parts || []).map(p => ({
            ...p,
            questions: p.questions.map(q => q.id === qId ? { ...q, imageUrl: url } : q),
          })),
        })),
      }));
    };
    reader.readAsDataURL(file);
  }

  function importToSection(sectionId: string, qs: PaperQuestion[]) {
    setDraft(d => ({
      ...d, sections: d.sections.map(s =>
        s.id === sectionId ? { ...s, questions: [...s.questions, ...qs] } : s
      ),
    }));
  }

  function handleLogoUpload(file: File) {
    const reader = new FileReader();
    reader.onload = e => set('logoUrl', e.target?.result as string);
    reader.readAsDataURL(file);
  }

  const handleSave = useCallback(async (status: 'draft' | 'published') => {
    if (!draft.subject.trim() && !draft.title.trim()) { toast('Enter a subject or title', 'error'); return; }
    setSaving(true);
    try {
      const key = `assessment_${draft.id}`;
      localStorage.setItem(key, JSON.stringify({ ...draft, status, updatedAt: Date.now() }));
      const idx: string[] = JSON.parse(localStorage.getItem('assessments_index') || '[]');
      if (!idx.includes(draft.id)) { idx.unshift(draft.id); localStorage.setItem('assessments_index', JSON.stringify(idx)); }
      toast(status === 'published' ? 'Assessment published!' : 'Draft saved', 'success');
      if (status === 'published') router.push('/teacher');
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }, [draft, toast, router]);

  const totalQs = draft.sections.reduce((a, s) => {
    const directQs = s.questions.length;
    const partQs = (s.parts || []).reduce((b, p) => b + p.questions.length, 0);
    return a + directQs + partQs;
  }, 0);

  const totalMarks = draft.sections.reduce((a, s) => {
    const hasParts = s.parts && s.parts.length > 0;
    const sm = hasParts
      ? (s.parts || []).reduce((b, p) => b + p.questions.reduce((c, q) => c + q.marks + q.subParts.reduce((d, sp) => d + sp.marks, 0), 0), 0)
      : s.questions.reduce((b, q) => b + q.marks + q.subParts.reduce((c, sp) => c + sp.marks, 0), 0);
    return a + (s.marks || sm);
  }, 0);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</div>
    </div>;
  }
  if (!ready || !user) { router.replace('/teacher'); return null; }

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', border: 'none',
    background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
    color: active ? '#c9a84c' : 'rgba(255,255,255,0.4)',
    transition: 'all 0.15s',
  });

  return (
    <>
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body, html { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          body > *:not(#print-area) { display: none !important; }
          #print-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #print-area > div {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-sizing: border-box !important;
            font-size: 11pt !important;
          }
          @page { size: A4 portrait; margin: 0; }
        }
        #print-area { display: none; }
      `}</style>
      <div id="print-area"><PaperPreview draft={draft} /></div>

      <div style={{ minHeight: '100vh', background: BG, color: '#f5f3ee' }}>

        {/* nav */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', background: 'rgba(5,8,20,0.88)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => router.push('/teacher')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            <ChevronLeft size={14} /> Teacher
          </button>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Paper Builder</span>
          {totalQs > 0 && (
            <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 999, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)', color: '#c9a84c' }}>
              {totalQs} Q · {totalMarks} marks
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

          {/* editor panel */}
          <div style={{ flex: '0 0 460px', minWidth: 0, padding: '22px 18px 80px', overflowY: 'auto', maxHeight: 'calc(100vh - 55px)' }}>

            {/* tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 18, padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, width: 'fit-content' }}>
              <button style={TAB_STYLE(activeTab === 'details')} onClick={() => setActiveTab('details')}>
                <FileText size={11} style={{ marginRight: 5, display: 'inline' }} />Details
              </button>
              <button style={TAB_STYLE(activeTab === 'sections')} onClick={() => setActiveTab('sections')}>
                <Layers size={11} style={{ marginRight: 5, display: 'inline' }} />Sections {totalQs > 0 && `(${totalQs})`}
              </button>
              <button style={TAB_STYLE(activeTab === 'format')} onClick={() => setActiveTab('format')}>
                <Layout size={11} style={{ marginRight: 5, display: 'inline' }} />Format
              </button>
            </div>

            {/* DETAILS tab */}
            {activeTab === 'details' && (
              <>
                <div style={CARD}>
                  <SectionTitle icon={FileText}>Paper Information</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <FieldLabel>SCHOOL NAME</FieldLabel>
                      <input style={INPUT} value={draft.schoolName} onChange={e => set('schoolName', e.target.value)} placeholder="DPS International Ghana" />
                    </div>
                    <div>
                      <FieldLabel>SUBJECT</FieldLabel>
                      <input style={INPUT} value={draft.subject} onChange={e => set('subject', e.target.value)} placeholder="Computer Science" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <FieldLabel>TERM</FieldLabel>
                      <select value={draft.term} onChange={e => set('term', e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}>
                        {TERMS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>ASSESSMENT TYPE</FieldLabel>
                      <select value={draft.assessmentType} onChange={e => set('assessmentType', e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}>
                        {ASSESSMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <FieldLabel>CLASS / SECTION</FieldLabel>
                      <input style={INPUT} value={draft.className} onChange={e => set('className', e.target.value)} placeholder="e.g. Terabytes" />
                    </div>
                    <div>
                      <FieldLabel>GRADE</FieldLabel>
                      <input style={INPUT} value={draft.grade} onChange={e => set('grade', e.target.value)} placeholder="5" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <FieldLabel>ADDITIONAL TITLE (optional)</FieldLabel>
                    <input style={INPUT} value={draft.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Chapter 1 & 2" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <FieldLabel>DATE</FieldLabel>
                      <input type="date" style={INPUT} value={draft.date} onChange={e => set('date', e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>DURATION</FieldLabel>
                      <input style={INPUT} value={draft.duration} onChange={e => set('duration', e.target.value)} placeholder="1 hour" />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>EXAMINER / TEACHER</FieldLabel>
                    <input style={INPUT} value={draft.examiner} onChange={e => set('examiner', e.target.value)} placeholder="WOW Sir" />
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
                          <button onClick={() => set('logoUrl', '')} style={{ fontSize: 10, color: 'rgba(255,80,80,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>remove</button>
                        </div>
                      ) : (
                        <button onClick={() => logoRef.current?.click()}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1.5px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.35)', fontSize: 11, cursor: 'pointer' }}>
                          <Upload size={18} strokeWidth={1.5} />Upload logo
                        </button>
                      )}
                      <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
                    </div>
                  </div>
                </div>

                <div style={CARD}>
                  <SectionTitle icon={AlignLeft}>Instructions & Messages</SectionTitle>
                  <div style={{ marginBottom: 10 }}>
                    <FieldLabel>PAPER INSTRUCTION</FieldLabel>
                    <textarea value={draft.instructions} onChange={e => set('instructions', e.target.value)}
                      rows={2} style={{ ...INPUT, resize: 'vertical', lineHeight: 1.6 }} />
                  </div>
                  <div>
                    <FieldLabel>END OF PAPER MESSAGE</FieldLabel>
                    <input style={INPUT} value={draft.endMessage} onChange={e => set('endMessage', e.target.value)} placeholder="— All the best! —" />
                  </div>
                </div>

                {/* Cover page section */}
                <div style={CARD}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <SectionTitle icon={FileText}>Cover Page</SectionTitle>
                    <Toggle on={draft.showCoverPage} onToggle={() => set('showCoverPage', !draft.showCoverPage)} label="Show cover page" />
                  </div>

                  {draft.showCoverPage && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                          <FieldLabel>EXAM TYPE</FieldLabel>
                          <select value={EXAM_TYPES.includes(draft.examType) ? draft.examType : '__custom__'}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '__custom__') return;
                              set('examType', val);
                              set('coverInstructions', DEFAULT_COVER_INSTRUCTIONS[val] || DEFAULT_COVER_INSTRUCTIONS['default']);
                            }}
                            style={{ ...INPUT, cursor: 'pointer' }}>
                            <option value="">— same as assessment type —</option>
                            {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            {draft.examType && !EXAM_TYPES.includes(draft.examType) && <option value="__custom__">{draft.examType} (custom)</option>}
                          </select>
                        </div>
                        <div>
                          <FieldLabel>CUSTOM EXAM TYPE</FieldLabel>
                          <input style={INPUT} value={draft.examType} onChange={e => set('examType', e.target.value)} placeholder="e.g. Practical Exam" />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                          <FieldLabel>PRACTICAL MARKS</FieldLabel>
                          <input type="number" min={0} style={INPUT} value={draft.practicalMarks} onChange={e => set('practicalMarks', parseInt(e.target.value) || 0)} placeholder="0" />
                        </div>
                        <div>
                          <FieldLabel>THEORY MARKS</FieldLabel>
                          <input type="number" min={0} style={INPUT} value={draft.theoryMarks} onChange={e => set('theoryMarks', parseInt(e.target.value) || 0)} placeholder="0" />
                        </div>
                        <div>
                          <FieldLabel>TOTAL MARKS</FieldLabel>
                          <input type="number" min={0} style={INPUT} value={draft.totalMarks} onChange={e => set('totalMarks', parseInt(e.target.value) || 0)} placeholder="auto" />
                        </div>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <Toggle on={draft.invigilatorField} onToggle={() => set('invigilatorField', !draft.invigilatorField)} label="Show invigilator's signature line" />
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                          <FieldLabel>COVER INSTRUCTIONS (one per line → bullet)</FieldLabel>
                          <button type="button"
                            onClick={() => set('coverInstructions', DEFAULT_COVER_INSTRUCTIONS[draft.examType] || DEFAULT_COVER_INSTRUCTIONS['default'])}
                            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            ↺ Reset to defaults
                          </button>
                        </div>
                        <textarea value={draft.coverInstructions} onChange={e => set('coverInstructions', e.target.value)}
                          rows={6} placeholder={'Write clearly and legibly.\nAnswer all questions unless otherwise instructed.\nDo not write in the margins.'}
                          style={{ ...INPUT, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }} />
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
                          Edit freely — selecting a preset exam type above will auto-fill these with tailored instructions.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* SECTIONS tab */}
            {activeTab === 'sections' && (
              <>
                {draft.sections.map((sec, si) => (
                  <SectionEditor key={sec.id} sec={sec} index={si}
                    onChange={updateSection}
                    onRemove={() => removeSection(sec.id)}
                    onAddQuestion={() => addQuestion(sec.id)}
                    onUpdateQuestion={q => updateQuestion(sec.id, q)}
                    onRemoveQuestion={qId => removeQuestion(sec.id, qId)}
                    onImageUpload={handleImageUpload}
                    onShowBank={() => setBankTargetSection(sec.id)}
                  />
                ))}

                <button onClick={addSection}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 12, background: 'rgba(201,168,76,0.06)', border: '1.5px dashed rgba(201,168,76,0.25)', color: '#c9a84c', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
                  <Plus size={14} /> Add section (Section B, C…)
                </button>

                {totalQs > 0 && (
                  <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{totalQs} question{totalQs !== 1 ? 's' : ''} · {draft.sections.length} section{draft.sections.length !== 1 ? 's' : ''}</span>
                    <span style={{ color: '#c9a84c', fontWeight: 700 }}>{totalMarks} total marks</span>
                  </div>
                )}
              </>
            )}

            {/* FORMAT tab */}
            {activeTab === 'format' && (
              <>
                <div style={CARD}>
                  <SectionTitle icon={Type}>Typography</SectionTitle>
                  <div style={{ marginBottom: 12 }}>
                    <FieldLabel>HEADER FONT</FieldLabel>
                    <select value={draft.headerFont} onChange={e => set('headerFont', e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}>
                      {FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                    <div style={{ marginTop: 5, fontSize: 16, fontFamily: draft.headerFont, color: 'rgba(255,255,255,0.35)', padding: '5px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 7 }}>
                      DPS International Ghana
                    </div>
                  </div>
                  <div>
                    <FieldLabel>BODY / CONTENT FONT</FieldLabel>
                    <select value={draft.bodyFont} onChange={e => set('bodyFont', e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}>
                      {FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                    <div style={{ marginTop: 5, fontSize: 13, fontFamily: draft.bodyFont, color: 'rgba(255,255,255,0.35)', padding: '5px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 7 }}>
                      1. The CPU stands for Central ___ Unit.
                    </div>
                  </div>

                  <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <FieldLabel>HEADER SIZE (pt)</FieldLabel>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="range" min={9} max={20} value={draft.headerFontSize}
                          onChange={e => set('headerFontSize', Number(e.target.value))}
                          style={{ flex: 1, accentColor: '#c9a84c' }} />
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', minWidth: 24, textAlign: 'right' }}>{draft.headerFontSize}</span>
                      </div>
                    </div>
                    <div>
                      <FieldLabel>BODY SIZE (pt)</FieldLabel>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="range" min={7} max={16} value={draft.bodyFontSize}
                          onChange={e => set('bodyFontSize', Number(e.target.value))}
                          style={{ flex: 1, accentColor: '#c9a84c' }} />
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', minWidth: 24, textAlign: 'right' }}>{draft.bodyFontSize}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={CARD}>
                  <SectionTitle icon={Layout}>Page Border</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {BORDER_STYLES.map(b => (
                      <button key={b.id} onClick={() => set('borderStyle', b.id as AssessmentDraft['borderStyle'])}
                        style={{ padding: '11px', borderRadius: 10, cursor: 'pointer', background: draft.borderStyle === b.id ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${draft.borderStyle === b.id ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`, color: draft.borderStyle === b.id ? '#c9a84c' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={CARD}>
                  <SectionTitle icon={FileText}>Footer & Page Numbers</SectionTitle>
                  <div style={{ marginBottom: 10 }}>
                    <FieldLabel>FOOTER TEXT</FieldLabel>
                    <input style={INPUT} value={draft.footerText} onChange={e => set('footerText', e.target.value)} placeholder="e.g. By WOW Sir, Nana Sir" />
                  </div>
                  <Toggle on={draft.showPageNumbers} onToggle={() => set('showPageNumbers', !draft.showPageNumbers)} label="Show page numbers" />
                </div>

                <div style={{ ...CARD, marginBottom: 0 }}>
                  <button onClick={() => window.print()}
                    style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    🖨 Print / Save as PDF
                  </button>
                </div>
              </>
            )}
          </div>

          {/* live preview */}
          <div style={{ flex: 1, minWidth: 0, position: 'sticky', top: 55, height: 'calc(100vh - 55px)', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', borderLeft: '1px solid rgba(255,255,255,0.07)', padding: '16px 18px 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Eye size={11} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em', fontWeight: 600 }}>LIVE PREVIEW</span>
              </div>
              <button onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}>
                🖨 Print / PDF
              </button>
            </div>
            <ScaledPreview draft={draft} />
          </div>
        </div>
      </div>

      {bankTargetSection && (
        <BankImportModal
          onClose={() => setBankTargetSection(null)}
          onImport={qs => { importToSection(bankTargetSection, qs); setBankTargetSection(null); }}
        />
      )}
    </>
  );
}
