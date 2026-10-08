'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, ChevronLeft, ChevronRight, RotateCcw, Home, Trophy, Layers } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  text: string;
  options: string[];
  answer: string;
  explanation?: string;
  topicKey?: string;
  grade?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_SIZE = 40;

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

function levelAccent(score: number) {
  if (score >= 80) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function levelVerdict(score: number) {
  if (score >= 80) return '🎉 Level cleared!';
  if (score >= 50) return '👍 Not bad — keep going!';
  return '📚 Review and push on!';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CustomPracticePage() {
  const router = useRouter();

  // Full pool loaded from sessionStorage
  const [pool,   setPool]   = useState<Question[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  // Level tracking
  const [level,      setLevel]      = useState(0);   // 0-indexed
  const [levelQs,    setLevelQs]    = useState<Question[]>([]);

  // Quiz state (per level)
  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Cumulative stats across levels
  const [totalCorrect,  setTotalCorrect]  = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);

  // ── Load pool ───────────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('customQuiz');
      if (!raw) { setError('No questions found. Please go back and select chapters.'); setLoaded(true); return; }
      const qs: Question[] = JSON.parse(raw);
      if (!Array.isArray(qs) || qs.length === 0) { setError('Question data is empty or corrupted.'); setLoaded(true); return; }
      setPool(qs);
      setLevelQs(qs.slice(0, LEVEL_SIZE));
      setLoaded(true);
    } catch {
      setError('Could not read quiz data.');
      setLoaded(true);
    }
  }, []);

  // ── Advance to next level ───────────────────────────────────────────────────

  function goNextLevel() {
    const nextLevel = level + 1;
    const start = nextLevel * LEVEL_SIZE;
    const slice = pool.slice(start, start + LEVEL_SIZE);
    setLevel(nextLevel);
    setLevelQs(slice);
    setCurrent(0);
    setAnswers({});
    setSubmitted(false);
  }

  function restartAll() {
    // Re-shuffle the pool and restart from level 0
    const reshuffled = [...pool].sort(() => Math.random() - 0.5);
    sessionStorage.setItem('customQuiz', JSON.stringify(reshuffled));
    setPool(reshuffled);
    setLevel(0);
    setLevelQs(reshuffled.slice(0, LEVEL_SIZE));
    setCurrent(0);
    setAnswers({});
    setSubmitted(false);
    setTotalCorrect(0);
    setTotalAnswered(0);
  }

  // ── Loading / error states ──────────────────────────────────────────────────

  if (!loaded) {
    return (
      <main style={{ minHeight: '100vh', background: '#09090f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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

  // Derived
  const totalLevels    = Math.ceil(pool.length / LEVEL_SIZE);
  const isLastLevel    = level >= totalLevels - 1;
  const levelStart     = level * LEVEL_SIZE; // for display (1-indexed)

  // ── Level results screen ────────────────────────────────────────────────────

  if (submitted) {
    const correct    = levelQs.filter((q, i) => answers[i] === q.answer).length;
    const score      = pct(correct, levelQs.length);
    const accent     = levelAccent(score);
    const newTotalCorrect  = totalCorrect + correct;
    const newTotalAnswered = totalAnswered + levelQs.length;

    return (
      <main style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%), #09090f', fontFamily: 'var(--font-body)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px 80px' }}>

          {/* Level score banner */}
          <div style={{ textAlign: 'center', padding: '40px 20px 32px', background: `${accent}0d`, border: `1.5px solid ${accent}30`, borderRadius: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Level {level + 1} of {totalLevels}
            </div>
            <div style={{ fontSize: 60, fontFamily: 'var(--font-display)', color: accent, lineHeight: 1 }}>
              {score}%
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
              {correct} / {levelQs.length} correct
            </div>
            <div style={{ fontSize: 18, color: '#fff', fontFamily: 'var(--font-display)', marginTop: 10 }}>
              {levelVerdict(score)}
            </div>
          </div>

          {/* Overall progress bar */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 18px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>Overall progress</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>
                {newTotalAnswered} / {pool.length} questions done
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct(newTotalAnswered, pool.length)}%`, background: '#818cf8', borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>{totalLevels - level - 1} level{totalLevels - level - 1 !== 1 ? 's' : ''} remaining</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>{pct(newTotalCorrect, newTotalAnswered)}% cumulative accuracy</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 36, flexWrap: 'wrap' }}>
            {!isLastLevel && (
              <button
                onClick={() => { setTotalCorrect(newTotalCorrect); setTotalAnswered(newTotalAnswered); goNextLevel(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, background: '#6366f1', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
              >
                <Layers size={15} /> Level {level + 2} →
              </button>
            )}
            {isLastLevel && (
              <button
                onClick={() => { setTotalCorrect(newTotalCorrect); setTotalAnswered(newTotalAnswered); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, background: '#10b981', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                disabled
              >
                <Trophy size={15} /> All levels complete!
              </button>
            )}
            <button
              onClick={restartAll}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 10, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', cursor: 'pointer', fontSize: 14 }}
            >
              <RotateCcw size={14} /> Restart all
            </button>
            <button
              onClick={() => router.push('/practice')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14 }}
            >
              <ArrowLeft size={14} /> New practice
            </button>
          </div>

          {/* Per-question review */}
          <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Level {level + 1} review · questions {levelStart + 1}–{levelStart + levelQs.length}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {levelQs.map((q, i) => {
              const chosen  = answers[i];
              const isRight = chosen === q.answer;
              const ia      = isRight ? '#10b981' : '#ef4444';
              return (
                <div key={q.id ?? i} style={{ background: `${ia}08`, border: `1px solid ${ia}22`, borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                    {isRight ? <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} /> : <XCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />}
                    <p style={{ margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.25)', marginRight: 6 }}>Q{levelStart + i + 1}</span>
                      {q.text}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 25 }}>
                    {q.options.map(opt => {
                      const isAns    = opt === q.answer;
                      const isChosen = opt === chosen;
                      const bg  = isAns ? 'rgba(16,185,129,0.12)' : isChosen ? 'rgba(239,68,68,0.1)' : 'transparent';
                      const bdr = isAns ? '1px solid rgba(16,185,129,0.3)' : isChosen ? '1px solid rgba(239,68,68,0.25)' : '1px solid transparent';
                      const clr = isAns ? '#6ee7b7' : isChosen ? '#fca5a5' : 'rgba(255,255,255,0.38)';
                      return (
                        <div key={opt} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, background: bg, border: bdr, color: clr }}>
                          {opt}{isAns && !isChosen && <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.6 }}>← correct</span>}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && <p style={{ margin: '8px 0 0 25px', fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.55, fontStyle: 'italic' }}>{q.explanation}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // ── Quiz screen ─────────────────────────────────────────────────────────────

  const q      = levelQs[current];
  const chosen = answers[current];

  if (!q) return null;

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%), #09090f', fontFamily: 'var(--font-body)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Nav + level badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button
            onClick={() => router.push('/practice')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: 0 }}
          >
            <ArrowLeft size={13} /> Practice
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.25)', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '3px 8px' }}>
              Level {level + 1} / {totalLevels}
            </span>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)' }}>
              {current + 1} / {levelQs.length}
            </span>
          </div>
        </div>

        {/* Dual progress bars */}
        <div style={{ marginBottom: 28 }}>
          {/* Level progress */}
          <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, marginBottom: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct(current, levelQs.length)}%`, background: '#818cf8', borderRadius: 3, transition: 'width 0.3s ease' }} />
          </div>
          {/* Overall progress */}
          <div style={{ height: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct(levelStart + current, pool.length)}%`, background: 'rgba(99,102,241,0.35)', borderRadius: 2, transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.2)' }}>This level</span>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.2)' }}>
              Overall: {levelStart + current} / {pool.length}
            </span>
          </div>
        </div>

        {/* Question card */}
        <div style={{ background: 'rgba(255,255,255,0.035)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '30px 26px', marginBottom: 18, backdropFilter: 'blur(12px)' }}>
          <p style={{ fontSize: 17, color: '#f1f5f9', lineHeight: 1.6, margin: 0 }}>{q.text}</p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {q.options.map((opt, oi) => {
            const isSelected = chosen === opt;
            const isCorrect  = opt === q.answer;
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
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span>{opt}</span>
                {revealed && isCorrect  && <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />}
                {revealed && isSelected && !isCorrect && <XCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {chosen && q.explanation && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, fontStyle: 'italic' }}>{q.explanation}</p>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button
            onClick={() => setCurrent(c => Math.max(0, c - 1))}
            disabled={current === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: current === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', cursor: current === 0 ? 'default' : 'pointer', fontSize: 13 }}
          >
            <ChevronLeft size={14} /> Back
          </button>

          {current < levelQs.length - 1 ? (
            <button
              onClick={() => setCurrent(c => c + 1)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: chosen ? '#6366f1' : 'rgba(255,255,255,0.06)', border: `1px solid ${chosen ? 'transparent' : 'rgba(255,255,255,0.08)'}`, color: chosen ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, fontWeight: chosen ? 600 : 400 }}
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => setSubmitted(true)}
              disabled={Object.keys(answers).length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, background: Object.keys(answers).length > 0 ? '#6366f1' : 'rgba(255,255,255,0.06)', border: 'none', color: Object.keys(answers).length > 0 ? '#fff' : 'rgba(255,255,255,0.3)', cursor: Object.keys(answers).length > 0 ? 'pointer' : 'default', fontSize: 13, fontWeight: 600 }}
            >
              <CheckCircle2 size={14} /> Finish level
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.18)', fontFamily: 'var(--font-mono)', marginTop: 14 }}>
          {Object.keys(answers).length} of {levelQs.length} answered this level
        </p>
      </div>
    </main>
  );
}
