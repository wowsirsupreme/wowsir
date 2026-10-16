'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { TimerRing } from '@/components/quiz/TimerRing';
import { useFirebase } from '@/hooks/useFirebase';
import { getQuestionsByTopic } from '@/lib/firebase/questions';
import { TOPIC_LABELS, getGroupedTopics } from '@/types/question';
import TopicPicker from '@/components/TopicPicker';
import { allGradeQuestions } from '@/data/grades';
import type { Question } from '@/types/question';
import { calcTimeBonus, resolveAnswerIndex } from '@/lib/utils';
import { audioEngine } from '@/lib/audioEngine';
import { submitScore } from '@/lib/firebase/leaderboard';
import QuizNav from '@/components/QuizNav';

// Only show topics that have at least one local question
const LOCAL_TOPIC_KEYS = new Set((allGradeQuestions as Question[]).map(q => q.topicKey));
const VALID_KEYS = new Set(getGroupedTopics().flatMap(g => g.topics.map(t => t.key)));
const TOPIC_KEYS = Object.keys(TOPIC_LABELS).filter(k => LOCAL_TOPIC_KEYS.has(k) && VALID_KEYS.has(k));
const ROUND_SIZE = 10;
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
  const idx = resolveAnswerIndex(answerText);
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

type Phase = 'setup' | 'playing' | 'reveal' | 'dead' | 'between_rounds' | 'done';

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
  const [error, setError] = useState('');
  const [scoreSaved, setScoreSaved] = useState(false);

  // Round / progression state
  const [rounds, setRounds] = useState<Question[][]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalScore, setTotalScore] = useState(0);   // sum from completed rounds
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalQs, setTotalQs] = useState(0);         // total questions in all rounds
  const [grandMaxStreak, setGrandMaxStreak] = useState(0);

  // Ref to track lives within handleAnswer without stale closure issues
  const livesRef = useRef(MAX_LIVES);

  async function handleStart() {
    if (!topicKey) return;
    setLoading(true);
    let remote: Question[] = [];
    try { remote = await getQuestionsByTopic(topicKey); } catch { /* offline */ }
    const pool = mergeQuestions(remote, topicKey);
    if (pool.length === 0) { setError('No questions available for this topic yet.'); setLoading(false); return; }
    const sorted = sortByDifficulty(pool);
    // Split the full pool into rounds of ROUND_SIZE
    const rds: Question[][] = [];
    for (let i = 0; i < sorted.length; i += ROUND_SIZE) {
      rds.push(sorted.slice(i, i + ROUND_SIZE).map(prepareQuestion));
    }
    setRounds(rds);
    setTotalQs(sorted.length);
    setCurrentRound(0);
    setTotalScore(0);
    setTotalCorrect(0);
    setGrandMaxStreak(0);
    setQuestions(rds[0]);
    setCurrentIdx(0);
    setScore(0);
    setCorrect(0);
    setLives(MAX_LIVES);
    livesRef.current = MAX_LIVES;
    setStreak(0);
    setMaxStreak(0);
    setResults([]);
    setSelected(null);
    setScoreSaved(false);
    setLoading(false);
    setPhase('playing');
    setQuestionStart(Date.now());
  }

  function handleNextRound() {
    const next = currentRound + 1;
    setTotalScore(ts => ts + score);
    setTotalCorrect(tc => tc + correct);
    setGrandMaxStreak(g => Math.max(g, maxStreak));
    setCurrentRound(next);
    setQuestions(rounds[next]);
    setCurrentIdx(0);
    setScore(0);
    setCorrect(0);
    setLives(MAX_LIVES);
    livesRef.current = MAX_LIVES;
    setStreak(0);
    setMaxStreak(0);
    setResults([]);
    setSelected(null);
    setPhase('playing');
    setQuestionStart(Date.now());
  }

  function handleEndEarly() {
    setTotalScore(ts => ts + score);
    setTotalCorrect(tc => tc + correct);
    setGrandMaxStreak(g => Math.max(g, maxStreak));
    setPhase('done');
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
      const ns = streak + 1;
      if (ns >= 3) audioEngine.streak();
      else audioEngine.correct();
      setScore(s => s + earned);
      setCorrect(c => c + 1);
      setStreak(s => {
        const ns2 = s + 1;
        setMaxStreak(m => Math.max(m, ns2));
        return ns2;
      });
    } else {
      if (index !== -1) audioEngine.wrong();
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
    if (nextIdx >= questions.length) {
      const isLastRound = currentRound + 1 >= rounds.length;
      setPhase(isLastRound ? 'done' : 'between_rounds');
      return;
    }
    setCurrentIdx(nextIdx);
    setSelected(null);
    setPhase('playing');
    setQuestionStart(Date.now());
  }

  // Pre-fill name from localStorage (shared with join/student pages)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('playerName');
      if (saved) setName(saved);
    } catch {}
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase === 'playing') audioEngine.startMusic('chill');
    if (phase === 'done' || phase === 'dead' || phase === 'setup') audioEngine.stopMusic();
    if (phase === 'done') setTimeout(() => audioEngine.win(), 300);
    if (phase === 'dead') setTimeout(() => audioEngine.lose(), 300);
  }, [phase]);

  // Save score to leaderboard when 'done'
  useEffect(() => {
    if (phase !== 'done' || scoreSaved) return;
    setScoreSaved(true);
    const roundTimeMs = results.reduce((s, r) => s + r.timeMs, 0);
    const grandScore = totalScore + score;
    const grandCorrect = totalCorrect + correct;
    const grandTotal = totalQs || questions.length;
    submitScore({
      name: name.trim() || 'Anonymous',
      score: grandScore,
      gradeKey: topicKey,
      level: currentRound + 1,
      accuracy: grandTotal > 0 ? Math.round((grandCorrect / grandTotal) * 100) : 0,
      streak: Math.max(grandMaxStreak, maxStreak),
      totalTimeMs: roundTimeMs,
      source: 'hotseat',
    }).catch(() => { /* best-effort */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const currentQ = questions[currentIdx];
  const accuracy = results.length > 0 ? correct / results.length : 0;
  const currentTimeLimit = timeForIdx(currentIdx);
  const totalTimeMs = results.reduce((s, r) => s + r.timeMs, 0);
  const totalTimeSec = (totalTimeMs / 1000).toFixed(1);

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
          onClick={() => router.push('/student')}
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
            Rounds of 10 · 3 lives/round · Timer shrinks · Streak multiplier
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
            <TopicPicker value={topicKey} onChange={k => { setTopicKey(k); setError(''); }} />

            {!configured && (
              <p className="text-xs text-center mb-3" style={{ color: '#fb923c' }}>
                ⚠️ Firebase not connected — using local questions only
              </p>
            )}

            {error && (
              <p className="text-sm text-red-400 text-center -mt-2 mb-1">{error}</p>
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
        <div className="flex flex-col w-full max-w-3xl px-6 py-10 mx-auto">

          {/* Progress + streak + timer */}
          <div className="w-full flex items-center gap-4 mb-8">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(currentIdx / questions.length) * 100}%`,
                  background: 'linear-gradient(90deg, #f97316, #ef4444)',
                  boxShadow: '0 0 8px rgba(249,115,22,0.6)',
                }}
              />
            </div>
            <div className="flex items-center gap-4">
              {streak > 1 && (
                <span
                  className="text-sm font-mono font-bold px-3 py-1 rounded-full"
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
                  size={52}
                />
              )}
            </div>
          </div>

          {/* Q counter + difficulty badge + time */}
          <div className="flex items-center gap-3 mb-5 self-start">
            <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' }}>
              Round {currentRound + 1}/{rounds.length || 1}
            </span>
            <p className="text-sm font-mono uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Q{currentIdx + 1}/{questions.length}
            </p>
            {currentQ.difficulty && (
              <span
                className="text-xs font-mono uppercase px-3 py-1 rounded-full"
                style={{
                  background: currentQ.difficulty === 'hard' ? 'rgba(239,68,68,0.15)' : currentQ.difficulty === 'medium' ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
                  color: currentQ.difficulty === 'hard' ? '#f87171' : currentQ.difficulty === 'medium' ? '#fbbf24' : '#4ade80',
                  border: `1px solid ${currentQ.difficulty === 'hard' ? 'rgba(239,68,68,0.3)' : currentQ.difficulty === 'medium' ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'}`,
                }}
              >
                {currentQ.difficulty}
              </span>
            )}
            <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
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
              className="btn-ember"
              style={{ fontSize: 17, padding: '16px 36px', marginTop: '1rem' }}
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

<div className="flex gap-5 w-full max-w-sm px-2">
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
              onClick={() => router.push('/student')}
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

      {/* ── BETWEEN ROUNDS ── */}
      {phase === 'between_rounds' && (() => {
        const roundAcc = results.length > 0 ? correct / results.length : 0;
        const doneQs = rounds.slice(0, currentRound + 1).reduce((s, r) => s + r.length, 0);
        const pct = Math.round((doneQs / totalQs) * 100);
        return (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-slideUp">
            <div className="text-[64px] leading-none mb-2 select-none">
              {roundAcc >= 0.8 ? '🔥' : roundAcc >= 0.6 ? '👍' : '💪'}
            </div>
            <h2 className="font-display text-3xl mb-1 text-center" style={{ color: '#fff' }}>
              Round {currentRound + 1} Complete!
            </h2>
            <p className="text-sm mb-6 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {doneQs} of {totalQs} questions done · {pct}% through the bank
            </p>

            {/* Progress bar across full bank */}
            <div className="w-full max-w-sm h-2 rounded-full overflow-hidden mb-6" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#f97316,#ef4444)', boxShadow: '0 0 8px rgba(249,115,22,0.5)' }} />
            </div>

            {/* Round stats */}
            <div className="grid grid-cols-3 gap-3 mb-8 w-full max-w-sm">
              {[
                { label: 'Score', val: score.toLocaleString(), color: '#fdba74' },
                { label: 'Correct', val: `${correct}/${questions.length}`, color: '#4ade80' },
                { label: 'Streak', val: `🔥 ${maxStreak}`, color: '#fb923c' },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="font-mono text-lg font-bold" style={{ color }}>{val}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 w-full max-w-sm">
              <button
                onClick={handleEndEarly}
                className="flex-1 py-4 rounded-2xl text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.12)' }}
              >
                Stop here
              </button>
              <button
                onClick={handleNextRound}
                className="flex-1 py-4 rounded-2xl text-sm font-bold"
                style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff', border: 'none', boxShadow: '0 0 20px rgba(249,115,22,0.4)' }}
              >
                Round {currentRound + 2} →
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── DONE ── */}
      {phase === 'done' && (() => {
        const isConquest = rounds.length > 1 && currentRound + 1 >= rounds.length;
        const grandScore = totalScore + score;
        const grandCorrect = totalCorrect + correct;
        const grandTotal = totalQs || questions.length;
        const grandAcc = grandTotal > 0 ? grandCorrect / grandTotal : accuracy;
        const bestStreak = Math.max(grandMaxStreak, maxStreak);
        const emoji = isConquest ? '🏆' : grandAcc >= 0.8 ? '🎉' : grandAcc >= 0.6 ? '👍' : '💪';
        return (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-slideUp">
            <div
              className="text-[88px] leading-none mb-3 animate-crownPop select-none"
              style={{ filter: `drop-shadow(0 0 20px ${isConquest ? 'rgba(250,204,21,0.9)' : grandAcc >= 0.8 ? 'rgba(249,115,22,0.9)' : grandAcc >= 0.6 ? 'rgba(234,179,8,0.8)' : 'rgba(255,255,255,0.4)'})` }}
            >
              {emoji}
            </div>

            {isConquest && (
              <div className="px-4 py-1.5 rounded-full text-xs font-bold mb-3 tracking-wide"
                style={{ background: 'linear-gradient(90deg,rgba(250,204,21,0.2),rgba(249,115,22,0.2))', border: '1px solid rgba(250,204,21,0.4)', color: '#fde047' }}>
                🎓 Topic Conquered · All {grandTotal} Questions Done
              </div>
            )}

            <h2 className="font-display text-4xl mb-1 text-center" style={{ color: '#fff', textShadow: '0 0 30px rgba(249,115,22,0.5)' }}>
              {name ? `${name}'s Result` : (isConquest ? 'Conquered!' : 'You Survived!')}
            </h2>

            {rounds.length > 1 && (
              <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {currentRound + 1} round{currentRound + 1 !== 1 ? 's' : ''} · {grandCorrect}/{grandTotal} questions
              </p>
            )}

            <div
              className="font-mono text-5xl font-bold my-4 animate-scoreSlide"
              style={{ color: '#fdba74', textShadow: '0 0 20px rgba(249,115,22,0.5)' }}
            >
              {grandScore.toLocaleString()}
            </div>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {rounds.length > 1 ? 'total points' : `points · ${lives} ${lives === 1 ? 'life' : 'lives'} remaining`}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6 w-full max-w-sm">
              {[
                { label: 'Accuracy', val: `${Math.round(grandAcc * 100)}%`, color: '#fdba74' },
                { label: 'Correct',  val: `${grandCorrect}/${grandTotal}`, color: '#4ade80' },
                { label: 'Best Streak', val: `🔥 ${bestStreak}`, color: '#fb923c' },
                { label: 'Total Time', val: `⏱ ${totalTimeSec}s`, color: '#a78bfa' },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-xl p-4 text-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="font-mono text-xl font-bold" style={{ color }}>{val}</div>
                  <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Per-question dots — last round only */}
            <div className="w-full max-w-sm flex gap-1 mb-12">
              {results.map((r, i) => (
                <div key={i} className="flex-1 h-2 rounded-full" title={`Q${i + 1}: ${r.correct ? '✓' : '✗'}`}
                  style={{
                    background: r.correct ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'rgba(239,68,68,0.6)',
                    boxShadow: r.correct ? '0 0 4px rgba(34,197,94,0.4)' : 'none',
                  }} />
              ))}
            </div>

            <div className="flex gap-5 w-full max-w-sm px-2">
              <button onClick={handleStart}
                className="flex-1 py-4 rounded-2xl text-sm font-semibold transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.15)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}>
                ↩ Play Again
              </button>
              <button onClick={() => router.push('/student')}
                className="flex-1 py-4 rounded-2xl text-sm font-semibold transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', color: '#fff', border: 'none', boxShadow: '0 0 20px rgba(249,115,22,0.4)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 32px rgba(249,115,22,0.7)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(249,115,22,0.4)'; }}>
                🏠 Home
              </button>
            </div>
          </div>
        );
      })()}
      <QuizNav />
    </div>
  );
}
