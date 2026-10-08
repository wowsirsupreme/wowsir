'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, XCircle, Clock, RotateCcw, Trophy, Home } from 'lucide-react';
import { useFirebase } from '@/hooks/useFirebase';
import { getPresetQuiz, fetchQuestionsForPreset } from '@/lib/firebase/presetQuizzes';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import type { PresetQuiz } from '@/lib/firebase/presetQuizzes';
import type { Question } from '@/types/question';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'error' | 'playing' | 'reveal' | 'results';

interface QuestionResult {
  question: Question;
  selected: number | null;
  correct: boolean;
  timeMs: number;
}

// ── Timer hook ────────────────────────────────────────────────────────────────

function useCountdown(seconds: number, running: boolean, onExpire: () => void) {
  const [remaining, setRemaining] = useState(seconds);
  const expireFired = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    expireFired.current = false;
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      if (!expireFired.current) {
        expireFired.current = true;
        onExpire();
      }
      return;
    }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [running, remaining, onExpire]);

  return remaining;
}

// ── Shuffle ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Grade accent colours ──────────────────────────────────────────────────────

function gradeAccent(grade: number | string): string {
  if (grade === '9dt') return '#ec4899';
  if (Number(grade) <= 6) return '#f59e0b';
  if (Number(grade) <= 8) return '#10b981';
  if (Number(grade) === 11) return '#8b5cf6';
  return '#6366f1';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PracticeQuizPage() {
  const router = useRouter();
  const params = useParams();
  const presetId = typeof params.presetId === 'string' ? params.presetId : '';
  const { configured } = useFirebase();

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [preset, setPreset] = useState<PresetQuiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const questionStart = useRef(0);

  const currentQ = questions[currentIdx];
  const timeLimit = preset?.timeLimitSeconds ?? 0;
  const timerRunning = phase === 'playing' && timeLimit > 0;
  const timerKey = `${currentIdx}-${questions.length}`;

  // ── Load preset + questions ────────────────────────────────────────────────

  useEffect(() => {
    if (!presetId || !configured) return;
    (async () => {
      try {
        const p = await getPresetQuiz(presetId);
        if (!p) { setErrorMsg('Quiz not found.'); setPhase('error'); return; }
        setPreset(p);
        let qs = await fetchQuestionsForPreset(p);
        if (qs.length === 0) {
          setErrorMsg('No approved questions found for this quiz. Ask your teacher to approve questions first.');
          setPhase('error');
          return;
        }
        if (p.shuffleQuestions) qs = shuffle(qs);
        qs = qs.slice(0, p.questionCount);
        setQuestions(qs);
        setPhase('playing');
        questionStart.current = Date.now();
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Failed to load quiz');
        setPhase('error');
      }
    })();
  }, [presetId, configured]);

  // ── Timer expiry ──────────────────────────────────────────────────────────

  const handleTimerExpire = useCallback(() => {
    if (phase !== 'playing') return;
    // Force reveal with no selection
    setPhase('reveal');
  }, [phase]);

  // We reset the timer key each question — useCountdown only cares about `seconds` + `running`
  const _remaining = useCountdown(timeLimit, timerRunning, handleTimerExpire);
  const remaining = timerRunning ? _remaining : timeLimit;

  // ── Answer selection ──────────────────────────────────────────────────────

  function handleAnswer(index: number) {
    if (phase !== 'playing' || selected !== null) return;
    setSelected(index);
    setPhase('reveal');
  }

  // ── Advance to next question ──────────────────────────────────────────────

  function handleNext() {
    if (!currentQ) return;
    const timeMs = Date.now() - questionStart.current;
    const correctIndex = parseInt(currentQ.answer, 10);
    const isCorrect = selected !== null && selected === correctIndex;

    const result: QuestionResult = {
      question: currentQ,
      selected,
      correct: isCorrect,
      timeMs,
    };

    const newResults = [...results, result];

    if (currentIdx + 1 >= questions.length) {
      setResults(newResults);
      setPhase('results');
    } else {
      setResults(newResults);
      setCurrentIdx(i => i + 1);
      setSelected(null);
      setPhase('playing');
      questionStart.current = Date.now();
    }
  }

  // ── Restart ───────────────────────────────────────────────────────────────

  function handleRestart() {
    if (!preset) return;
    let qs = [...questions];
    if (preset.shuffleQuestions) qs = shuffle(qs);
    setQuestions(qs);
    setCurrentIdx(0);
    setSelected(null);
    setResults([]);
    setPhase('playing');
    questionStart.current = Date.now();
  }

  // ── Derived stats ─────────────────────────────────────────────────────────

  const totalCorrect = results.filter(r => r.correct).length;
  const totalScore = results.reduce((acc, r) => acc + (r.correct ? (r.question.points ?? 1) : 0), 0);
  const maxScore = results.reduce((acc, r) => acc + (r.question.points ?? 1), 0);
  const pct = results.length > 0 ? Math.round((totalCorrect / results.length) * 100) : 0;
  const accent = preset ? gradeAccent(preset.grade) : '#6366f1';

  // ── Render helpers ────────────────────────────────────────────────────────

  function ScoreGrade() {
    if (pct >= 80) return <span style={{ color: '#10b981' }}>Excellent! 🎉</span>;
    if (pct >= 60) return <span style={{ color: '#f59e0b' }}>Good work! 👍</span>;
    if (pct >= 40) return <span style={{ color: '#f97316' }}>Keep practising 📚</span>;
    return <span style={{ color: '#ef4444' }}>Need more review 💪</span>;
  }

  // ── Background / layout wrapper ───────────────────────────────────────────

  const bgStyle = {
    minHeight: '100vh',
    background: `radial-gradient(ellipse at 50% 0%, ${accent}22 0%, transparent 60%), #09090f`,
    padding: '0',
    fontFamily: 'var(--font-body)',
  } as React.CSSProperties;

  const starOverlay = (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        opacity: 0.045,
      }}
    />
  );

  // ── LOADING ───────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <main style={bgStyle}>
        {starOverlay}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 }}>
          <Loader2 size={32} color="rgba(255,255,255,0.4)" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading quiz…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────

  if (phase === 'error') {
    return (
      <main style={bgStyle}>
        {starOverlay}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 540, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
          <AlertCircle size={40} color="#f87171" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#f1f5f9', marginBottom: 10 }}>
            Couldn't load quiz
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 28 }}>{errorMsg}</p>
          <button
            onClick={() => router.push('/practice')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 10,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.75)', fontSize: 14, cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} /> Back to Practice
          </button>
        </div>
      </main>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────

  if (phase === 'results') {
    return (
      <main style={bgStyle}>
        {starOverlay}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '40px 20px 60px' }}>

          {/* Score card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `2px solid ${accent}44`,
              borderRadius: 24,
              padding: '40px 36px',
              textAlign: 'center',
              backdropFilter: 'blur(12px)',
              marginBottom: 32,
              boxShadow: `0 0 60px ${accent}18`,
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <Trophy size={44} color={accent} style={{ margin: '0 auto 12px' }} />
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: '#f1f5f9', margin: '0 0 4px' }}>
                Quiz Complete!
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>
                {preset?.title}
              </p>
            </div>

            <div
              style={{
                fontSize: 72, fontFamily: 'var(--font-display)', lineHeight: 1,
                color: accent, margin: '28px 0 8px',
              }}
            >
              {pct}%
            </div>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>
              <ScoreGrade />
            </p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>
              {totalCorrect} / {results.length} correct · {totalScore} / {maxScore} pts
            </p>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
              <button
                onClick={handleRestart}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 24px', borderRadius: 12,
                  background: accent + '22', border: `1.5px solid ${accent}55`,
                  color: accent, fontSize: 14, cursor: 'pointer',
                  fontFamily: 'var(--font-display)', transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = accent + '38'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = accent + '22'; }}
              >
                <RotateCcw size={15} /> Try Again
              </button>
              <button
                onClick={() => router.push('/practice')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 24px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.65)', fontSize: 14, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              >
                <ArrowLeft size={15} /> More Quizzes
              </button>
              <button
                onClick={() => router.push('/')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 24px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              >
                <Home size={15} /> Home
              </button>
            </div>
          </div>

          {/* Per-question breakdown */}
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>
            Question Review
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map((r, i) => {
              const correctIndex = parseInt(r.question.answer, 10);
              const correctLabel = r.question.options?.[correctIndex];
              const selectedLabel = r.selected !== null ? r.question.options?.[r.selected] : null;
              return (
                <div
                  key={i}
                  style={{
                    background: r.correct ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                    border: `1px solid ${r.correct ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.18)'}`,
                    borderRadius: 14, padding: '16px 18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}>
                      {r.correct
                        ? <CheckCircle2 size={18} color="#10b981" />
                        : <XCircle size={18} color="#ef4444" />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', margin: '0 0 6px', lineHeight: 1.45 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginRight: 6 }}>Q{i + 1}</span>
                        {r.question.text}
                      </p>
                      {!r.correct && selectedLabel && (
                        <p style={{ fontSize: 12, color: 'rgba(239,68,68,0.8)', margin: '0 0 3px' }}>
                          Your answer: {selectedLabel}
                        </p>
                      )}
                      {!r.correct && (
                        <p style={{ fontSize: 12, color: 'rgba(16,185,129,0.9)', margin: 0 }}>
                          Correct: {correctLabel}
                        </p>
                      )}
                      {r.question.explanation && (
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', margin: '6px 0 0', fontStyle: 'italic' }}>
                          {r.question.explanation}
                        </p>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.25)' }}>
                        {(r.timeMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  // ── PLAYING / REVEAL ──────────────────────────────────────────────────────

  const progressPct = questions.length > 0 ? ((currentIdx) / questions.length) * 100 : 0;

  return (
    <main style={bgStyle}>
      {starOverlay}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Top nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button
            onClick={() => router.push('/practice')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.38)', fontSize: 12, fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em', textTransform: 'uppercase', padding: 0,
            }}
          >
            <ArrowLeft size={13} /> Exit
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Timer */}
            {timeLimit > 0 && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: 'var(--font-mono)', fontSize: 15,
                  color: remaining <= 5 ? '#ef4444' : remaining <= 10 ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                  transition: 'color 0.3s',
                }}
              >
                <Clock size={14} />
                {remaining}s
              </div>
            )}

            {/* Question counter */}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {currentIdx + 1} / {questions.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 3, borderRadius: 4,
            background: 'rgba(255,255,255,0.07)',
            marginBottom: 32, overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%', borderRadius: 4,
              background: accent,
              width: `${progressPct}%`,
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Question title */}
        {preset && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
            {preset.title}
          </p>
        )}

        {/* Question card */}
        {currentQ && (
          <QuestionCard
            question={currentQ}
            selected={selected}
            revealed={phase === 'reveal'}
            onAnswer={handleAnswer}
            disabled={phase === 'reveal'}
          />
        )}

        {/* Reveal actions */}
        {phase === 'reveal' && (
          <div style={{ marginTop: 28 }}>
            {/* Explanation */}
            {currentQ?.explanation && (
              <div
                style={{
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 12, padding: '14px 18px', marginBottom: 18,
                }}
              >
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.55 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#818cf8', marginRight: 8 }}>
                    Explanation
                  </span>
                  {currentQ.explanation}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleNext}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '13px 28px', borderRadius: 12,
                  background: accent + '22', border: `1.5px solid ${accent}55`,
                  color: accent, fontSize: 15, cursor: 'pointer',
                  fontFamily: 'var(--font-display)', letterSpacing: '0.02em',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = accent + '38'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = accent + '22'; }}
              >
                {currentIdx + 1 >= questions.length ? 'See Results' : 'Next Question'}
                <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
