'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { TimerRing } from '@/components/quiz/TimerRing';
import { useFirebase } from '@/hooks/useFirebase';
import { getRandomQuestions } from '@/lib/firebase/questions';
import { TOPIC_LABELS, getGroupedTopics } from '@/types/question';
import type { Question } from '@/types/question';
import { calcTimeBonus, shuffle } from '@/lib/utils';

const TOPIC_KEYS = getGroupedTopics().flatMap(g => g.topics.map(t => t.key));
const BATTLE_COUNT = 10;
const TIME_LIMIT = 12;

type Phase = 'setup' | 'countdown' | 'playing' | 'reveal' | 'done';

interface Competitor {
  name: string;
  isHuman: boolean;
  score: number;
  correct: number;
  streak: number;
}

const AI_DIFFICULTY = {
  easy:   { accuracy: 0.5,  minTime: 3000, maxTime: 10000, label: '🟢 Easy',   desc: '50% accuracy' },
  medium: { accuracy: 0.7,  minTime: 2000, maxTime: 8000,  label: '🟡 Medium', desc: '70% accuracy' },
  hard:   { accuracy: 0.88, minTime: 1500, maxTime: 6000,  label: '🔴 Hard',   desc: '88% accuracy' },
};

export default function BattlePage() {
  const router = useRouter();
  const { configured } = useFirebase();

  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');
  const [vsAI, setVsAI] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [topicKey, setTopicKey] = useState('');

  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [countdown, setCountdown] = useState(3);

  const [p1, setP1] = useState<Competitor>({ name: 'Player 1', isHuman: true,  score: 0, correct: 0, streak: 0 });
  const [p2, setP2] = useState<Competitor>({ name: 'Player 2', isHuman: false, score: 0, correct: 0, streak: 0 });

  const [p1Selected, setP1Selected] = useState<number | null>(null);
  const [p2Selected, setP2Selected] = useState<number | null>(null);
  const [questionStart, setQuestionStart] = useState(0);

  async function handleStart() {
    if (!topicKey || !p1Name) return;
    const qs = await getRandomQuestions(topicKey, BATTLE_COUNT);
    if (qs.length === 0) { alert('No questions available for this topic.'); return; }
    setQuestions(qs);
    setCurrentIdx(0);
    setP1({ name: p1Name, isHuman: true, score: 0, correct: 0, streak: 0 });
    setP2({ name: vsAI ? `AI (${difficulty})` : (p2Name || 'Player 2'), isHuman: !vsAI, score: 0, correct: 0, streak: 0 });
    setP1Selected(null);
    setP2Selected(null);
    setCountdown(3);
    setPhase('countdown');
  }

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      setQuestionStart(Date.now());
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // AI answer
  useEffect(() => {
    if (phase !== 'playing' || !vsAI || !questions[currentIdx]) return;
    const q = questions[currentIdx];
    const diff = AI_DIFFICULTY[difficulty];
    const timeMs = diff.minTime + Math.random() * (diff.maxTime - diff.minTime);
    const willBeCorrect = Math.random() < diff.accuracy;
    const correctIndex = parseInt(q.answer, 10);
    const aiChoice = willBeCorrect ? correctIndex : (correctIndex === 0 ? 1 : 0);
    const t = setTimeout(() => {
      if (phase !== 'playing') return;
      handleP2Answer(aiChoice, timeMs);
    }, timeMs);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx, vsAI, difficulty]);

  const calcScore = (isCorrect: boolean, timeMs: number) => {
    if (!isCorrect) return 0;
    return 100 + calcTimeBonus(timeMs, TIME_LIMIT * 1000);
  };

  function handleP1Answer(index: number) {
    if (p1Selected !== null || phase !== 'playing') return;
    const timeMs = Date.now() - questionStart;
    setP1Selected(index);
    const q = questions[currentIdx];
    const isCorrect = index === parseInt(q.answer, 10);
    const earned = calcScore(isCorrect, timeMs);
    setP1(prev => ({
      ...prev,
      score: prev.score + earned,
      correct: prev.correct + (isCorrect ? 1 : 0),
      streak: isCorrect ? prev.streak + 1 : 0,
    }));
    if (p2Selected !== null) setPhase('reveal');
  }

  function handleP2Answer(index: number, overrideTime?: number) {
    if (p2Selected !== null) return;
    const timeMs = overrideTime ?? (Date.now() - questionStart);
    setP2Selected(index);
    const q = questions[currentIdx];
    const isCorrect = index === parseInt(q.answer, 10);
    const earned = calcScore(isCorrect, timeMs);
    setP2(prev => ({
      ...prev,
      score: prev.score + earned,
      correct: prev.correct + (isCorrect ? 1 : 0),
      streak: isCorrect ? prev.streak + 1 : 0,
    }));
    if (p1Selected !== null) setPhase('reveal');
  }

  function handleTimerEnd() {
    if (p1Selected === null) handleP1Answer(-1);
  }

  function handleNext() {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= questions.length) { setPhase('done'); return; }
    setCurrentIdx(nextIdx);
    setP1Selected(null);
    setP2Selected(null);
    setPhase('playing');
    setQuestionStart(Date.now());
  }

  const currentQ = questions[currentIdx];
  const p1Winning = p1.score > p2.score;
  const tied = p1.score === p2.score;

  const countdownColors = ['', '#22d3ee', '#8b5cf6', '#d946ef'];

  return (
    <div className="battle-screen flex flex-col min-h-screen">

      {/* Nav */}
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', background: 'rgba(6,0,15,0.4)' }}>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(139,92,246,0.9)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-base" style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.8))' }}>⚔️</span>
          <span className="font-display text-lg" style={{ color: '#fff', letterSpacing: '0.02em' }}>Battle Mode</span>
        </div>
        <div className="w-12" />
      </div>

      {/* ── SETUP ── */}
      {phase === 'setup' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-slideUp">

          {/* Swords hero */}
          <div className="text-[80px] leading-none mb-2 animate-swordsClash select-none">⚔️</div>
          <h2 className="font-display text-4xl mb-1" style={{ color: '#fff', textShadow: '0 0 30px rgba(139,92,246,0.6)' }}>
            Battle Mode
          </h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Head-to-head · First to answer wins each round
          </p>

          <div className="w-full max-w-lg">

            {/* Mode toggle */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setVsAI(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: !vsAI ? 'linear-gradient(135deg,rgba(139,92,246,0.35),rgba(139,92,246,0.15))' : 'rgba(255,255,255,0.04)',
                  color: !vsAI ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                  border: `1.5px solid ${!vsAI ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: !vsAI ? '0 0 16px rgba(139,92,246,0.25)' : 'none',
                }}
              >
                👥 vs Player
              </button>
              <button
                onClick={() => setVsAI(true)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: vsAI ? 'linear-gradient(135deg,rgba(217,70,239,0.35),rgba(217,70,239,0.15))' : 'rgba(255,255,255,0.04)',
                  color: vsAI ? '#f0abfc' : 'rgba(255,255,255,0.45)',
                  border: `1.5px solid ${vsAI ? 'rgba(217,70,239,0.6)' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: vsAI ? '0 0 16px rgba(217,70,239,0.25)' : 'none',
                }}
              >
                🤖 vs AI
              </button>
            </div>

            {/* Fighter cards */}
            <div className="flex gap-4 mb-5" style={{ alignItems: 'flex-start' }}>

              {/* P1 card */}
              <div className="fighter-card-p1 flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(139,92,246,0.3)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' }}>1</span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(139,92,246,0.8)' }}>Player 1</span>
                </div>
                <input
                  className="dark-input"
                  placeholder="Your name"
                  value={p1Name}
                  onChange={e => setP1Name(e.target.value)}
                  autoFocus
                />
              </div>

              {/* VS divider */}
              <div className="flex flex-col items-center justify-center pt-8 px-1" style={{ minWidth: 44 }}>
                <span
                  className="font-display text-3xl animate-vsGlow select-none"
                  style={{ color: '#fff', lineHeight: 1 }}
                >
                  VS
                </span>
              </div>

              {/* P2 card */}
              <div className="fighter-card-p2 flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(217,70,239,0.3)', color: '#f0abfc', border: '1px solid rgba(217,70,239,0.4)' }}>2</span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(217,70,239,0.8)' }}>{vsAI ? 'AI Bot' : 'Player 2'}</span>
                </div>
                {vsAI ? (
                  <div>
                    <div className="flex flex-col gap-2">
                      {(['easy', 'medium', 'hard'] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold text-left transition-all"
                          style={{
                            background: difficulty === d ? 'rgba(217,70,239,0.2)' : 'rgba(255,255,255,0.03)',
                            color: difficulty === d ? '#f0abfc' : 'rgba(255,255,255,0.45)',
                            border: `1.5px solid ${difficulty === d ? 'rgba(217,70,239,0.5)' : 'rgba(255,255,255,0.07)'}`,
                          }}
                        >
                          {AI_DIFFICULTY[d].label} <span style={{ opacity: 0.6, fontWeight: 400 }}>— {AI_DIFFICULTY[d].desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <input
                    className="dark-input"
                    style={{ borderColor: 'rgba(217,70,239,0.25)' }}
                    placeholder="Opponent name"
                    value={p2Name}
                    onChange={e => setP2Name(e.target.value)}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'rgba(217,70,239,0.7)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,70,239,0.18), 0 0 16px rgba(217,70,239,0.1)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(217,70,239,0.25)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                )}
              </div>
            </div>

            {/* Topic */}
            <div className="mb-6">
              <label className="section-label-light mb-2 block">Choose Topic</label>
              <select
                className="dark-select"
                value={topicKey}
                onChange={e => setTopicKey(e.target.value)}
              >
                <option value="">— Select a topic —</option>
                {TOPIC_KEYS.map(k => (
                  <option key={k} value={k}>{TOPIC_LABELS[k].emoji} {TOPIC_LABELS[k].title}</option>
                ))}
              </select>
            </div>

            <button
              className="btn-battle"
              onClick={handleStart}
              disabled={!topicKey || !p1Name || (!vsAI && !p2Name)}
            >
              ⚔️ Start Battle
            </button>
          </div>
        </div>
      )}

      {/* ── COUNTDOWN ── */}
      {phase === 'countdown' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center animate-crownPop">
            <div
              className="font-display leading-none"
              style={{
                fontSize: countdown > 0 ? 160 : 96,
                color: countdown > 0 ? (countdownColors[countdown] || '#fff') : '#a78bfa',
                textShadow: countdown > 0
                  ? `0 0 40px ${countdownColors[countdown] || '#fff'}, 0 0 80px ${countdownColors[countdown] || '#fff'}`
                  : '0 0 40px rgba(167,139,250,0.8), 0 0 80px rgba(139,92,246,0.6)',
              }}
            >
              {countdown > 0 ? countdown : 'GO!'}
            </div>
            {countdown > 0 && (
              <p className="text-sm mt-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {p1.name} vs {p2.name}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── PLAYING / REVEAL ── */}
      {(phase === 'playing' || phase === 'reveal') && currentQ && (
        <div className="flex-1 flex flex-col">

          {/* Score bar */}
          <div
            className="flex items-center px-5 py-3 gap-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6,0,15,0.5)', backdropFilter: 'blur(12px)' }}
          >
            {/* P1 */}
            <div className="flex-1">
              <div className="flex items-center gap-2 justify-start">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'rgba(139,92,246,0.3)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' }}
                >1</span>
                <p className="text-sm font-semibold truncate" style={{ color: p1Winning ? '#c4b5fd' : 'rgba(255,255,255,0.75)' }}>{p1.name}</p>
              </div>
              <p className="font-mono text-2xl font-bold mt-0.5 ml-8" style={{ color: p1Winning ? '#a78bfa' : 'rgba(255,255,255,0.6)' }}>
                {p1.score.toLocaleString()}
              </p>
              {p1Selected !== null && (
                <p className="text-xs font-bold ml-8" style={{ color: p1Selected === parseInt(currentQ.answer) ? '#4ade80' : '#f87171' }}>
                  {p1Selected === parseInt(currentQ.answer) ? '✓ correct' : '✗ wrong'}
                </p>
              )}
            </div>

            {/* Timer center */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              {phase === 'playing' && <TimerRing seconds={TIME_LIMIT} onEnd={handleTimerEnd} paused={false} size={44} />}
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {currentIdx + 1}/{questions.length}
              </span>
            </div>

            {/* P2 */}
            <div className="flex-1 text-right">
              <div className="flex items-center gap-2 justify-end">
                <p className="text-sm font-semibold truncate" style={{ color: !p1Winning && !tied ? '#f0abfc' : 'rgba(255,255,255,0.75)' }}>{p2.name}</p>
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'rgba(217,70,239,0.3)', color: '#f0abfc', border: '1px solid rgba(217,70,239,0.4)' }}
                >2</span>
              </div>
              <p className="font-mono text-2xl font-bold mt-0.5 mr-8" style={{ color: !p1Winning && !tied ? '#e879f9' : 'rgba(255,255,255,0.6)' }}>
                {p2.score.toLocaleString()}
              </p>
              {p2Selected !== null && (
                <p className="text-xs font-bold mr-8" style={{ color: p2Selected === parseInt(currentQ.answer) ? '#4ade80' : '#f87171' }}>
                  {p2Selected === parseInt(currentQ.answer) ? '✓ correct' : '✗ wrong'}
                </p>
              )}
            </div>
          </div>

          {/* Question */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-2xl mx-auto w-full">
            <QuestionCard
              question={currentQ}
              selected={p1Selected}
              revealed={phase === 'reveal'}
              onAnswer={handleP1Answer}
              disabled={p1Selected !== null}
            />
            {phase === 'reveal' && (
              <button className="btn-battle mt-6" style={{ fontSize: 16, padding: '14px 28px' }} onClick={handleNext}>
                {currentIdx + 1 < questions.length ? 'Next Round →' : '🏁 See Results'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (() => {
        const p1Won = p1.score > p2.score;
        const p2Won = p2.score > p1.score;
        const winner = p1Won ? p1 : p2Won ? p2 : null;
        return (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-slideUp">
            {/* Trophy */}
            <div
              className="text-[88px] leading-none mb-3 animate-crownPop select-none"
              style={{ filter: `drop-shadow(0 0 20px ${p1Won ? 'rgba(139,92,246,0.8)' : p2Won ? 'rgba(217,70,239,0.8)' : 'rgba(255,255,255,0.5)'})` }}
            >
              {p1Won ? '🏆' : p2Won ? '🎊' : '🤝'}
            </div>
            <h2
              className="font-display text-4xl mb-1 text-center"
              style={{ color: '#fff', textShadow: '0 0 30px rgba(139,92,246,0.5)' }}
            >
              {winner ? `${winner.name} wins!` : "It's a draw!"}
            </h2>
            <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {BATTLE_COUNT} rounds complete
            </p>

            {/* Score cards */}
            <div className="flex gap-4 w-full max-w-sm mb-8">
              {[p1, p2].map((p, i) => {
                const other = i === 0 ? p2 : p1;
                const isWinner = p.score > other.score;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-2xl p-5 text-center"
                    style={{
                      background: isWinner
                        ? `linear-gradient(160deg, ${i === 0 ? 'rgba(139,92,246,0.2)' : 'rgba(217,70,239,0.2)'}, ${i === 0 ? 'rgba(139,92,246,0.05)' : 'rgba(217,70,239,0.05)'})`
                        : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${isWinner ? (i === 0 ? 'rgba(139,92,246,0.5)' : 'rgba(217,70,239,0.5)') : 'rgba(255,255,255,0.08)'}`,
                      boxShadow: isWinner ? `0 0 20px ${i === 0 ? 'rgba(139,92,246,0.2)' : 'rgba(217,70,239,0.2)'}` : 'none',
                    }}
                  >
                    {isWinner && <div className="text-lg mb-1">👑</div>}
                    <p className="text-xs font-semibold mb-2 truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>{p.name}</p>
                    <p
                      className="font-mono text-3xl font-bold"
                      style={{ color: isWinner ? (i === 0 ? '#a78bfa' : '#e879f9') : 'rgba(255,255,255,0.5)' }}
                    >
                      {p.score.toLocaleString()}
                    </p>
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {p.correct}/{BATTLE_COUNT} correct
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setPhase('setup'); }}
                className="px-6 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              >
                ↩ Rematch
              </button>
              <button
                onClick={() => router.push('/')}
                className="btn-battle"
                style={{ width: 'auto', fontSize: 14, padding: '12px 24px' }}
              >
                🏠 Home
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
