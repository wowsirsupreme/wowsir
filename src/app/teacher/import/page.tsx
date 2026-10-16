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
// Template CSV — all supported question types + valid topicKeys for every grade
// ---------------------------------------------------------------------------
// ANSWER FORMAT BY TYPE:
//   mcq         — 0-based index of correct option (0=A, 1=B, 2=C, 3=D)
//   truefalse   — "true" or "false" (case-insensitive; leave optionA-D blank)
//   shortanswer — expected keyword / phrase; graded case-insensitively (leave optionA-D blank)
//   fillinblank — missing word/phrase; use ___ in the question text (leave optionA-D blank)
//   matching    — pipe-separated RIGHT-side labels in the same order as optionA-D
//                 e.g. "Router|Switch|Hub|Modem" means A→Router B→Switch C→Hub D→Modem
//   ordering    — pipe-separated 0-based indices giving the correct sequence
//                 e.g. "2|0|3|1" means optC, optA, optD, optB
//
// VALID topicKey VALUES (copy exactly — wrong keys will be rejected):
//
// Grade 4 Computing:
//   gr4-ch1-peripherals  gr4-ch2-logo  gr4-ch3-files  gr4-ch4-desktop
//   gr4-ch5-formatting   gr4-ch6-word  gr4-ch7-internet  gr4-ch8-ppt1  gr4-ch9-ppt2
//
// Grade 5 Computing:
//   gr5-ch1-history   gr5-ch2-storage   gr5-ch3-tables   gr5-ch4-pptanim
//   gr5-ch5-slideshow gr5-ch6-internet  gr5-ch7-multimedia
//   gr5-ch8-scratch1  gr5-ch9-scratch2
//
// Grade 6 Computing:
//   gr6-ch1-robotics  gr6-ch2-mailmerge  gr6-ch3-email
//   gr6-ch4-excel1    gr6-ch5-excel2     gr6-ch6-excel3
//   gr6-ch7-algorithms gr6-ch8-scratch3  gr6-ch9-qb64
//
// Grade 7 Computing:
//   gr7-ch1-numbers       gr7-ch2-excel-calc   gr7-ch3-excel-data
//   gr7-ch4-excel-charts  gr7-ch5-internet     gr7-ch6-html1
//   gr7-ch7-html2         gr7-ch8-ai           gr7-ch9-qb64
//   gr7-ch10-python
//
// Grade 8 Computing:
//   gr8-ch1-ai         gr8-ch2-tech        gr8-ch3-access1
//   gr8-ch4-access2    gr8-ch5-access3     gr8-ch6-networks
//   gr8-ch7-google     gr8-ch8-malware     gr8-ch9-html-tables
//   gr8-ch10-social    gr8-ch11-troubleshoot  gr8-ch12-python
//
// Grade 9 CS IGCSE 0478:
//   gr9-cpu  gr9-fde  gr9-embedded  gr9-storage  gr9-os
//   gr9-languages  gr9-internet  gr9-logic
//   gr9-data-binary  gr9-data-twos  gr9-data-text
//   gr9-data-sound   gr9-data-images  gr9-data-compression
//   gr9-networking   gr9-programming
//
// Grade 9 DT IGCSE 0445:
//   gr9dt-influences  gr9dt-design-brief  gr9dt-developing  gr9dt-plan
//   gr9dt-evaluation  gr9dt-communication  gr9dt-making
//   gr9dt-materials   gr9dt-manufacturing  gr9dt-health-safety
//   gr9dt-structures  gr9dt-mechanisms
//
// Grade 10 CS IGCSE 0478:
//   gr10-data-integrity  gr10-cybersecurity  gr10-encryption
//   gr10-sensors  gr10-robotics  gr10-ai  gr10-quantum
//   gr10-abstraction  gr10-algorithms  gr10-programming  gr10-sql
//
// Grade 11 CS A-Level 9618:
//   gr11-information  gr11-communication  gr11-hardware  gr11-processor
//   gr11-system-software  gr11-security  gr11-ai-advanced
//   gr11-programming  gr11-oop  gr11-algorithms  gr11-databases
// ---------------------------------------------------------------------------

const TEMPLATE_HEADERS = 'id,topicKey,type,text,optionA,optionB,optionC,optionD,answer,explanation,difficulty,points,chapter,imageUrl';

const TEMPLATE_ROWS = [
  // ── Grade 4 ──────────────────────────────────────────────────────────────
  'gr4-ch1-q001,gr4-ch1-peripherals,mcq,Which of these is an OUTPUT device?,Keyboard,Mouse,Monitor,Scanner,2,A monitor displays output from the computer.,easy,1,1,',
  // ── Grade 5 ──────────────────────────────────────────────────────────────
  'gr5-ch2-q001,gr5-ch2-storage,mcq,Which storage medium uses laser light to read data?,Hard disk,USB drive,CD-ROM,RAM,2,CDs use a laser to read the pits and lands on the disc surface.,easy,1,2,',
  // ── Grade 6 ──────────────────────────────────────────────────────────────
  'gr6-ch4-q001,gr6-ch4-excel1,mcq,Which Excel function adds all numbers in a range?,COUNT,SUM,AVERAGE,MAX,1,SUM adds up all the values in the selected range.,easy,1,4,',
  // ── Grade 7 — MCQ ────────────────────────────────────────────────────────
  'gr7-ch1-q001,gr7-ch1-numbers,mcq,What is the denary value of binary 1010?,8,10,12,14,1,1×8 + 0×4 + 1×2 + 0×1 = 10.,easy,1,1,',
  // ── Grade 7 — True/False (leave optionA-D blank) ─────────────────────────
  'gr7-ch4-q001,gr7-ch4-excel-charts,truefalse,A pie chart is best for showing changes over time.,,,,,false,Pie charts show proportions of a whole — use a line chart for trends.,easy,1,4,',
  // ── Grade 7 — Short Answer ───────────────────────────────────────────────
  'gr7-ch6-q001,gr7-ch6-html1,shortanswer,What HTML tag creates the largest heading?,,,,, h1,The <h1> tag defines the most important heading on a page.,easy,1,6,',
  // ── Grade 7 — Fill-in-the-blank (use ___ for the missing word) ───────────
  'gr7-ch10-q001,gr7-ch10-python,fillinblank,In Python the ___ keyword starts a conditional statement.,,,,,if,if is the keyword used to begin a conditional statement in Python.,easy,1,10,',
  // ── Grade 8 — Matching ───────────────────────────────────────────────────
  // optionA-D are LEFT-side items; answer gives the matching RIGHT-side labels pipe-separated
  'gr8-ch8-q001,gr8-ch8-malware,matching,Match each malware type to its behaviour.,Self-replicates via email attachments,Disguises itself as useful software,Silently records keystrokes,Locks files and demands payment,Virus|Trojan horse|Spyware|Ransomware,Each malware type has a distinct attack method.,medium,2,8,',
  // ── Grade 8 — Ordering ───────────────────────────────────────────────────
  // answer gives the correct sequence as pipe-separated 0-based indices of optionA-D
  'gr8-ch3-q001,gr8-ch3-access1,ordering,Place the database design steps in the correct order.,Define the fields,Create the table,Set the primary key,Enter records,0|2|1|3,You define fields first then choose a primary key before creating the table and finally entering data.,medium,2,3,',
  // ── Grade 9 CS IGCSE — with image example ────────────────────────────────
  // imageUrl column (col 14): paste a full https:// URL to attach an image to the question
  'gr9-cpu-q001,gr9-cpu,mcq,Which component temporarily holds data the CPU is using?,Hard disk,ROM,RAM,SSD,2,RAM is volatile memory that holds data the CPU is actively processing.,medium,1,0,',
  'gr9-cpu-q002,gr9-cpu,mcq,Identify the component highlighted in the diagram.,CPU,RAM,GPU,HDD,0,The highlighted chip is the CPU — the central processing unit.,medium,1,0,https://res.cloudinary.com/example/image/upload/cpu-diagram.jpg',
  // ── Grade 9 DT IGCSE ─────────────────────────────────────────────────────
  'gr9dt-materials-q001,gr9dt-materials,mcq,Which material property describes resistance to scratching?,Toughness,Hardness,Elasticity,Conductivity,1,Hardness means resistance to indentation or scratching.,easy,1,0,',
  // ── Grade 10 CS IGCSE ────────────────────────────────────────────────────
  'gr10-cybersec-q001,gr10-cybersecurity,mcq,What does a firewall primarily do?,Speeds up the network,Blocks unauthorised network access,Encrypts stored files,Backs up data automatically,1,A firewall monitors and filters incoming and outgoing network traffic.,medium,1,0,',
  // ── Grade 11 CS A-Level ──────────────────────────────────────────────────
  'gr11-oop-q001,gr11-oop,mcq,Which OOP concept hides internal implementation details?,Inheritance,Polymorphism,Encapsulation,Abstraction,2,Encapsulation bundles data and methods and restricts direct access to object internals.,medium,2,0,',
];

const TEMPLATE_CSV = TEMPLATE_HEADERS + '\n' + TEMPLATE_ROWS.join('\n');

// ---------------------------------------------------------------------------
// topicKey auto-remap — old CSV keys → canonical app keys
// Teachers who export from the generated bank will have the old keys;
// this makes import work without manual editing.
// ---------------------------------------------------------------------------
const TOPIC_REMAP: Record<string, string> = {
  // Grade 5
  'gr5-computer-evolution': 'gr5-ch1-history',
  'gr5-storage-media':      'gr5-ch2-storage',
  // Grade 8
  'gr8-artificial-intelligence': 'gr8-ch1-ai',
  'gr8-technology-trends':       'gr8-ch2-tech',
  // Grade 9 CS
  'gr9-cs-cpu-architecture':       'gr9-cpu',
  'gr9-cs-data-storage':           'gr9-storage',
  'gr9-cs-os-accounts-security':   'gr9-os',
  'gr9-cs-os-file-management':     'gr9-os',
  'gr9-cs-os-interrupts':          'gr9-os',
  'gr9-cs-os-memory-management':   'gr9-os',
  'gr9-cs-os-peripherals-drivers': 'gr9-os',
  'gr9-cs-os-process-management':  'gr9-os',
  'gr9-cs-os-purpose':             'gr9-os',
  // Grade 9 DT
  'gr9-dt-defining':             'gr9dt-design-brief',
  'gr9-dt-developing':           'gr9dt-developing',
  'gr9-dt-identifying':          'gr9dt-design1',
  'gr9-dt-influences-designing': 'gr9dt-influences',
  'gr9-dt-proposing':            'gr9dt-plan',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ParsedRow = { ok: boolean; row: number; data?: Omit<Question, 'id'>; error?: string };

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------
const VALID_TYPES = new Set<string>(['mcq', 'truefalse', 'shortanswer', 'fillinblank', 'matching', 'ordering']);

export interface ParseMeta { remapped: number; }

function parseCSV(text: string): { rows: ParsedRow[]; meta: ParseMeta } {
  const rows = _parseCSVRows(text);
  const remapped = rows.filter(r => r.ok && (r as ParsedRow & { remappedKey?: boolean }).remappedKey).length;
  return { rows, meta: { remapped } };
}

function _parseCSVRows(text: string): ParsedRow[] {
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
      answer, explanation, difficulty, pointsStr, chapterStr, imageUrlRaw,
    ] = cols;

    const type = rawType?.trim().toLowerCase();

    if (!id?.trim() || !topicKey?.trim() || !text?.trim() || !answer?.trim()) {
      results.push({ ok: false, row: i + 1, error: 'Missing required field (id, topicKey, text or answer)' });
      continue;
    }

    // Auto-remap legacy topicKeys
    const rawTopicKey = topicKey.trim();
    const resolvedTopicKey = TOPIC_REMAP[rawTopicKey] ?? rawTopicKey;
    const wasRemapped = resolvedTopicKey !== rawTopicKey;

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
        // Accept: A/B/C/D, 1/2/3/4 (1-based), 0/1/2/3 (0-based)
        let idx: number;
        if (/^[a-dA-D]$/.test(parsedAnswer)) {
          idx = 'abcd'.indexOf(parsedAnswer.toLowerCase());
        } else {
          const n = parseInt(parsedAnswer, 10);
          if (isNaN(n)) {
            parseError = `MCQ answer must be A–D, 1–4, or 0–3, got "${parsedAnswer}"`;
            break;
          }
          // 1-based (1–4) → convert to 0-based
          idx = (n >= 1 && n <= 4) ? n - 1 : n;
        }
        if (idx < 0 || idx >= options.length) {
          parseError = `MCQ answer index ${idx} is out of range (0–${options.length - 1})`;
          break;
        }
        parsedAnswer = String(idx);
        break;
      }

      case 'truefalse': {
        options = ['True', 'False'];
        const norm = parsedAnswer.toLowerCase();
        if (norm.startsWith('t') || norm === '1' || norm === 'yes') {
          parsedAnswer = 'true';
        } else if (norm.startsWith('f') || norm === '0' || norm === 'no' || norm === '2') {
          parsedAnswer = 'false';
        } else {
          parseError = `True/False answer must be "True" or "False", got "${parsedAnswer}"`;
          break;
        }
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

    const row: ParsedRow & { remappedKey?: boolean } = {
      ok: true,
      row: i + 1,
      remappedKey: wasRemapped,
      data: {
        quizId: null,
        topicKey: resolvedTopicKey,
        type: type as Question['type'],
        text: text.trim(),
        options,
        answer: parsedAnswer,
        explanation: explanation?.trim() || '',
        difficulty: (['easy', 'medium', 'hard'].includes(difficulty?.trim()) ? difficulty.trim() : 'medium') as Question['difficulty'],
        points: parseInt(pointsStr?.trim() || '1', 10) || 1,
        chapter: parseInt(chapterStr?.trim() || '1', 10) || 1,
        ...(imageUrlRaw?.trim() ? { imageUrl: imageUrlRaw.trim() } : {}),
        approvalStatus: 'pending',
        source: 'imported' as const,
        createdAt: Date.now(),
      },
    };
    results.push(row);
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
  const [parseMeta, setParseMeta] = useState<ParseMeta | null>(null);
  const [filename, setFilename] = useState('');
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [autoApprove, setAutoApprove] = useState(false);

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
    reader.onload = async e => {
      const text = e.target?.result as string;

      // Standard WOW format
      const { rows, meta } = parseCSV(text);
      setParsed(rows);
      setParseMeta(meta);
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
        const finalSave = autoApprove
          ? toSave.map(q => ({ ...q, approvalStatus: 'approved' as const }))
          : toSave;
        await batchSaveQuestions(finalSave);
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
                  <strong style={{ color: 'rgba(255,255,255,0.7)' }}>pending</strong> unless you enable auto-approve below.
                  Exact duplicates are skipped automatically. Legacy topicKeys (e.g. <code style={{ fontSize: 11 }}>gr5-computer-evolution</code>) are remapped automatically.
                  Add an <code style={{ fontSize: 11 }}>imageUrl</code> column (col 14) with a full <code style={{ fontSize: 11 }}>https://</code> URL to attach an image to a question — leave it blank for text-only questions.
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

            {false && (
              <div style={{
                borderRadius: 10, background: 'rgba(56,189,248,0.07)',
                border: '1px solid rgba(56,189,248,0.25)', padding: '10px 14px',
                marginBottom: 12,
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <Info size={14} color="#38bdf8" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  <strong style={{ color: '#38bdf8' }}>Wayground format detected.</strong>
                  {' '}Importing Multiple Choice, Fill-in-the-Blank, and Open-Ended questions.
                  {null}
                </span>
              </div>
            )}

            {/* topicKey remap notice */}
            {parseMeta && parseMeta.remapped > 0 && (
              <div style={{
                borderRadius: 10, background: 'rgba(251,191,36,0.07)',
                border: '1px solid rgba(251,191,36,0.25)', padding: '10px 14px',
                marginBottom: 12,
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <Info size={14} color="#fbbf24" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  <strong style={{ color: '#fbbf24' }}>{parseMeta.remapped} topicKey{parseMeta.remapped !== 1 ? 's' : ''} auto-remapped</strong>
                  {' '}to canonical app keys (e.g. <code>gr9-cs-cpu-architecture</code> → <code>gr9-cpu</code>).
                  No action needed — they will import correctly.
                </span>
              </div>
            )}

            {/* Auto-approve toggle */}
            {!done && okCount > 0 && (
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 12, cursor: 'pointer',
                fontSize: 13, color: 'rgba(255,255,255,0.5)',
              }}>
                <span style={{
                  width: 36, height: 20, borderRadius: 10, position: 'relative',
                  background: autoApprove ? '#059669' : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${autoApprove ? '#059669' : 'rgba(255,255,255,0.15)'}`,
                  transition: 'background 0.2s',
                  flexShrink: 0,
                  display: 'inline-block',
                }}>
                  <input
                    type="checkbox"
                    checked={autoApprove}
                    onChange={e => setAutoApprove(e.target.checked)}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', top: 2, left: autoApprove ? 18 : 2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                  }} />
                </span>
                Auto-approve questions on import
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  (skip the approval queue — use for trusted curated content)
                </span>
              </label>
            )}

            {/* Import button / done state */}
            {done ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={40} color="#6ee7b7" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 16, color: '#6ee7b7', fontWeight: 600, marginBottom: 6 }}>Import complete!</p>
                {importedCount > 0 && (
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                    {importedCount} question{importedCount !== 1 ? 's' : ''} added as{' '}
                    <strong style={{ color: autoApprove ? '#34d399' : 'rgba(255,255,255,0.6)' }}>
                      {autoApprove ? 'approved' : 'pending'}
                    </strong>
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
