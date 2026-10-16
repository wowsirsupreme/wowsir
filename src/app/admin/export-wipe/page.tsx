'use client';

/**
 * Admin: Export all questions to CSV, then wipe Firestore questions.
 * Built-in static questions have already been removed from the TS data files.
 * This page handles the Firestore side.
 */

import { useState } from 'react';
import {
  collection, getDocs, doc, writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { getFirebaseInstances } from '@/lib/firebase/config';
import {
  gr4Questions, gr5Questions, gr6Questions, gr7Questions, gr8Questions,
  gr9csQuestions, gr9dtQuestions, gr10csQuestions, gr11csQuestions,
} from '@/data/grades';
import type { Question } from '@/types/question';

// ── CSV helpers ───────────────────────────────────────────────────────────────
const CSV_HEADERS = [
  'id', 'source', 'type', 'text',
  'option_a', 'option_b', 'option_c', 'option_d',
  'answer', 'explanation', 'difficulty', 'topic', 'tags',
  'imageUrl', 'points', 'quizId',
];

function cell(val: unknown): string {
  if (val == null) return '""';
  const s = String(val).replace(/"/g, '""');
  return `"${s}"`;
}

function questionToRow(q: Question & { source?: string }): string {
  const opts = Array.isArray(q.options) ? q.options : [];
  return [
    q.id ?? '',
    (q as { source?: string }).source ?? 'builtin',
    q.type ?? 'mcq',
    q.text ?? '',
    opts[0] ?? '',
    opts[1] ?? '',
    opts[2] ?? '',
    opts[3] ?? '',
    q.answer ?? '',
    q.explanation ?? '',
    q.difficulty ?? '',
    q.topicKey ?? '',
    Array.isArray(q.tags) ? q.tags.join(',') : (q.tags ?? ''),
    q.imageUrl ?? '',
    q.points ?? '',
    (q as { quizId?: string | null }).quizId ?? '',
  ].map(cell).join(',');
}

function makeCSV(questions: Array<Question & { source?: string }>): string {
  return [
    CSV_HEADERS.join(','),
    ...questions.map(questionToRow),
  ].join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Firestore helpers ─────────────────────────────────────────────────────────
async function getAllFirestoreQuestions(fsDb: Firestore): Promise<Array<Question & { source?: string }>> {
  const snap = await getDocs(collection(fsDb, 'questions'));
  return snap.docs.map(d => ({ ...(d.data() as Question), id: d.id, source: 'firestore' }));
}

async function wipeFirestoreQuestions(fsDb: Firestore, questions: Question[]): Promise<number> {
  const BATCH_SIZE = 500;
  let deleted = 0;
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = writeBatch(fsDb);
    const chunk = questions.slice(i, i + BATCH_SIZE);
    for (const q of chunk) {
      batch.delete(doc(fsDb, 'questions', q.id));
    }
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExportWipePage() {
  const [status, setStatus] = useState<string>('');
  const [step, setStep] = useState<'idle' | 'exporting' | 'done-export' | 'wiping' | 'done'>('idle');
  const [fsQuestions, setFsQuestions] = useState<Array<Question & { source?: string }> | null>(null);

  const builtinQuestions: Array<Question & { source: string }> = [
    ...gr4Questions, ...gr5Questions, ...gr6Questions, ...gr7Questions,
    ...gr8Questions, ...gr9csQuestions, ...gr9dtQuestions,
    ...gr10csQuestions, ...gr11csQuestions,
  ].map(q => ({ ...(q as Question), source: 'builtin' }));

  async function handleExport() {
    setStep('exporting');
    setStatus('Connecting to Firestore…');
    try {
      const { fs: fsDb } = getFirebaseInstances();
      if (!fsDb) throw new Error('Firebase not configured — check Firebase config in settings.');

      setStatus('Fetching Firestore questions…');
      const fsQs = await getAllFirestoreQuestions(fsDb);
      setFsQuestions(fsQs);

      const allQuestions = [...builtinQuestions, ...fsQs];
      setStatus(`Generating CSV for ${allQuestions.length} questions (${builtinQuestions.length} built-in + ${fsQs.length} Firestore)…`);

      const csv = makeCSV(allQuestions);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `wowquiz_all_questions_${date}.csv`);

      setStep('done-export');
      setStatus(`✅ CSV downloaded — ${allQuestions.length} questions total (${builtinQuestions.length} built-in + ${fsQs.length} Firestore). Built-in static questions have already been cleared from the codebase. Click "Wipe Firestore Questions" to delete the ${fsQs.length} Firestore questions.`);
    } catch (e) {
      setStep('idle');
      setStatus(`❌ Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleWipe() {
    if (!fsQuestions) return;
    const confirmed = window.confirm(
      `This will permanently delete ${fsQuestions.length} questions from Firestore. This CANNOT be undone.\n\nMake sure you downloaded the CSV first!\n\nProceed?`
    );
    if (!confirmed) return;

    setStep('wiping');
    setStatus(`Deleting ${fsQuestions.length} Firestore questions…`);
    try {
      const { fs: fsDb } = getFirebaseInstances();
      if (!fsDb) throw new Error('Firebase not configured.');

      const deleted = await wipeFirestoreQuestions(fsDb, fsQuestions);
      setStep('done');
      setStatus(`✅ Done! Deleted ${deleted} questions from Firestore. The question bank is now empty.`);
    } catch (e) {
      setStep('done-export');
      setStatus(`❌ Wipe failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const s: React.CSSProperties = {
    minHeight: '100vh',
    background: '#0f0f14',
    color: '#e2e8f0',
    fontFamily: 'system-ui, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  };

  const card: React.CSSProperties = {
    background: '#1a1a24',
    borderRadius: 16,
    padding: '40px 48px',
    maxWidth: 560,
    width: '100%',
    border: '1px solid rgba(255,255,255,0.08)',
  };

  const btn = (color: string, disabled?: boolean): React.CSSProperties => ({
    background: disabled ? '#333' : color,
    color: disabled ? '#666' : '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '14px 28px',
    fontSize: 15,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'opacity 0.15s',
    marginRight: 12,
    marginTop: 8,
  });

  return (
    <div style={s}>
      <div style={card}>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>
          🗑 Export &amp; Wipe Questions
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 32px', lineHeight: 1.6 }}>
          Step 1: Download a CSV of every question (built-in + Firestore).<br />
          Step 2: Permanently delete all Firestore questions.<br />
          <em>Note: Built-in static questions are already cleared from the codebase.</em>
        </p>

        <div>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 16px' }}>
            Built-in questions in codebase: <strong style={{ color: '#e2e8f0' }}>{builtinQuestions.length}</strong>
          </p>

          <button
            style={btn('#2563eb', step === 'exporting')}
            disabled={step === 'exporting' || step === 'wiping'}
            onClick={handleExport}
          >
            {step === 'exporting' ? 'Exporting…' : '⬇ Export CSV (Built-in + Firestore)'}
          </button>

          {(step === 'done-export' || step === 'wiping' || step === 'done') && fsQuestions && (
            <button
              style={btn('#dc2626', step === 'wiping' || step === 'done')}
              disabled={step === 'wiping' || step === 'done'}
              onClick={handleWipe}
            >
              {step === 'wiping' ? 'Deleting…' : step === 'done' ? '✅ Wiped' : `🗑 Wipe ${fsQuestions.length} Firestore Questions`}
            </button>
          )}
        </div>

        {status && (
          <div style={{
            marginTop: 24,
            padding: '16px 20px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10,
            fontSize: 13,
            lineHeight: 1.7,
            color: status.startsWith('❌') ? '#f87171' : '#94a3b8',
            border: `1px solid ${status.startsWith('✅') ? 'rgba(34,197,94,0.3)' : status.startsWith('❌') ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.06)'}`,
          }}>
            {status}
          </div>
        )}

        <p style={{ marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          Admin only — <a href="/admin" style={{ color: 'rgba(255,255,255,0.3)' }}>← Back to Admin</a>
        </p>
      </div>
    </div>
  );
}
