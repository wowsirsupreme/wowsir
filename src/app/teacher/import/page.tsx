'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FileDown, Upload, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFirebase } from '@/hooks/useFirebase';
import { batchSaveQuestions } from '@/lib/firebase/questions';
import { useToast } from '@/components/ui/Toast';
import type { Question } from '@/types/question';

const BG = [
  'radial-gradient(ellipse 70% 50% at 20% 10%,  rgba(16,185,129,0.1) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 20%,  rgba(56,189,248,0.07) 0%, transparent 50%)',
  '#050814',
].join(',');

const TEMPLATE_HEADERS = 'id,topicKey,type,text,optionA,optionB,optionC,optionD,answer,explanation,difficulty,points,chapter';
const TEMPLATE_EXAMPLE = 'gr7-ch1-custom-q001,gr7-networks,mcq,What does LAN stand for?,Local Area Network,Long Area Network,Large Area Network,Light Area Network,0,LAN means Local Area Network,easy,1,1';

type ParsedRow = { ok: boolean; row: number; data?: Omit<Question, 'id'>; error?: string };

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [{ ok: false, row: 0, error: 'File is empty or has no data rows' }];

  const header = lines[0].toLowerCase().replace(/\r/g, '');
  const results: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r/g, '');
    if (!line.trim()) continue;

    // Simple CSV split (no quoted commas support — keep it simple)
    const cols = line.split(',');
    if (cols.length < 9) {
      results.push({ ok: false, row: i + 1, error: `Only ${cols.length} columns (need at least 9)` });
      continue;
    }

    const [id, topicKey, type, text, optA, optB, optC, optD, answer, explanation, difficulty, pointsStr, chapterStr] = cols;

    if (!id || !topicKey || !text || !answer) {
      results.push({ ok: false, row: i + 1, error: 'Missing required field (id, topicKey, text or answer)' });
      continue;
    }

    const isTF = type?.trim() === 'truefalse';
    const options = isTF ? ['True', 'False'] : [optA, optB, optC, optD].map(o => o?.trim()).filter(Boolean);

    results.push({
      ok: true,
      row: i + 1,
      data: {
        quizId: null,
        topicKey: topicKey.trim(),
        type: isTF ? 'truefalse' : 'mcq',
        text: text.trim(),
        options,
        answer: answer.trim(),
        explanation: explanation?.trim() || '',
        difficulty: (difficulty?.trim() as Question['difficulty']) || 'medium',
        points: parseInt(pointsStr?.trim() || '1', 10) || 1,
        chapter: parseInt(chapterStr?.trim() || '1', 10) || 1,
        approvalStatus: 'pending',
        source: 'imported' as const,
        createdAt: Date.now(),
      },
    });
  }
  return results;
}

export default function ImportCSVPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, ready } = useAuth();
  const { configured } = useFirebase();
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [filename, setFilename] = useState('');
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  if (!ready) return null;
  if (!configured || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center">
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Sign in as a teacher to import questions.</p>
          <button onClick={() => router.push('/teacher')} className="btn-glass">Go to Teacher Login</button>
        </div>
      </div>
    );
  }

  function handleFile(file: File) {
    setFilename(file.name);
    setDone(false);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setParsed(parseCSV(text));
    };
    reader.readAsText(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function doImport() {
    if (!parsed) return;
    const valid = parsed.filter(r => r.ok && r.data).map(r => r.data!);
    if (valid.length === 0) { toast('No valid rows to import', 'error'); return; }

    setImporting(true);
    try {
      await batchSaveQuestions(valid);
      toast(`Imported ${valid.length} question${valid.length !== 1 ? 's' : ''}`, 'success');
      setDone(true);
    } catch (e) {
      toast('Import failed — check console', 'error');
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_HEADERS + '\n' + TEMPLATE_EXAMPLE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'wow-questions-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const okCount = parsed?.filter(r => r.ok).length ?? 0;
  const errCount = parsed?.filter(r => !r.ok).length ?? 0;

  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>
      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(5,8,20,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => router.push('/teacher')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={14} /> Teacher
          </button>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>IMPORT CSV</span>
          <div style={{ width: 80 }} />
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: '#fff', marginBottom: 6 }}>
            Import <span style={{ color: '#6ee7b7' }}>CSV</span>
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
            Upload a CSV file to bulk-add questions to the question bank
          </p>
        </div>

        {/* Template download */}
        <div style={{ borderRadius: 14, padding: '16px 20px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Info size={16} color="#7dd3fc" />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
              Download the template to see the expected format. New questions start as <strong style={{ color: 'rgba(255,255,255,0.7)' }}>pending</strong> — approve them in the Question Bank.
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(56,189,248,0.12)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.25)', flexShrink: 0 }}
          >
            <FileDown size={14} /> Template
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          style={{
            borderRadius: 20, padding: '48px 24px',
            border: '2px dashed rgba(16,185,129,0.25)',
            background: 'rgba(16,185,129,0.04)',
            textAlign: 'center', cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
            marginBottom: 24,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.45)'; (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.25)'; (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.04)'; }}
        >
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <Upload size={36} color="rgba(110,231,183,0.6)" strokeWidth={1.5} style={{ margin: '0 auto 12px' }} />
          {filename ? (
            <p style={{ fontSize: 15, color: '#6ee7b7', fontWeight: 600 }}>{filename}</p>
          ) : (
            <>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Drop your CSV here or click to browse</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>.csv files only</p>
            </>
          )}
        </div>

        {/* Parse results */}
        {parsed && (
          <div style={{ marginBottom: 24 }}>
            {/* Summary */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, borderRadius: 12, padding: '14px 18px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={18} color="#6ee7b7" />
                <div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#6ee7b7' }}>{okCount}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>valid rows</p>
                </div>
              </div>
              {errCount > 0 && (
                <div style={{ flex: 1, borderRadius: 12, padding: '14px 18px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertCircle size={18} color="#f87171" />
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#f87171' }}>{errCount}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>errors</p>
                  </div>
                </div>
              )}
            </div>

            {/* Error rows */}
            {errCount > 0 && (
              <div style={{ borderRadius: 14, padding: '12px 16px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: '#f87171', fontWeight: 600, marginBottom: 8, fontFamily: 'var(--font-mono)' }}>ERRORS</p>
                {parsed.filter(r => !r.ok).map((r, i) => (
                  <p key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
                    Row {r.row}: {r.error}
                  </p>
                ))}
              </div>
            )}

            {/* Import button */}
            {done ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={40} color="#6ee7b7" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 16, color: '#6ee7b7', fontWeight: 600, marginBottom: 16 }}>Import complete!</p>
                <button onClick={() => router.push('/teacher/library')} className="btn-glass" style={{ fontSize: 14 }}>
                  View in Question Bank →
                </button>
              </div>
            ) : (
              <button
                onClick={doImport}
                disabled={importing || okCount === 0}
                style={{
                  width: '100%', padding: '15px 0', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: okCount === 0 ? 'not-allowed' : 'pointer',
                  background: okCount === 0 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: okCount === 0 ? 'rgba(255,255,255,0.3)' : '#fff',
                  border: 'none',
                  boxShadow: okCount > 0 ? '0 4px 20px rgba(16,185,129,0.3)' : 'none',
                  transition: 'opacity 0.15s',
                  opacity: importing ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {importing ? (
                  <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing…</>
                ) : (
                  <><Upload size={16} /> Import {okCount} Question{okCount !== 1 ? 's' : ''}</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
