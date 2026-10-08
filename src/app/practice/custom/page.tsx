'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, ChevronLeft, ChevronRight, RotateCcw, Home } from 'lucide-react';

// ── Types (mirrors studyContent Question shape) ───────────────────────────────

interface Question {
  id: string;
  text: string;
  options: string[];
  answer: string;
  explanation?: string;
  topicKey?: string;
  grade?: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CustomPracticePage() {
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loaded, setLoaded]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Quiz state
  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('customQuiz');
      if (!raw) { setError('No questions found. Please go back and select chapters.'); setLoaded(true); return; }
      const qs: Question[] = JSON.parse(raw);
      if (!Array.isArray(qs) || qs.length === 0) { setError('Question data is empty or corrupted.'); setLoaded(true); return; }
      setQuestions(qs);
      setLoaded(true);
    } catch {
      setError('Could not read quiz data.');
      setLoaded(true);
    }
  }, []);

  if (!loaded) {
    return (
      <main style={{ minHeight: '100vh', background: '#09090f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ minHeight: '100vh', background: '#09090f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 20px' }}>
        <XCircle size={40} color="#f87171" />
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, textAlign: 'center', maxWidth: 360 }}>{error}</p>
        <button
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontSize: 14 }}
        >
          <ArrowLeft size={14} /> Go back
        </button>
      </main>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (submitted) {
    const correct = questions.filter((q, i) => answers[i] === q.answer).length;
    const score   = pct(correct, questions.length);
    const accent  = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

    return (
      <main
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%), #09090f',
          fontFamily: 'var(--font-body)',
          padding: '0',
        }}
      >
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px 80px' }}>
          {/* Score banner */}
          <div
            style={{
              textAlign: 'center', padding: '44px 20px 36px',
              background: `${accent}0d`,
              border: `1.5px solid ${accent}30`,
              borderRadius: 20, marginBottom: 32,
            }}
          >
            <div style={{ fontSize: 64, fontFamily: 'var(--font-display)', color: accent, lineHeight: 1 }}>
              {score}%
            </div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>
              {correct} / {questions.length} correct
            </div>
            <div style={{ fontSize: 20, color: '#fff', fontFamily: 'var(--font-display)', marginTop: 12 }}>
              {score >= 80 ? '🎉 Excellent work!' : score >= 50 ? '👍 Good effort!' : '📚 Keep studying!'}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 40, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setCurrent(0); setAnswers({}); setSubmitted(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              <RotateCcw size={14} /> Retry
            </button>
            <button
              onClick={() => router.push('/practice')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14 }}
            >
              <ArrowLeft size={14} /> New practice
            </button>
            <button
              onClick={() => router.push('/')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14 }}
            >
              <Home size={14} /> Home
            </button>
          </div>

          {/* Question-by-question review */}
          <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Review
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {questions.map((q, i) => {
              const chosen   = answers[i];
              const isRight  = chosen === q.answer;
              const itemAccent = isRight ? '#10b981' : '#ef4444';
              return (
                <div
                  key={q.id ?? i}
                  style={{
                    background: `${itemAccent}08`,
                    border: `1px solid ${itemAccent}22`,
                    borderRadius: 14, padding: '18px 20px',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                    {isRight
                      ? <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                      : <XCircle      size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                    }
                    <p style={{ margin: 0, fontSize: 14, color: '#e2e8f0', lineHeight: 1.5 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginRight: 6 }}>Q{i + 1}</span>
                      {q.text}
                    </p>
                  </div>
                  {/* Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginLeft: 26 }}>
                    {q.options.map(opt => {
                      const isAnswer  = opt === q.answer;
                      const isChosen  = opt === chosen;
                      const bg = isAnswer ? 'rgba(16,185,129,0.12)' : isChosen && !isAnswer ? 'rgba(239,68,68,0.1)' : 'transparent';
                      const border = isAnswer ? '1px solid rgba(16,185,129,0.35)' : isChosen && !isAnswer ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent';
                      const color = isAnswer ? '#6ee7b7' : isChosen && !isAnswer ? '#fca5a5' : 'rgba(255,255,255,0.45)';
                      return (
                        <div key={opt} style={{ fontSize: 13, padding: '5px 10px', borderRadius: 7, background: bg, border, color }}>
                          {opt}
                          {isAnswer && !isChosen && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>← correct</span>}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <p style={{ margin: '10px 0 0 26px', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55, fontStyle: 'italic' }}>
                      {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // ── Quiz screen ─────────────────────────────────────────────────────────────

  const q         = questions[current];
  const chosen    = answers[current];
  const progress  = pct(current, questions.length);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%), #09090f',
        fontFamily: 'var(--font-body)',
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Nav bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <button
            onClick={() => router.push('/practice')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: 0 }}
          >
            <ArrowLeft size={13} /> Practice
          </button>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)' }}>
            {current + 1} / {questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, marginBottom: 32, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#818cf8', borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>

        {/* Question card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.035)',
            border: '1.5px solid rgba(255,255,255,0.08)',
            borderRadius: 20, padding: '32px 28px', marginBottom: 20,
            backdropFilter: 'blur(12px)',
          }}
        >
          <p style={{ fontSize: 18, color: '#f1f5f9', lineHeight: 1.55, margin: 0 }}>{q.text}</p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {q.options.map((opt, oi) => {
            const isSelected = chosen === opt;
            const isCorrect  = opt === q.answer;
            // Once an answer is chosen, reveal green for correct, red for wrong selection
            const revealed   = !!chosen;
            let bg     = 'rgba(255,255,255,0.03)';
            let border = 'rgba(255,255,255,0.07)';
            let color  = 'rgba(255,255,255,0.75)';
            if (revealed && isCorrect) {
              bg = 'rgba(16,185,129,0.15)'; border = 'rgba(16,185,129,0.55)'; color = '#6ee7b7';
            } else if (revealed && isSelected && !isCorrect) {
              bg = 'rgba(239,68,68,0.15)'; border = 'rgba(239,68,68,0.5)'; color = '#fca5a5';
            } else if (!revealed && isSelected) {
              bg = 'rgba(99,102,241,0.18)'; border = 'rgba(99,102,241,0.5)'; color = '#c7d2fe';
            }
            return (
              <button
                key={oi}
                onClick={() => !chosen && setAnswers(prev => ({ ...prev, [current]: opt }))}
                style={{
                  textAlign: 'left', padding: '14px 18px', borderRadius: 12, fontSize: 15,
                  background: bg, border: `1.5px solid ${border}`, color,
                  cursor: chosen ? 'default' : 'pointer', transition: 'all 0.18s',
                  transform: isSelected && !revealed ? 'translateX(4px)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span>{opt}</span>
                {revealed && isCorrect && <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />}
                {revealed && isSelected && !isCorrect && <XCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* Explanation — shown after answering */}
        {chosen && q.explanation && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, fontStyle: 'italic' }}>
              {q.explanation}
            </p>
          </div>
        )}

        {/* Bottom controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button
            onClick={() => setCurrent(c => Math.max(0, c - 1))}
            disabled={current === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              color: current === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
              cursor: current === 0 ? 'default' : 'pointer', fontSize: 13,
            }}
          >
            <ChevronLeft size={14} /> Back
          </button>

          {current < questions.length - 1 ? (
            <button
              onClick={() => setCurrent(c => c + 1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10,
                background: chosen ? '#6366f1' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${chosen ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                color: chosen ? '#fff' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: 13, fontWeight: chosen ? 600 : 400,
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => setSubmitted(true)}
              disabled={Object.keys(answers).length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10,
                background: Object.keys(answers).length > 0 ? '#6366f1' : 'rgba(255,255,255,0.06)',
                border: 'none',
                color: Object.keys(answers).length > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                cursor: Object.keys(answers).length > 0 ? 'pointer' : 'default', fontSize: 13, fontWeight: 600,
              }}
            >
              <CheckCircle2 size={14} /> Submit
            </button>
          )}
        </div>

        {/* Answered count hint */}
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)', marginTop: 16 }}>
          {Object.keys(answers).length} of {questions.length} answered
        </p>
      </div>
    </main>
  );
}
