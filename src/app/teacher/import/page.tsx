'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FileDown, Upload, CheckCircle, AlertCircle, Info, SkipForward } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFirebase } from '@/hooks/useFirebase';
import { batchSaveQuestions, getExistingQuestionTexts } from '@/lib/firebase/questions';
import { useToast } from '@/components/ui/Toast';
import type { Question } from '@/types/question';

const BG = [
  'radial-gradient(ellipse 70% 50% at 20% 10%,  rgba(16,185,129,0.1) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 20%,  rgba(56,189,248,0.07) 0%, transparent 50%)',
  '#050814',
].join(',');

// ---------------------------------------------------------------------------
// Template CSV — all supported question types with answer-format instructions
// ---------------------------------------------------------------------------
const TEMPLATE_HEADERS = 'id,topicKey,type,text,optionA,optionB,optionC,optionD,answer,explanation,difficulty,points,chapter';

const TEMPLATE_ROWS = [
  // MCQ — answer is the 0-based index of the correct option
  'gr7-ch1-q001,gr7-networks,mcq,What does LAN stand for?,Local Area Network,Long Area Network,Large Area Network,Light Area Network,0,LAN means Local Area Network — it connects devices in one building,easy,1,1',
  // True/False — answer is "true" or "false" (case-insensitive)
  'gr7-ch1-q002,gr7-networks,truefalse,The Internet is a Wide Area Network (WAN).,,,,,true,The Internet spans the whole globe — it is the largest WAN.,easy,1,1',
  // Short answer — answer is the expected keyword/phrase (case-insensitive match during grading)
  'gr7-ch1-q003,gr7-networks,shortanswer,What device connects a home network to the Internet?,,,,, router,A router directs traffic between your local network and the Internet.,medium,2,1',
  // Fill-in-the-blank — use ___ in the question text; answer is the missing word/phrase
  'gr7-ch1-q004,gr7-networks,fillinblank,A ___ address uniquely identifies every device on a network.,,,,,IP,Every device on a network has a unique IP (Internet Protocol) address.,medium,2,1',
  // Matching — optionA..D are the LEFT-side items; answer encodes RIGHT-side items as pipe-separated list in matching order
  // e.g. answer = "Router|Switch|Hub|Modem" means A→Router B→Switch C→Hub D→Modem
  'gr7-ch1-q005,gr7-networks,matching,Match each device to its function.,Directs packets between networks,Connects devices in a LAN,Broadcasts to all ports,Connects LAN to ISP,Router|Switch|Hub|Modem,Match each networking device to its primary function.,hard,3,1',
  // Ordering — optionA..D are the items; answer encodes the correct order as pipe-separated 0-based indices
  // e.g. answer = "2|0|3|1" means the correct sequence is optC, optA, optD, optB
  'gr7-ch1-q006,gr7-networks,ordering,Order the OSI layers from lowest to highest.,Physical,Application,Transport,Network,0|3|2|1,OSI layers bottom-up: Physical — Network — Transport — Application (and more above).,hard,3,1',
];

const TEMPLATE_CSV = TEMPLATE_HEADERS + '\n' + TEMPLATE_ROWS.join('\n');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ParsedRow = { ok: boolean; row: number; data?: Omit<Question, 'id'>; error?: string };

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------
const VALID_TYPES = new Set<string>(['mcq', 'truefalse', 'shortanswer', 'fillinblank', 'matching', 'ordering']);

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [{ ok: false, row: 0, error: 'File is empty or has no data rows' }];

  // Strip the header row — we don't validate column names to stay lenient
  const results: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r/g, '');
    if (!line.trim()) continue;

    // Basic CSV split — no embedded-comma support (quoted fields not handled)
    const cols = line.split(',');
    if (cols.length < 9) {
      results.push({ ok: false, row: i + 1, error: `Only ${cols.length} columns (need at least 9)` });
      continue;
    }

    const [
      id, topicKey, rawType, text,
      optA, optB, optC, optD,
      answer, explanation, difficulty, pointsStr, chapterStr,
    ] = cols;

    const type = rawType?.trim().toLowerCase();

    if (!id?.trim() || !topicKey?.trim() || !text?.trim() || !answer?.trim()) {
      results.push({ ok: false, row: i + 1, error: 'Missing required field (id, topicKey, text or answer)' });
      continue;
    }

    if (!VALID_TYPES.has(type)) {
      results.push({
        ok: false, row: i + 1,
        error: `Unknown type "${type}" — use: mcq, truefalse, shortanswer, fillinblank, matching, ordering`,
      });
      continue;
    }

    let options: string[] = [];
    let parsedAnswer: string = answer.trim();
    let parseError: string | null = null;

    switch (type) {
      case 'mcq': {
        options = [optA, optB, optC, optD].map(o => o?.trim()).filter(Boolean);
        if (options.length < 2) {
          parseError = 'MCQ needs at least 2 options (optionA–optionD)';
          break;
        }
        const idx = parseInt(parsedAnswer, 10);
        if (isNaN(idx) || idx < 0 || idx >= options.length) {
          parseError = `MCQ answer must be a 0-based index (0–${options.length - 1}), got "${parsedAnswer}"`;
          break;
        }
        parsedAnswer = String(idx);
        break;
      }

      case 'truefalse': {
        options = ['True', 'False'];
        const norm = parsedAnswer.toLowerCase();
        if (norm !== 'true' && norm !== 'false') {
          parseError = `True/False answer must be "true" or "false", got "${parsedAnswer}"`;
          break;
        }
        parsedAnswer = norm; // normalise to lowercase
        break;
      }

      case 'shortanswer':
      case 'fillinblank': {
        // No options — answer is the expected text
        options = [];
        if (!parsedAnswer) parseError = 'Short-answer/fill-in-the-blank requires a non-empty answer';
        break;
      }

      case 'matching': {
        options = [optA, optB, optC, optD].map(o => o?.trim()).filter(Boolean);
        if (options.length < 2) {
          parseError = 'Matching needs at least 2 options (optionA–optionD for the left column)';
          break;
        }
        // answer is pipe-separated right-column values in matching order
        const pairs = parsedAnswer.split('|').map(s => s.trim()).filter(Boolean);
        if (pairs.length !== options.length) {
          parseError = `Matching answer must have ${options.length} pipe-separated values, got ${pairs.length}`;
          break;
        }
        parsedAnswer = pairs.join('|');
        break;
      }

      case 'ordering': {
        options = [optA, optB, optC, optD].map(o => o?.trim()).filter(Boolean);
        if (options.length < 2) {
          parseError = 'Ordering needs at least 2 options (optionA–optionD)';
          break;
        }
        // answer is pipe-separated 0-based indices representing the correct order
        const indices = parsedAnswer.split('|').map(s => parseInt(s.trim(), 10));
        if (
          indices.length !== options.length ||
          indices.some(n => isNaN(n) || n < 0 || n >= options.length)
        ) {
          parseError = `Ordering answer must be ${options.length} pipe-separated 0-based indices, e.g. "2|0|3|1"`;
          break;
        }
        // Check it's a valid permutation
        if (new Set(indices).size !== options.length) {
          parseError = 'Ordering answer indices must be a permutation with no repeats';
          break;
        }
        parsedAnswer = indices.join('|');
        break;
      }
    }

    if (parseError) {
      results.push({ ok: false, row: i + 1, error: parseError });
      continue;
    }

    results.push({
      ok: true,
      row: i + 1,
      data: {
        quizId: null,
        topicKey: topicKey.trim(),
        type: type as Question['type'],
        text: text.trim(),
        options,
        answer: parsedAnswer,
        explanation: explanation?.trim() || '',
        difficulty: (['easy', 'medium', 'hard'].includes(difficulty?.trim()) ? difficulty.trim() : 'medium') as Question['difficulty'],
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
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
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

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
    setImportedCount(0);
    setSkippedCount(0);
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
      // Collect unique topic keys in this batch
      const topicKeys = [...new Set(valid.map(q => q.topicKey))];

      // Fetch normalised texts already in the bank (approved + pending) for these topics
      const existingTexts = await getExistingQuestionTexts(topicKeys);

      // Deduplicate
      const toSave: Omit<Question, 'id'>[] = [];
      let skipped = 0;
      for (const q of valid) {
        const norm = q.text.toLowerCase().replace(/\s+/g, ' ').trim();
        if (existingTexts.has(norm)) {
          skipped++;
        } else {
          toSave.push(q);
          // Add to set so intra-batch duplicates are also caught
          existingTexts.add(norm);
        }
      }

      if (toSave.length > 0) {
        await batchSaveQuestions(toSave);
      }

      setImportedCount(toSave.length);
      setSkippedCount(skipped);
      setDone(true);

      const msg = toSave.length > 0
        ? `Imported ${toSave.length} question${toSave.length !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped)` : ''}`
        : `All ${skipped} question${skipped !== 1 ? 's' : ''} already exist — nothing imported`;
      toast(msg, toSave.length > 0 ? 'success' : 'error');
    } catch (e) {
      console.error('Import error:', e);
      toast('Import failed — check console for details', 'error');
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
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
        <div style={{ borderRadius: 14, padding: '16px 20px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
              <Info size={16} color="#7dd3fc" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 8 }}>
                  Download the template to see answer formats for all 6 question types. New questions start as{' '}
                  <strong style={{ color: 'rgba(255,255,255,0.7)' }}>pending</strong> — approve them in the Question Bank.
                  Exact duplicates are skipped automatically.
                </p>
                {/* Type legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                  {[
                    { type: 'mcq', label: 'MCQ', hint: 'answer = option index (0-based)' },
                    { type: 'truefalse', label: 'True/False', hint: 'answer = true or false' },
                    { type: 'shortanswer', label: 'Short Answer', hint: 'answer = expected keyword' },
                    { type: 'fillinblank', label: 'Fill in Blank', hint: 'use ___ in question text' },
                    { type: 'matching', label: 'Matching', hint: 'answer = right-side values joined by |' },
                    { type: 'ordering', label: 'Ordering', hint: 'answer = correct index order joined by |' },
                  ].map(({ type, label, hint }) => (
                    <span key={type} style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: '#6ee7b7' }}>{label}</span>: {hint}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={downloadTemplate}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(56,189,248,0.12)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.25)', flexShrink: 0 }}
            >
              <FileDown size={14} /> Template
            </button>
          </div>
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
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>parse errors</p>
                  </div>
                </div>
              )}
            </div>

            {/* Error rows */}
            {errCount > 0 && (
              <div style={{ borderRadius: 14, padding: '12px 16px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: '#f87171', fontWeight: 600, marginBottom: 8, fontFamily: 'var(--font-mono)' }}>PARSE ERRORS</p>
                {parsed.filter(r => !r.ok).map((r, i) => (
                  <p key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
                    Row {r.row}: {r.error}
                  </p>
                ))}
              </div>
            )}

            {/* Import button / done state */}
            {done ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={40} color="#6ee7b7" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 16, color: '#6ee7b7', fontWeight: 600, marginBottom: 6 }}>Import complete!</p>
                {importedCount > 0 && (
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                    {importedCount} question{importedCount !== 1 ? 's' : ''} added as <strong style={{ color: 'rgba(255,255,255,0.6)' }}>pending</strong>
                  </p>
                )}
                {skippedCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
                    <SkipForward size={14} color="rgba(255,255,255,0.3)" />
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
                      {skippedCount} duplicate{skippedCount !== 1 ? 's' : ''} skipped
                    </p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
                  <button onClick={() => router.push('/teacher/library')} className="btn-glass" style={{ fontSize: 14 }}>
                    View in Question Bank →
                  </button>
                  <button
                    onClick={() => { setParsed(null); setFilename(''); setDone(false); }}
                    style={{ fontSize: 14, padding: '10px 20px', borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                  >
                    Import another file
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={doImport}
                disabled={importing || okCount === 0}
                style={{
                  width: '100%', padding: '15px 0', borderRadius: 14, fontSize: 16, fontWeight: 700,
                  cursor: okCount === 0 ? 'not-allowed' : 'pointer',
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
                  <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Checking for duplicates &amp; importing…</>
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
