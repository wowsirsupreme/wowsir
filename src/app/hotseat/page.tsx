'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { TimerRing } from '@/components/quiz/TimerRing';
import { useFirebase } from '@/hooks/useFirebase';
import { getRandomQuestions } from '@/lib/firebase/questions';
import { TOPIC_LABELS } from '@/types/question';
import type { Question } from '@/types/question';
import { calcTimeBonus } from '@/lib/utils';

const TOPIC_KEYS = Object.keys(TOPIC_LABELS);
const HOT_SEAT_COUNT = 10;
const TIME_LIMIT = 15;

type Phase = 'setup' | 'playing' | 'reveal' | 'done';

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
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [questionStart, setQuestionStart] = useState(0);
  const [results, setResults] = useState<{ correct: boolean; timeMs: number; score: number }[]>([]);

  async function handleStart() {
    if (!topicKey) return;
    const qs = await getRandomQuestions(topicKey, HOT_SEAT_COUNT);
    if (qs.length === 0) { alert('No questions available for this topic yet.'); return; }
    setQuestions(qs);
    setCurrentIdx(0);
    setScore(0);
    setCorrect(0);
    setStreak(0);
    setMaxStreak(0);
    setResults([]);
    setSelected(null);
    setPhase('playing');
    setQuestionStart(Date.now());
  }

  const handleAnswer = useCallback((index: number) => {
    if (selected !== null || !questions[currentIdx]) return;
    const timeMs = Date.now() - questionStart;
    const q = questions[currentIdx];
    const correctIndex = parseInt(q.answer, 10);
    const isCorrect = index === correctIndex;
    const timeBonus = isCorrect ? calcTimeBonus(timeMs, TIME_LIMIT * 1000) : 0;
    const earned = isCorrect ? 100 + timeBonus : 0;

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
    }
    setResults(r => [...r, { correct: isCorrect, timeMs, score: earned }]);
  }, [selected, questions, currentIdx, questionStart]);

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
          <div className="font-mono text-sm font-bold" style={{ color: '#fdba74' }}>
            {score.toLocaleString()} pts
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
            10 questions · 15 seconds each · Streak bonuses
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
              disabled={!topicKey}
            >
              🔥 Start Challenge
            </button>
          </div>

          {/* Stats row */}
          <div className="flex gap-6 mt-8">
            {[
              { icon: '❓', label: '10 Questions' },
              { icon: '⏱️', label: '15s Per Q' },
              { icon: '🔥', label: 'Streak Bonus' },
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
        <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-2xl mx-auto w-full">

          {/* Progress bar + streak + timer */}
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
                  className="text-xs font-mono font-bold animate-pulse-slow px-2 py-0.5 rounded-full"
                  style={{ color: '#fdba74', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}
                >
                  🔥 ×{streak}
                </span>
              )}
              {phase === 'playing' && (
                <TimerRing seconds={TIME_LIMIT} onEnd={handleTimerEnd} paused={false} size={44} />
              )}
            </div>
          </div>

          <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Question {currentIdx + 1} of {questions.length}
          </p>

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
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-slideUp">
          <div
            className="text-[88px] leading-none mb-3 animate-crownPop select-none"
            style={{ filter: `drop-shadow(0 0 20px ${accuracy >= 0.8 ? 'rgba(249,115,22,0.9)' : accuracy >= 0.6 ? 'rgba(234,179,8,0.8)' : 'rgba(255,255,255,0.4)'})` }}
          >
            {accuracy >= 0.8 ? '🏆' : accuracy >= 0.6 ? '🎉' : '💪'}
          </div>
          <h2 className="font-display text-4xl mb-1 text-center" style={{ color: '#fff', textShadow: '0 0 30px rgba(249,115,22,0.5)' }}>
            {name ? `${name}'s Result` : 'Your Result'}
          </h2>
          <div
            className="font-mono text-5xl font-bold my-4 animate-scoreSlide"
            style={{ color: '#fdba74', textShadow: '0 0 20px rgba(249,115,22,0.5)' }}
          >
            {score.toLocaleString()}
          </div>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>points</p>

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

          <div className="flex gap-3">
            <button
              onClick={handleStart}
              className="px-6 py-3 rounded-xl text-sm font-semibold"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.7)',
                border: '1.5px solid rgba(255,255,255,0.12)',
              }}
            >
              Try Again
            </button>
            <button className="btn-ember" style={{ width: 'auto', fontSize: 14, padding: '12px 24px' }} onClick={() => router.push('/')}>
              🏠 Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
