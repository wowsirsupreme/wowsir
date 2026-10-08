'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ChevronRight, Clock, Layers, AlertCircle, Loader2, ArrowLeft, CheckSquare, Square, PlayCircle } from 'lucide-react';
import { useFirebase } from '@/hooks/useFirebase';
import { listPresetQuizzes } from '@/lib/firebase/presetQuizzes';
import type { PresetQuiz } from '@/lib/firebase/presetQuizzes';
import { GRADE_CHAPTERS } from '@/data/studyContent';
import type { StudyChapter } from '@/data/studyContent';

// ── Grade catalogue ───────────────────────────────────────────────────────────

const GRADE_LIST = [
  { key: 4,    label: 'Grade 4',  sub: 'Computing Basics',          accent: '#f59e0b', glow: 'rgba(245,158,11,0.15)',   classId: 'gr4-cs' },
  { key: 5,    label: 'Grade 5',  sub: 'Computing & Tech',          accent: '#f59e0b', glow: 'rgba(245,158,11,0.15)',   classId: 'gr5-cs' },
  { key: 6,    label: 'Grade 6',  sub: 'Computing & Programming',   accent: '#f59e0b', glow: 'rgba(245,158,11,0.15)',   classId: 'gr6-cs' },
  { key: 7,    label: 'Grade 7',  sub: 'Computing & Web',           accent: '#10b981', glow: 'rgba(16,185,129,0.15)',   classId: 'gr7-cs' },
  { key: 8,    label: 'Grade 8',  sub: 'Python & Networks',         accent: '#10b981', glow: 'rgba(16,185,129,0.15)',   classId: 'gr8-cs' },
  { key: 9,    label: 'Grade 9',  sub: 'IGCSE CS 0478 Year 1',      accent: '#6366f1', glow: 'rgba(99,102,241,0.15)',   classId: 'gr9-cs' },
  { key: '9dt',label: 'Grade 9',  sub: 'IGCSE D&T 0445',            accent: '#ec4899', glow: 'rgba(236,72,153,0.15)',   classId: 'gr9-dt' },
  { key: 10,   label: 'Grade 10', sub: 'IGCSE CS 0478 Year 2',      accent: '#6366f1', glow: 'rgba(99,102,241,0.15)',   classId: null },
  { key: 11,   label: 'Grade 11', sub: 'A-Level CS 9618',           accent: '#8b5cf6', glow: 'rgba(139,92,246,0.15)',   classId: null },
];

const DIFFICULTY_BADGE: Record<string, { label: string; color: string }> = {
  easy:   { label: 'Easy',   color: '#10b981' },
  medium: { label: 'Medium', color: '#f59e0b' },
  hard:   { label: 'Hard',   color: '#ef4444' },
  mixed:  { label: 'Mixed',  color: '#6366f1' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function PracticePage() {
  const router = useRouter();
  const { configured, checking } = useFirebase();

  const [selectedGrade, setSelectedGrade] = useState<number | string | null>(null);
  const [presets, setPresets]             = useState<PresetQuiz[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  // Chapter-picker state
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());

  // Load presets when a grade is selected
  useEffect(() => {
    if (selectedGrade === null || !configured) return;
    setLoadingPresets(true);
    setError(null);
    setSelectedChapters(new Set());
    listPresetQuizzes(selectedGrade)
      .then(setPresets)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load quizzes'))
      .finally(() => setLoadingPresets(false));
  }, [selectedGrade, configured]);

  function toggleChapter(key: string) {
    setSelectedChapters(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function startCustomQuiz() {
    const gradeInfo = GRADE_LIST.find(g => g.key === selectedGrade);
    if (!gradeInfo?.classId) return;
    const chapters = GRADE_CHAPTERS[gradeInfo.classId] ?? [];
    const keys = [...selectedChapters];
    const qs = chapters
      .filter(c => keys.includes(c.key))
      .flatMap(c => c.questions)
      .sort(() => Math.random() - 0.5);
    if (qs.length === 0) return;
    // Store questions in sessionStorage and navigate to a quiz player
    sessionStorage.setItem('customQuiz', JSON.stringify(qs));
    sessionStorage.setItem('customQuizMeta', JSON.stringify({
      gradeLabel: gradeInfo.label,
      gradeKey: gradeInfo.classId,
      accent: gradeInfo.accent,
      chapters: keys,
    }));
    router.push('/practice/custom');
  }

  const gradeInfo = GRADE_LIST.find(g => g.key === selectedGrade);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 65%), #09090f',
        padding: '0',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Star field overlay */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          opacity: 0.045,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 860, margin: '0 auto', padding: '40px 20px 60px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <button
            onClick={() => selectedGrade !== null ? setSelectedGrade(null) : router.push('/')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.45)', fontSize: 13, fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 24,
              padding: 0,
            }}
          >
            <ArrowLeft size={14} />
            {selectedGrade !== null ? 'All Grades' : 'Home'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(99,102,241,0.2)', border: '1.5px solid rgba(99,102,241,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <BookOpen size={22} color="#818cf8" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: '#f1f5f9', margin: 0, lineHeight: 1 }}>
                {selectedGrade !== null && gradeInfo
                  ? `${gradeInfo.label} Practice`
                  : 'Practice Mode'}
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontFamily: 'var(--font-mono)' }}>
                {selectedGrade !== null && gradeInfo
                  ? gradeInfo.sub
                  : 'Choose your grade to begin'}
              </p>
            </div>
          </div>
        </div>

        {/* Firebase not configured warning */}
        {!checking && !configured && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 12, padding: '14px 18px', marginBottom: 28,
              color: 'rgba(255,255,255,0.7)', fontSize: 13,
            }}
          >
            <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
            Firebase is not connected — practice quizzes require a live database. Ask your teacher to set it up.
          </div>
        )}

        {/* Grade selector */}
        {selectedGrade === null && (
          <div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              Select Grade
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 14,
              }}
            >
              {GRADE_LIST.map(g => (
                <button
                  key={String(g.key)}
                  onClick={() => configured && setSelectedGrade(g.key)}
                  disabled={!configured}
                  style={{
                    background: `rgba(255,255,255,0.03)`,
                    border: `1.5px solid rgba(255,255,255,0.08)`,
                    borderRadius: 16,
                    padding: '18px 20px',
                    cursor: configured ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                    opacity: configured ? 1 : 0.45,
                    backdropFilter: 'blur(8px)',
                  }}
                  onMouseEnter={e => {
                    if (!configured) return;
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'translateY(-3px)';
                    el.style.borderColor = g.accent + '55';
                    el.style.boxShadow = `0 8px 28px ${g.glow}`;
                    el.style.background = `rgba(255,255,255,0.055)`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'translateY(0)';
                    el.style.borderColor = 'rgba(255,255,255,0.08)';
                    el.style.boxShadow = 'none';
                    el.style.background = 'rgba(255,255,255,0.03)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: '#f1f5f9', marginBottom: 4 }}>
                        {g.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-mono)' }}>
                        {g.sub}
                      </div>
                    </div>
                    <ChevronRight size={16} color={g.accent} style={{ marginTop: 2, flexShrink: 0 }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Grade selected — chapter picker + teacher presets */}
        {selectedGrade !== null && (
          <div>
            {/* ── Chapter picker ── */}
            {(() => {
              const gradeInfo = GRADE_LIST.find(g => g.key === selectedGrade);
              const chapters: StudyChapter[] = gradeInfo?.classId ? (GRADE_CHAPTERS[gradeInfo.classId] ?? []) : [];
              if (chapters.length === 0) return null;
              const totalQs = [...selectedChapters].reduce((sum, k) => {
                return sum + (chapters.find(c => c.key === k)?.questions.length ?? 0);
              }, 0);
              return (
                <div style={{ marginBottom: 32 }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                    Build your own practice
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {chapters.map(ch => {
                      const checked = selectedChapters.has(ch.key);
                      const count = ch.questions.length;
                      return (
                        <button
                          key={ch.key}
                          onClick={() => count > 0 && toggleChapter(ch.key)}
                          disabled={count === 0}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '11px 14px', borderRadius: 12, textAlign: 'left',
                            background: checked ? `${gradeInfo!.accent}12` : 'rgba(255,255,255,0.03)',
                            border: `1.5px solid ${checked ? gradeInfo!.accent + '45' : 'rgba(255,255,255,0.07)'}`,
                            cursor: count > 0 ? 'pointer' : 'not-allowed',
                            opacity: count > 0 ? 1 : 0.4,
                            transition: 'all 0.15s',
                          }}
                        >
                          {checked
                            ? <CheckSquare size={15} color={gradeInfo!.accent} style={{ flexShrink: 0 }} />
                            : <Square size={15} color="rgba(255,255,255,0.25)" style={{ flexShrink: 0 }} />
                          }
                          <span style={{ flex: 1, fontSize: 14, color: checked ? '#fff' : 'rgba(255,255,255,0.7)' }}>{ch.shortTitle}</span>
                          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)' }}>
                            {count > 0 ? `${count}q` : '—'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={startCustomQuiz}
                    disabled={selectedChapters.size === 0}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14,
                      background: selectedChapters.size > 0 ? gradeInfo!.accent : 'rgba(255,255,255,0.06)',
                      color: selectedChapters.size > 0 ? '#000' : 'rgba(255,255,255,0.3)',
                      border: 'none', cursor: selectedChapters.size > 0 ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                    }}
                  >
                    <PlayCircle size={16} />
                    Start practice
                    {selectedChapters.size > 0 && ` · ${totalQs} question${totalQs !== 1 ? 's' : ''}`}
                  </button>
                </div>
              );
            })()}

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 24 }} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Teacher-set tests
            </p>

            {loadingPresets && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.45)', padding: '40px 0' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 14 }}>Loading quizzes…</span>
              </div>
            )}

            {error && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 12, padding: '14px 18px',
                  color: 'rgba(255,255,255,0.7)', fontSize: 13,
                }}
              >
                <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {!loadingPresets && !error && presets.length === 0 && (
              <div
                style={{
                  textAlign: 'center', padding: '60px 20px',
                  background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: 18,
                }}
              >
                <BookOpen size={36} color="rgba(255,255,255,0.18)" style={{ margin: '0 auto 14px' }} />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>
                  No quizzes available for this grade yet.
                </p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, margin: '6px 0 0' }}>
                  Ask your teacher to seed the preset quiz catalog in Admin Panel.
                </p>
              </div>
            )}

            {!loadingPresets && presets.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  {presets.length} quiz{presets.length !== 1 ? 'zes' : ''} available
                </p>
                {presets.map(preset => {
                  const diff = DIFFICULTY_BADGE[preset.difficulty] ?? DIFFICULTY_BADGE.mixed;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => router.push(`/practice/quiz/${preset.id}`)}
                      style={{
                        background: 'rgba(255,255,255,0.035)',
                        border: '1.5px solid rgba(255,255,255,0.08)',
                        borderRadius: 16,
                        padding: '20px 22px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.18s ease',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = 'translateY(-2px)';
                        el.style.borderColor = 'rgba(99,102,241,0.4)';
                        el.style.boxShadow = '0 8px 28px rgba(99,102,241,0.12)';
                        el.style.background = 'rgba(255,255,255,0.055)';
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = 'translateY(0)';
                        el.style.borderColor = 'rgba(255,255,255,0.08)';
                        el.style.boxShadow = 'none';
                        el.style.background = 'rgba(255,255,255,0.035)';
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f1f5f9' }}>
                            {preset.title}
                          </span>
                          <span
                            style={{
                              fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                              textTransform: 'uppercase', padding: '2px 7px', borderRadius: 6,
                              background: diff.color + '22', color: diff.color,
                              border: `1px solid ${diff.color}44`, flexShrink: 0,
                            }}
                          >
                            {diff.label}
                          </span>
                        </div>
                        {preset.description && (
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', margin: 0, lineHeight: 1.45 }}>
                            {preset.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>
                            <Layers size={12} />
                            {preset.questionCount} questions
                          </span>
                          {preset.timeLimitSeconds && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>
                              <Clock size={12} />
                              {preset.timeLimitSeconds}s per question
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={18} color="rgba(255,255,255,0.25)" style={{ flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
