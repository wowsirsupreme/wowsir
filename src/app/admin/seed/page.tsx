'use client';

/**
 * /admin/seed  — One-time bulk seeder for the 1800-question bank.
 *
 * Uses setDoc with the question's own ID as the document key so the
 * operation is fully idempotent: re-running it only overwrites existing
 * docs that haven't been teacher-modified (teacherModified !== true).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Database, CheckCircle, AlertCircle, Loader2, Play } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/hooks/useFirebase';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseInstances } from '@/lib/firebase/config';
import type { Question } from '@/types/question';

const BG = [
  'radial-gradient(ellipse 70% 50% at 20% 10%, rgba(16,185,129,0.09) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 20%, rgba(56,189,248,0.06) 0%, transparent 50%)',
  '#050814',
].join(',');

type Phase = 'idle' | 'loading' | 'running' | 'done' | 'error';

export default function SeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { configured } = useFirebase();

  const [phase, setPhase]       = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [total, setTotal]       = useState(0);
  const [skipped, setSkipped]   = useState(0);
  const [written, setWritten]   = useState(0);
  const [errors, setErrors]     = useState<string[]>([]);
  const [log, setLog]           = useState<string[]>([]);

  function addLog(msg: string) {
    setLog(prev => [...prev.slice(-19), msg]); // keep last 20 lines
  }

  async function runSeed(mode: 'new-only' | 'overwrite-all') {
    const { fs } = getFirebaseInstances();
    if (!fs || !user) { alert('Not authenticated or Firestore not ready'); return; }

    setPhase('loading');
    setErrors([]);
    setLog([]);
    setProgress(0);
    setSkipped(0);
    setWritten(0);

    let questions: Question[];
    try {
      const res = await fetch('/seed/questions.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      questions = await res.json() as Question[];
    } catch (e) {
      setErrors([`Failed to load seed file: ${e}`]);
      setPhase('error');
      return;
    }

    setTotal(questions.length);
    setPhase('running');
    addLog(`Loaded ${questions.length} questions — mode: ${mode}`);

    const BATCH = 50; // write 50 at a time to avoid Firestore 500-op limit
    let writtenCount = 0;
    let skippedCount = 0;
    const errList: string[] = [];

    for (let i = 0; i < questions.length; i += BATCH) {
      const chunk = questions.slice(i, i + BATCH);

      const writes: Promise<void>[] = chunk.map(async q => {
        try {
          const ref = doc(fs, 'questions', q.id);

          if (mode === 'new-only') {
            // Skip if doc already exists
            const existing = await getDoc(ref);
            if (existing.exists()) {
              skippedCount++;
              return;
            }
          }

          // Skip questions the teacher has manually edited
          if (mode === 'overwrite-all') {
            const existing = await getDoc(ref);
            if (existing.exists() && existing.data()?.teacherModified === true) {
              skippedCount++;
              return;
            }
          }

          await setDoc(ref, { ...q, id: q.id });
          writtenCount++;
        } catch (err) {
          errList.push(`${q.id}: ${err}`);
        }
      });

      await Promise.all(writes);

      setProgress(Math.min(i + BATCH, questions.length));
      setWritten(writtenCount);
      setSkipped(skippedCount);

      if (i % 200 === 0) {
        addLog(`✓ ${writtenCount} written, ${skippedCount} skipped (${i + BATCH}/${questions.length})`);
      }
    }

    setErrors(errList);
    addLog(`Done. ${writtenCount} written, ${skippedCount} skipped, ${errList.length} errors.`);
    setPhase('done');
  }

  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)', background: 'rgba(5,8,20,0.6)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => router.push('/admin')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#34d399')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          <ChevronLeft size={16} /> Admin
        </button>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
        <Database size={15} color="#34d399" />
        <span style={{ fontSize: 14, fontWeight: 600 }}>Bulk Seed Questions</span>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 20px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#fff' }}>
            Seed 1 800 Questions
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            Imports the pre-built question bank into Firestore. Questions are stored
            with their original IDs so re-running is safe — existing questions are
            only overwritten if you choose&nbsp;<em>Overwrite All</em>.
          </p>
        </div>


        {/* Circular progress ring */}
        {(phase === 'running' || phase === 'done') && total > 0 && (() => {
          const R = 54;
          const circ = 2 * Math.PI * R;
          const fill = circ * (pct / 100);
          const ringColor = phase === 'done' ? '#34d399' : '#34d399';
          const trackColor = 'rgba(255,255,255,0.07)';
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 28 }}>
              {/* Ring */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <svg width={128} height={128} viewBox="0 0 128 128">
                  {/* Track */}
                  <circle
                    cx={64} cy={64} r={R}
                    fill="none"
                    stroke={trackColor}
                    strokeWidth={10}
                  />
                  {/* Fill */}
                  <circle
                    cx={64} cy={64} r={R}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={`${fill} ${circ - fill}`}
                    strokeDashoffset={circ * 0.25}   /* start at 12 o'clock */
                    style={{ transition: 'stroke-dasharray 0.4s ease' }}
                  />
                  {/* Centre text */}
                  <text
                    x={64} y={60}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={22}
                    fontWeight={700}
                    fontFamily="inherit"
                  >{pct}%</text>
                  <text
                    x={64} y={78}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.35)"
                    fontSize={11}
                    fontFamily="inherit"
                  >{phase === 'done' ? 'complete' : 'seeding'}</text>
                </svg>
              </div>
              {/* Side stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Progress </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#7dd3fc' }}>
                    {progress.toLocaleString()} / {total.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Written </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>{written.toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Skipped </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>{skipped.toLocaleString()}</span>
                </div>
                {errors.length > 0 && (
                  <div>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Errors </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>{errors.length}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Log */}
        {log.length > 0 && (
          <div style={{
            fontFamily: 'monospace', fontSize: 12,
            color: 'rgba(255,255,255,0.5)',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '12px 14px',
            marginBottom: 24, maxHeight: 180, overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {log.map((l, i) => <span key={i}>{l}</span>)}
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div style={{
            borderRadius: 10, background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)', padding: '14px 16px', marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertCircle size={15} color="#f87171" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f87171' }}>
                {errors.length} write error{errors.length !== 1 ? 's' : ''}
              </span>
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
              {errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
              {errors.length > 20 && <li>…and {errors.length - 20} more</li>}
            </ul>
          </div>
        )}

        {/* Done banner */}
        {phase === 'done' && errors.length === 0 && (
          <div style={{
            borderRadius: 10, background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.25)', padding: '14px 16px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <CheckCircle size={18} color="#34d399" />
            <span style={{ fontSize: 14, color: '#34d399', fontWeight: 600 }}>
              Import complete — {written} questions added, {skipped} skipped.
            </span>
          </div>
        )}

        {/* Action buttons */}
        {(phase === 'idle' || phase === 'done' || phase === 'error') && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => runSeed('new-only')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 22px', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.35)',
                color: '#34d399', fontSize: 14, fontWeight: 600,
              }}
            >
              <Play size={15} />
              Import New Questions Only
            </button>
            <button
              onClick={() => {
                if (!confirm('This will overwrite ALL existing seed questions (except teacher-modified ones). Continue?')) return;
                runSeed('overwrite-all');
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 22px', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(251,191,36,0.1)',
                border: '1px solid rgba(251,191,36,0.3)',
                color: '#fbbf24', fontSize: 14, fontWeight: 600,
              }}
            >
              <Database size={15} />
              Overwrite All (Re-seed)
            </button>
          </div>
        )}

        {phase === 'running' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            <Loader2 size={18} color="#34d399" style={{ animation: 'spin 1s linear infinite' }} />
            <span>Running — do not close this tab…</span>
          </div>
        )}

        {/* Info box */}
        <div style={{
          marginTop: 36, borderRadius: 10, background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)', padding: '16px 18px',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
            HOW IT WORKS
          </p>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.8 }}>
            <li>Each question is stored at <code>questions/{'{id}'}</code> using its own ID from the CSV.</li>
            <li><strong>Import New Only</strong> — skips any question whose ID already exists in Firestore.</li>
            <li><strong>Overwrite All</strong> — overwrites existing questions except those a teacher has manually edited (<code>teacherModified: true</code>).</li>
            <li>All imported questions are set to <code>approvalStatus: &quot;approved&quot;</code> so they appear immediately in quizzes.</li>
            <li>TopicKeys in the CSV have been remapped to the canonical app keys (e.g. <code>gr9-cs-cpu-architecture</code> → <code>gr9-cpu</code>).</li>
          </ul>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
