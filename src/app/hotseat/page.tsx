'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { TimerRing } from '@/components/quiz/TimerRing';
import { useFirebase } from '@/hooks/useFirebase';
import { getRandomQuestions } from '@/lib/firebase/questions';
import { TOPIC_LABELS } from '@/types/question';
import { allGradeQuestions } from '@/data/grades';
import type { Question } from '@/types/question';
import { calcTimeBonus } from '@/lib/utils';

const TOPIC_KEYS = Object.keys(TOPIC_LABELS);
const HOT_SEAT_COUNT = 10;
const MAX_LIVES = 3;

// Timer per question band: q1-3 easy 15s, q4-7 medium 12s, q8-10 hard 10s
function timeForIdx(idx: number): number {
  if (idx < 3) return 15;
  if (idx < 7) return 12;
  return 10;
}

/** Normalise q.answer (may be numeric index string) → option text, then shuffle options. */
function prepareQuestion(q: Question): Question {
  let answerText = q.answer as string;
  const idx = parseInt(answerText, 10);
  if (!isNaN(idx) && Array.isArray(q.options) && q.options[idx] !== undefined) {
    answerText = q.options[idx];
  }
  const opts = [...(q.options ?? [])];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { ...q, answer: answerText, options: opts };
}

/** Sort by difficulty band, then shuffle within each band. */
function sortByDifficulty(qs: Question[]): Question[] {
  const order = { easy: 0, medium: 1, hard: 2 };
  const band = (q: Question) => order[(q.difficulty as keyof typeof order) ?? 'medium'] ?? 1;
  return [...qs].sort((a, b) => band(a) - band(b) || Math.random() - 0.5);
}

/** Merge Firestore questions with local builtin questions for a topic, dedup by id. */
function mergeQuestions(remote: Question[], topicKey: string): Question[] {
  const local = (allGradeQuestions as Question[]).filter(q => q.topicKey === topicKey);
  const seen = new Set(remote.map(q => q.id));
  const merged = [...remote, ...local.filter(q => !seen.has(q.id))];
  return merged;
}

type Phase = 'setup' | 'playing' | 'reveal' | 'dead' | 'done';

export default function HotSeatPage() {
  const router = useRouter();
  const { configured } = useFirebase();

  const [name, setName] = useState('');
  const [topicKey, setTopicKey] = useState('');
  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [questionStart, setQuestionStart] = useState(0);
  const [results, setResults] = useState<{ correct: boolean; timeMs: number; score: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [shakeHeart, setShakeHeart] = useState(false);

  // Ref to track lives within handleAnswer without stale closure issues
  const livesRef = useRef(MAX_LIVES);

  async function handleStart() {
    if (!topicKey) return;
    setLoading(true);
    let remote: Question[] = [];
    try { remote = await getRandomQuestions(topicKey, 50); } catch { /* offline */ }
    const pool = mergeQuestions(remote, topicKey);
    if (pool.length === 0) { alert('No questions available for this topic yet.'); setLoading(false); return; }
    const sorted = sortByDifficulty(pool);
    const picked = sorted.slice(0, Math.min(HOT_SEAT_COUNT, sorted.length)).map(prepareQuestion);
    setQuestions(picked);
    setCurrentIdx(0);
    setScore(0);
    setCorrect(0);
    setLives(MAX_LIVES);
    livesRef.current = MAX_LIVES;
    setStreak(0);
    setMaxStreak(0);
    setResults([]);
    setSelected(null);
    setLoading(false);
    setPhase('playing');
    setQuestionStart(Date.now());
  }

  const handleAnswer = useCallback((index: number) => {
    if (selected !== null || !questions[currentIdx]) return;
    const timeMs = Date.now() - questionStart;
    const q = questions[currentIdx];
    // After prepareQuestion, q.answer is option text; match by text
    const correctIndex = q.options.findIndex(o => o === q.answer);
    const isCorrect = index === correctIndex;
    const timeLimit = timeForIdx(currentIdx) * 1000;
    const timeRemaining = Math.max(0, timeLimit - timeMs);
    const timeBonus = isCorrect ? calcTimeBonus(timeRemaining, timeLimit) : 0;
    // Streak multiplier: ×1 at 0, up to ×2 at streak 5+
    const streakMult = isCorrect ? 1 + Math.min(streak, 5) * 0.2 : 1;
    const earned = isCorrect ? Math.round((100 + timeBonus) * streakMult) : 0;

    setSelected(index);
    setPhase('reveal');

    if (isCorrect) {
      setScore(s => s + earned);
      setCorrect(c => c + 1);
      setStreak(s => {
        const ns = s + 1;
        setMaxStreak(m => Math.max(m, ns));
        return ns;
      });
    } else {
      setStreak(0);
      const newLives = livesRef.current - 1;
      livesRef.current = newLives;
      setLives(newLives);
      setShakeHeart(true);
      setTimeout(() => setShakeHeart(false), 600);
      if (newLives <= 0) {
        setResults(r => [...r, { correct: false, timeMs, score: 0 }]);
        setTimeout(() => setPhase('dead'), 1200);
        return;
      }
    }
    setResults(r => [...r, { correct: isCorrect, timeMs, score: earned }]);
  }, [selected, questions, currentIdx, questionStart, streak]);

  function handleTimerEnd() {
    if (selected === null) handleAnswer(-1);
  }

  function handleNext() {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= questions.length) { setPhase('done'); return; }
    setCurrentIdx(nextIdx);
    setSelected(null);
    setPhase('playing');
    setQuestionStart(Date.now());
  }

  const currentQ = questions[currentIdx];
  const accuracy = results.length > 0 ? correct / results.length : 0;
  const currentTimeLimit = timeForIdx(currentIdx);

  const heartStyle = (i: number) => ({
    fontSize: 22,
    filter: i < lives ? 'none' : 'grayscale(1) opacity(0.25)',
    transition: 'filter 0.3s',
    transform: shakeHeart && i === lives ? 'scale(1.4)' : 'scale(1)',
  });

  return (
    <div className="hotseat-screen flex flex-col min-h-screen">

      {/* Nav */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', background: 'rgba(8,4,0,0.4)' }}
      >
        <button
          onClick={() => router.push('/')}
          className="text-sm transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(249,115,22,0.9)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-base" style={{ filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.8))' }}>🔥</span>
          <span className="font-display text-lg" style={{ color: '#fff' }}>Hot Seat</span>
        </div>
        {phase !== 'setup' ? (
          <div className="flex items-center gap-3">
            {/* Lives */}
            <div className="flex gap-0.5">
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <span key={i} style={heartStyle(i)}>❤️</span>
              ))}
            </div>
            <div className="font-mono text-sm font-bold" style={{ color: '#fdba74' }}>
              {score.toLocaleString()}
            </div>
          </div>
        ) : <div className="w-16" />}
      </div>

      {/* ── SETUP ── */}
      {phase === 'setup' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-slideUp">
          <div className="text-[80px] leading-none mb-2 animate-emberGlow select-none">🔥</div>
          <h2 className="font-display text-4xl mb-1" style={{ color: '#fff', textShadow: '0 0 30px rgba(249,115,22,0.6)' }}>
            Hot Seat
          </h2>
          <p className="text-sm mb-8 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
            10 questions · 3 lives · Timer shrinks · Streak multiplier
          </p>

          <div className="w-full max-w-sm">
            <label className="section-label-light mb-2 block">Your Name</label>
            <input
              className="dark-input ember"
              placeholder="Enter your name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />

            <label className="section-label-light mb-2 block">Choose Topic</label>
            <select
              className="dark-select"
              style={{ '--tw-ring-color': 'rgba(249,115,22,0.4)' } as React.CSSProperties}
              value={topicKey}
              onChange={e => setTopicKey(e.target.value)}
            >
              <option value="">— Select a topic —</option>
              {TOPIC_KEYS.map(k => (
                <option key={k} value={k}>{TOPIC_LABELS[k].emoji} {TOPIC_LABELS[k].title}</option>
              ))}
            </select>

            {!configured && (
              <p className="text-xs text-center mb-3" style={{ color: '#fb923c' }}>
                ⚠️ Firebase not connected — using local questions only
              </p>
            )}

            <button
              className="btn-ember"
              onClick={handleStart}
              disabled={!topicKey || loading}
            >
              {loading ? '⏳ Loading…' : '🔥 Start Challenge'}
            </button>
          </div>

          {/* Stats row */}
          <div className="flex gap-6 mt-8">
            {[
              { icon: '❤️', label: '3 Lives' },
              { icon: '⏱️', label: '15 → 10s' },
              { icon: '🔥', label: 'Streak ×2' },
            ].map(({ icon, label }) => (
              <div key={label} className="text-center">
                <div className="text-xl mb-1">{icon}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PLAYING / REVEAL ── */}
      {(phase === 'playing' || phase === 'reveal') && currentQ && (
        <div className="flex-1 flex flex-col items-center w-full">
        <div className="flex flex-col w-full max-w-2xl px-4 py-6 mx-auto">

          {/* Progress + streak + timer */}
          <div className="w-full flex items-center gap-3 mb-5">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(currentIdx / questions.length) * 100}%`,
                  background: 'linear-gradient(90deg, #f97316, #ef4444)',
                  boxShadow: '0 0 8px rgba(249,115,22,0.6)',
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              {streak > 1 && (
                <span
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
                  style={{ color: '#fdba74', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}
                >
                  🔥 ×{streak}
                </span>
              )}
              {phase === 'playing' && (
                <TimerRing
                  key={`${currentIdx}-${currentTimeLimit}`}
                  seconds={currentTimeLimit}
                  onEnd={handleTimerEnd}
                  paused={false}
                  size={44}
                />
              )}
            </div>
          </div>

          {/* Difficulty badge */}
          <div className="flex items-center gap-2 mb-3 self-start">
            <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Q{currentIdx + 1}/{questions.length}
            </p>
            {currentQ.difficulty && (
              <span
                className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full"
                style={{
                  background: currentQ.difficulty === 'hard' ? 'rgba(239,68,68,0.15)' : currentQ.difficulty === 'medium' ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
                  color: currentQ.difficulty === 'hard' ? '#f87171' : currentQ.difficulty === 'medium' ? '#fbbf24' : '#4ade80',
                  border: `1px solid ${currentQ.difficulty === 'hard' ? 'rgba(239,68,68,0.3)' : currentQ.difficulty === 'medium' ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'}`,
                }}
              >
                {currentQ.difficulty}
              </span>
            )}
            <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {currentTimeLimit}s
            </span>
          </div>

          <QuestionCard
            question={currentQ}
            selected={selected}
            revealed={phase === 'reveal'}
            onAnswer={handleAnswer}
            disabled={phase === 'reveal'}
          />

          {phase === 'reveal' && (
            <button
              className="btn-ember mt-6"
              style={{ fontSize: 16, padding: '14px 28px' }}
              onClick={handleNext}
            >
              {currentIdx + 1 < questions.length ? 'Next →' : '🏁 See Results'}
            </button>
          )}
        </div>
        </div>
      )}

      {/* ── DEAD (out of lives) ── */}
      {phase === 'dead' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-slideUp">
          <div className="text-[88px] leading-none mb-4 select-none" style={{ filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.8))' }}>
            💀
          </div>
          <h2 className="font-display text-4xl mb-2 text-center" style={{ color: '#ef4444', textShadow: '0 0 30px rgba(239,68,68,0.5)' }}>
            Game Over
          </h2>
          <p className="text-sm mb-6 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
            You ran out of lives on Q{currentIdx + 1}
          </p>
          <div
            className="font-mono text-4xl font-bold mb-1"
            style={{ color: '#fdba74', textShadow: '0 0 16px rgba(249,115,22,0.5)' }}
          >
            {score.toLocaleString()}
          </div>
          <p className="text-xs mb-8" style={{ color: 'rgba(255,255,255,0.3)' }}>points</p>

          <div className="grid grid-cols-2 gap-3 mb-8 w-full max-w-xs">
            {[
              { label: 'Correct', val: `${correct}/${results.length}`, color: '#4ade80' },
              { label: 'Best Streak', val: `🔥 ${maxStreak}`, color: '#fb923c' },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="font-mono text-xl font-bold" style={{ color }}>{val}</div>
                <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
              </div>
            ))}
          </div>

<div className="flex gap-4 w-full max-w-xs mt-2">
            <button
              onClick={handleStart}
              className="flex-1 py-4 rounded-2xl text-sm font-semibold transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.15)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
            >
              ↩ Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-4 rounded-2xl text-sm font-semibold transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', color: '#fff', border: 'none', boxShadow: '0 0 20px rgba(249,115,22,0.4)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 32px rgba(249,115,22,0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(249,115,22,0.4)'; }}
            >
              🏠 Home
            </button>
          </div>
        </div>
      )}

      {/* ── DONE (survived all 10) ── */}
      {phase === 'done' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-slideUp">
          <div
            className="text-[88px] leading-none mb-3 animate-crownPop select-none"
            style={{ filter: `drop-shadow(0 0 20px ${accuracy >= 0.8 ? 'rgba(249,115,22,0.9)' : accuracy >= 0.6 ? 'rgba(234,179,8,0.8)' : 'rgba(255,255,255,0.4)'})` }}
          >
            {accuracy >= 0.8 ? '🏆' : accuracy >= 0.6 ? '🎉' : '💪'}
          </div>
          <h2 className="font-display text-4xl mb-1 text-center" style={{ color: '#fff', textShadow: '0 0 30px rgba(249,115,22,0.5)' }}>
            {name ? `${name}'s Result` : 'You Survived!'}
          </h2>
          <div
            className="font-mono text-5xl font-bold my-4 animate-scoreSlide"
            style={{ color: '#fdba74', textShadow: '0 0 20px rgba(249,115,22,0.5)' }}
          >
            {score.toLocaleString()}
          </div>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>points · {lives} {lives === 1 ? 'life' : 'lives'} remaining</p>

          <div className="grid grid-cols-3 gap-3 mb-6 w-full max-w-sm">
            {[
              { label: 'Accuracy', val: `${Math.round(accuracy * 100)}%`, color: '#fdba74' },
              { label: 'Correct',  val: `${correct}/${questions.length}`, color: '#4ade80' },
              { label: 'Best Streak', val: `🔥 ${maxStreak}`, color: '#fb923c' },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                className="rounded-xl p-4 text-center"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="font-mono text-xl font-bold" style={{ color }}>{val}</div>
                <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Per-question dots */}
          <div className="w-full max-w-sm flex gap-1 mb-8">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex-1 h-2 rounded-full"
                title={`Q${i + 1}: ${r.correct ? '✓' : '✗'}`}
                style={{
                  background: r.correct
                    ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                    : 'rgba(239,68,68,0.6)',
                  boxShadow: r.correct ? '0 0 4px rgba(34,197,94,0.4)' : 'none',
                }}
              />
            ))}
          </div>

<div className="flex gap-4 w-full max-w-xs mt-2">
            <button
              onClick={handleStart}
              className="flex-1 py-4 rounded-2xl text-sm font-semibold transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.15)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
            >
              ↩ Play Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-4 rounded-2xl text-sm font-semibold transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', color: '#fff', border: 'none', boxShadow: '0 0 20px rgba(249,115,22,0.4)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 32px rgba(249,115,22,0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(249,115,22,0.4)'; }}
            >
              🏠 Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
