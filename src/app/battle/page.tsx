'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { TimerRing } from '@/components/quiz/TimerRing';
import TopicPicker from '@/components/TopicPicker';
import { useFirebase } from '@/hooks/useFirebase';
import { getQuestionsByTopic } from '@/lib/firebase/questions';
import { allGradeQuestions } from '@/data/grades';
import type { Question } from '@/types/question';
import { calcTimeBonus } from '@/lib/utils';
import { audioEngine } from '@/lib/audioEngine';
import QuizNav from '@/components/QuizNav';

const ROUND_SIZE   = 10;
const TIME_LIMIT   = 12;

type Phase = 'setup' | 'countdown' | 'playing' | 'reveal' | 'between_rounds' | 'done';

/** Normalise answer index → text, shuffle options */
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

interface Competitor {
  name: string;
  isHuman: boolean;
  score: number;
  correct: number;
  streak: number;
}

const AI_DIFFICULTY = {
  easy:   { accuracy: 0.5,  minTime: 3000, maxTime: 10000, label: 'Easy',   desc: '50% accuracy', color: '#4ade80' },
  medium: { accuracy: 0.7,  minTime: 2000, maxTime: 8000,  label: 'Medium', desc: '70% accuracy', color: '#fbbf24' },
  hard:   { accuracy: 0.88, minTime: 1500, maxTime: 6000,  label: 'Hard',   desc: '88% accuracy', color: '#f87171' },
};

export default function BattlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { configured } = useFirebase();

  /* ── setup state ── */
  const [p1Name,     setP1Name]     = useState(() => searchParams.get('name') ?? '');
  const [p2Name,     setP2Name]     = useState('');
  const [vsAI,       setVsAI]       = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [topicKey,   setTopicKey]   = useState('');

  /* ── game state ── */
  const [phase,        setPhase]        = useState<Phase>('setup');
  const [questions,    setQuestions]    = useState<Question[]>([]);
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [countdown,    setCountdown]    = useState(3);

  /* ── rounds state ── */
  const [rounds,       setRounds]       = useState<Question[][]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalQs,      setTotalQs]      = useState(0);
  const [p1TotalScore, setP1TotalScore] = useState(0);
  const [p2TotalScore, setP2TotalScore] = useState(0);
  const [p1TotalCorrect, setP1TotalCorrect] = useState(0);
  const [p2TotalCorrect, setP2TotalCorrect] = useState(0);

  const [p1, setP1] = useState<Competitor>({ name: 'Player 1', isHuman: true,  score: 0, correct: 0, streak: 0 });
  const [p2, setP2] = useState<Competitor>({ name: 'Player 2', isHuman: false, score: 0, correct: 0, streak: 0 });

  /* Use refs for selections so AI timeout always reads fresh values */
  const p1SelectedRef = useRef<number | null>(null);
  const p2SelectedRef = useRef<number | null>(null);
  const [p1Selected,  setP1Selected]  = useState<number | null>(null);
  const [p2Selected,  setP2Selected]  = useState<number | null>(null);
  const [questionStart, setQuestionStart] = useState(0);
  const phaseRef = useRef<Phase>('setup');

  /* ── helpers ── */
  const calcScore = (isCorrect: boolean, timeMs: number) =>
    isCorrect ? 100 + calcTimeBonus(timeMs, TIME_LIMIT * 1000) : 0;

  function resetRound() {
    p1SelectedRef.current = null;
    p2SelectedRef.current = null;
    setP1Selected(null);
    setP2Selected(null);
  }

  /* ── start ── */
  async function handleStart() {
    if (!topicKey || !p1Name) return;
    let remote: Question[] = [];
    try { remote = await getQuestionsByTopic(topicKey); } catch { /* offline */ }
    // merge with local
    const local = (allGradeQuestions as Question[]).filter(q => q.topicKey === topicKey && (q as unknown as { approved?: boolean }).approved !== false);
    const remoteIds = new Set(remote.map(q => q.id));
    const merged = [...remote, ...local.filter(q => !remoteIds.has(q.id))];
    const pool = merged.length > 0 ? merged : local;
    if (pool.length === 0) { alert('No questions found for this topic.'); return; }
    // shuffle and split into rounds
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const rds: Question[][] = [];
    for (let i = 0; i < shuffled.length; i += ROUND_SIZE) {
      rds.push(shuffled.slice(i, i + ROUND_SIZE).map(prepareQuestion));
    }
    setRounds(rds);
    setCurrentRound(0);
    setTotalQs(shuffled.length);
    setP1TotalScore(0); setP1TotalCorrect(0);
    setP2TotalScore(0); setP2TotalCorrect(0);
    setQuestions(rds[0]);
    setCurrentIdx(0);
    setP1({ name: p1Name, isHuman: true, score: 0, correct: 0, streak: 0 });
    setP2({ name: vsAI ? `AI · ${difficulty}` : (p2Name || 'Player 2'), isHuman: !vsAI, score: 0, correct: 0, streak: 0 });
    resetRound();
    setCountdown(3);
    setPhase('countdown');
    phaseRef.current = 'countdown';
  }

  /* ── next round ── */
  function handleNextRound() {
    const next = currentRound + 1;
    setP1TotalScore(ts => ts + p1.score);
    setP2TotalScore(ts => ts + p2.score);
    setP1TotalCorrect(tc => tc + p1.correct);
    setP2TotalCorrect(tc => tc + p2.correct);
    setCurrentRound(next);
    setQuestions(rounds[next]);
    setCurrentIdx(0);
    setP1(prev => ({ ...prev, score: 0, correct: 0, streak: 0 }));
    setP2(prev => ({ ...prev, score: 0, correct: 0, streak: 0 }));
    resetRound();
    setCountdown(3);
    setPhase('countdown');
    phaseRef.current = 'countdown';
  }

  function handleEndEarly() {
    setP1TotalScore(ts => ts + p1.score);
    setP2TotalScore(ts => ts + p2.score);
    setP1TotalCorrect(tc => tc + p1.correct);
    setP2TotalCorrect(tc => tc + p2.correct);
    setPhase('done');
    phaseRef.current = 'done';
  }

  /* ── pre-fill player name from localStorage ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('playerName');
      if (saved) setP1Name(saved);
    } catch {}
  }, []);

  /* ── music lifecycle ── */
  useEffect(() => {
    if (phase === 'playing') {
      audioEngine.startMusic('battle');
    } else if (phase === 'done' || phase === 'setup') {
      audioEngine.stopMusic();
    }
  }, [phase]);

  /* ── countdown ── */
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      phaseRef.current = 'playing';
      setQuestionStart(Date.now());
      return;
    }
    audioEngine.tick();
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  /* ── check if both answered → reveal ── */
  useEffect(() => {
    if (phaseRef.current !== 'playing') return;
    if (p1Selected !== null && p2Selected !== null) {
      setPhase('reveal');
      phaseRef.current = 'reveal';
    }
  }, [p1Selected, p2Selected]);

  /* ── result SFX ── */
  useEffect(() => {
    if (phase !== 'done') return;
    const p1Won = p1.score > p2.score;
    const p2Won = p2.score > p1.score;
    setTimeout(() => {
      if (p1Won) audioEngine.win();
      else if (p2Won) audioEngine.lose();
      else audioEngine.win(); // draw → mild fanfare
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ── AI answer ── */
  useEffect(() => {
    if (phase !== 'playing' || !vsAI || !questions[currentIdx]) return;
    const q     = questions[currentIdx];
    const diff  = AI_DIFFICULTY[difficulty];
    const timeMs = diff.minTime + Math.random() * (diff.maxTime - diff.minTime);
    const willBeCorrect = Math.random() < diff.accuracy;
    const correctIdx    = parseInt(q.answer, 10);
    const aiChoice      = willBeCorrect ? correctIdx : (correctIdx === 0 ? 1 : 0);

    const t = setTimeout(() => {
      if (phaseRef.current !== 'playing') return;
      if (p2SelectedRef.current !== null) return;  // already answered via ref
      const earned = calcScore(willBeCorrect, timeMs);
      setP2(prev => ({
        ...prev,
        score:   prev.score + earned,
        correct: prev.correct + (willBeCorrect ? 1 : 0),
        streak:  willBeCorrect ? prev.streak + 1 : 0,
      }));
      p2SelectedRef.current = aiChoice;
      setP2Selected(aiChoice);
    }, timeMs);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx]);

  /* ── P1 answer ── */
  function handleP1Answer(index: number) {
    if (p1SelectedRef.current !== null || phaseRef.current !== 'playing') return;
    const timeMs   = Date.now() - questionStart;
    const q        = questions[currentIdx];
    const isCorrect = index === parseInt(q.answer, 10);
    const earned   = calcScore(isCorrect, timeMs);
    const newStreak = isCorrect ? (p1.streak + 1) : 0;
    if (isCorrect) {
      if (newStreak >= 3) audioEngine.streak();
      else audioEngine.correct();
    } else if (index !== -1) {
      audioEngine.wrong();
    }
    setP1(prev => ({
      ...prev,
      score:   prev.score + earned,
      correct: prev.correct + (isCorrect ? 1 : 0),
      streak:  newStreak,
    }));
    p1SelectedRef.current = index;
    setP1Selected(index);
  }

  /* ── timer ends: force P1 skip if not answered ── */
  function handleTimerEnd() {
    if (p1SelectedRef.current === null) handleP1Answer(-1);
    // If vs AI and AI hasn't answered, force AI timeout too
    if (vsAI && p2SelectedRef.current === null) {
      p2SelectedRef.current = -1;
      setP2Selected(-1);
    }
  }

  /* ── next question ── */
  function handleNext() {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= questions.length) {
      const isLastRound = currentRound + 1 >= rounds.length;
      if (isLastRound) {
        setP1TotalScore(ts => ts + p1.score);
        setP2TotalScore(ts => ts + p2.score);
        setP1TotalCorrect(tc => tc + p1.correct);
        setP2TotalCorrect(tc => tc + p2.correct);
        setPhase('done');
        phaseRef.current = 'done';
      } else {
        setPhase('between_rounds');
        phaseRef.current = 'between_rounds' as Phase;
      }
      return;
    }
    setCurrentIdx(nextIdx);
    resetRound();
    setPhase('playing');
    phaseRef.current = 'playing';
    setQuestionStart(Date.now());
  }

  const currentQ   = questions[currentIdx];
  const p1Winning  = p1.score > p2.score;
  const tied       = p1.score === p2.score;

  /* ── render ── */
  return (
    <div
      className="battle-screen flex flex-col min-h-screen"
      style={{ overflowX: 'hidden' }}
    >

      {/* Nav */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
          background: 'rgba(6,0,15,0.4)',
        }}
      >
        <button
          onClick={() => router.push('/student')}
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(139,92,246,0.9)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.8))' }}>⚔️</span>
          <span
            style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#fff', letterSpacing: '0.02em' }}
          >
            Battle Mode
          </span>
        </div>
        <div style={{ width: 48 }} />
      </div>

      {/* ────── SETUP ────── */}
      {phase === 'setup' && (
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '32px 16px',
          }}
          className="animate-slideUp setup-inner"
        >
          <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 8 }} className="animate-swordsClash select-none">⚔️</div>
          <h2
            style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: '#fff', marginBottom: 4, textShadow: '0 0 30px rgba(139,92,246,0.6)' }}
          >
            Battle Mode
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>
            Head-to-head · First to answer wins each round
          </p>

          <div style={{ width: '100%', maxWidth: 520 }}>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              {(['vs Player', 'vs AI'] as const).map((label, i) => {
                const active = i === 0 ? !vsAI : vsAI;
                const accent = i === 0 ? '139,92,246' : '217,70,239';
                return (
                  <button
                    key={label}
                    onClick={() => setVsAI(i === 1)}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 14,
                      fontSize: 14, fontWeight: 600,
                      background: active ? `rgba(${accent},0.18)` : 'rgba(255,255,255,0.04)',
                      color: active ? `rgba(${accent.split(',').map(n => Math.min(255, parseInt(n) + 80)).join(',')},1)` : 'rgba(255,255,255,0.45)',
                      border: `1.5px solid ${active ? `rgba(${accent},0.55)` : 'rgba(255,255,255,0.08)'}`,
                      boxShadow: active ? `0 0 16px rgba(${accent},0.2)` : 'none',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {i === 0 ? '👥' : '🤖'} {label}
                  </button>
                );
              })}
            </div>

            {/* Fighter cards */}
            <div className="fighter-row" style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
              {/* P1 */}
              <div className="fighter-card-p1" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(139,92,246,0.3)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>1</span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(139,92,246,0.8)' }}>PLAYER 1</span>
                </div>
                <input className="dark-input" placeholder="Your name" value={p1Name} onChange={e => setP1Name(e.target.value)} autoFocus />
              </div>

              {/* VS */}
              <div className="vs-divider" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 28, minWidth: 44 }}>
                <span className="font-display animate-vsGlow" style={{ fontSize: 28, color: '#fff', lineHeight: 1, userSelect: 'none' }}>VS</span>
              </div>

              {/* P2 */}
              <div className="fighter-card-p2" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(217,70,239,0.3)', color: '#f0abfc', border: '1px solid rgba(217,70,239,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>2</span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(217,70,239,0.8)' }}>{vsAI ? 'AI BOT' : 'PLAYER 2'}</span>
                </div>
                {vsAI ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(['easy', 'medium', 'hard'] as const).map(d => {
                      const active = difficulty === d;
                      return (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          style={{
                            width: '100%', padding: '10px 12px', borderRadius: 10,
                            fontSize: 12, fontWeight: 600, textAlign: 'left',
                            background: active ? 'rgba(217,70,239,0.15)' : 'rgba(255,255,255,0.03)',
                            color: active ? '#f0abfc' : 'rgba(255,255,255,0.45)',
                            border: `1.5px solid ${active ? 'rgba(217,70,239,0.45)' : 'rgba(255,255,255,0.07)'}`,
                            cursor: 'pointer', transition: 'all 0.12s',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: AI_DIFFICULTY[d].color, flexShrink: 0 }} />
                          {AI_DIFFICULTY[d].label}
                          <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 'auto' }}>{AI_DIFFICULTY[d].desc}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    className="dark-input"
                    style={{ borderColor: 'rgba(217,70,239,0.25)' }}
                    placeholder="Opponent name"
                    value={p2Name}
                    onChange={e => setP2Name(e.target.value)}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(217,70,239,0.7)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(217,70,239,0.25)'; }}
                  />
                )}
              </div>
            </div>

            {/* Topic picker */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 8 }}>
                TOPIC
              </label>
              <TopicPicker value={topicKey} onChange={setTopicKey} />
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

      {/* ────── COUNTDOWN ────── */}
      {phase === 'countdown' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-crownPop" style={{ textAlign: 'center' }}>
            <div
              className="font-display"
              style={{
                fontSize: countdown > 0 ? 160 : 96,
                lineHeight: 1,
                color: countdown > 0 ? (['', '#22d3ee', '#8b5cf6', '#d946ef'][countdown] || '#fff') : '#a78bfa',
                textShadow: countdown > 0
                  ? `0 0 40px currentColor, 0 0 80px currentColor`
                  : '0 0 40px rgba(167,139,250,0.8)',
              }}
            >
              {countdown > 0 ? countdown : 'GO!'}
            </div>
            {countdown > 0 && (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginTop: 16 }}>
                {p1.name} vs {p2.name}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ────── PLAYING / REVEAL ────── */}
      {(phase === 'playing' || phase === 'reveal') && currentQ && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Score bar */}
          <div
            style={{
              display: 'flex', alignItems: 'center', padding: '12px 20px', gap: 12,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(6,0,15,0.5)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* P1 */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(139,92,246,0.3)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>1</span>
                <p style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: p1Winning ? '#c4b5fd' : 'rgba(255,255,255,0.75)' }}>{p1.name}</p>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, marginTop: 2, marginLeft: 32, color: p1Winning ? '#a78bfa' : 'rgba(255,255,255,0.6)' }}>
                {p1.score.toLocaleString()}
              </p>
              {p1Selected !== null && (
                <p style={{ fontSize: 11, fontWeight: 700, marginLeft: 32, color: p1Selected !== -1 && p1Selected === parseInt(currentQ.answer) ? '#4ade80' : '#f87171' }}>
                  {p1Selected !== -1 && p1Selected === parseInt(currentQ.answer) ? '✓ correct' : p1Selected === -1 ? '⏱ timed out' : '✗ wrong'}
                </p>
              )}
            </div>

            {/* Timer center */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {phase === 'playing' && (
                <TimerRing seconds={TIME_LIMIT} onEnd={handleTimerEnd} paused={false} size={44} />
              )}
              {phase === 'reveal' && (
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  ✓
                </div>
              )}
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)' }}>
                {currentIdx + 1}/{questions.length}
              </span>
            </div>

            {/* P2 */}
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <p style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: !p1Winning && !tied ? '#f0abfc' : 'rgba(255,255,255,0.75)' }}>{p2.name}</p>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(217,70,239,0.3)', color: '#f0abfc', border: '1px solid rgba(217,70,239,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>2</span>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, marginTop: 2, marginRight: 32, color: !p1Winning && !tied ? '#e879f9' : 'rgba(255,255,255,0.6)' }}>
                {p2.score.toLocaleString()}
              </p>
              {p2Selected !== null && (
                <p style={{ fontSize: 11, fontWeight: 700, marginRight: 32, color: p2Selected !== -1 && p2Selected === parseInt(currentQ.answer) ? '#4ade80' : '#f87171' }}>
                  {p2Selected !== -1 && p2Selected === parseInt(currentQ.answer) ? '✓ correct' : p2Selected === -1 ? '⏱ timed out' : '✗ wrong'}
                </p>
              )}
            </div>
          </div>

          {/* Question — centered with proper width */}
          <div
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '24px 16px',
              width: '100%',
            }}
          >
            <div style={{ width: '100%', maxWidth: 680 }}>
              <QuestionCard
                question={currentQ}
                selected={p1Selected}
                revealed={phase === 'reveal'}
                onAnswer={handleP1Answer}
                disabled={p1Selected !== null}
              />
              {phase === 'reveal' && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                  <button className="btn-battle" style={{ fontSize: 16, padding: '14px 32px' }} onClick={handleNext}>
                    {currentIdx + 1 < questions.length ? 'Next Round →' : '🏁 See Results'}
                  </button>
                </div>
              )}
              {phase === 'playing' && p1Selected !== null && !vsAI && (
                <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 16 }}>
                  Waiting for {p2.name}…
                </p>
              )}
              {phase === 'playing' && p1Selected !== null && vsAI && (
                <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 16 }}>
                  AI is thinking…
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────── BETWEEN ROUNDS ────── */}
      {phase === 'between_rounds' && (() => {
        const roundWinner = p1.score > p2.score ? p1 : p2.score > p1.score ? p2 : null;
        const doneQs = rounds.slice(0, currentRound + 1).reduce((s, r) => s + r.length, 0);
        const pct = Math.round((doneQs / totalQs) * 100);
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }} className="animate-slideUp">
            <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 8 }} className="select-none">⚔️</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: '#fff', marginBottom: 4, textAlign: 'center' }}>
              Round {currentRound + 1} Done
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              {roundWinner ? `${roundWinner.name} takes the round!` : 'Tied!'}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
              {doneQs} of {totalQs} questions · {pct}% done
            </p>

            {/* Progress bar */}
            <div style={{ width: '100%', maxWidth: 380, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginBottom: 24, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#8b5cf6,#d946ef)', borderRadius: 2 }} />
            </div>

            {/* Round scores */}
            <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 380, marginBottom: 24 }}>
              {[p1, p2].map((p, i) => {
                const other = i === 0 ? p2 : p1;
                const isRoundWinner = p.score > other.score;
                const accent = i === 0 ? '139,92,246' : '217,70,239';
                return (
                  <div key={i} style={{ flex: 1, borderRadius: 16, padding: '16px 12px', textAlign: 'center', background: isRoundWinner ? `rgba(${accent},0.12)` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${isRoundWinner ? `rgba(${accent},0.4)` : 'rgba(255,255,255,0.07)'}` }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: `rgba(${accent.split(',').map(n => Math.min(255, parseInt(n) + 60)).join(',')},1)`, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: isRoundWinner ? `rgb(${accent})` : 'rgba(255,255,255,0.5)' }}>{p.score.toLocaleString()}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{p.correct}/{questions.length} correct</p>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 380 }}>
              <button onClick={handleEndEarly}
                style={{ flex: 1, padding: '14px 0', borderRadius: 14, fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}>
                Stop here
              </button>
              <button onClick={handleNextRound} className="btn-battle"
                style={{ flex: 1, width: 'auto', fontSize: 14, padding: '14px 0' }}>
                Round {currentRound + 2} →
              </button>
            </div>
          </div>
        );
      })()}

      {/* ────── DONE ────── */}
      {phase === 'done' && (() => {
        const isConquest = rounds.length > 1 && currentRound + 1 >= rounds.length;
        const gs1 = p1TotalScore;
        const gs2 = p2TotalScore;
        const p1Won  = gs1 > gs2;
        const p2Won  = gs2 > gs1;
        const winner = p1Won ? p1 : p2Won ? p2 : null;
        return (
          <div
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}
            className="animate-slideUp"
          >
            <div
              style={{ fontSize: 88, lineHeight: 1, marginBottom: 12, filter: `drop-shadow(0 0 20px ${p1Won ? 'rgba(139,92,246,0.8)' : p2Won ? 'rgba(217,70,239,0.8)' : 'rgba(255,255,255,0.5)'})` }}
              className="animate-crownPop select-none"
            >
              {p1Won ? '🏆' : p2Won ? '🎊' : '🤝'}
            </div>

            {isConquest && (
              <div style={{ padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700, marginBottom: 12, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#c4b5fd' }}>
                🎓 Topic Conquered · All {totalQs} Questions Done
              </div>
            )}

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: '#fff', marginBottom: 4, textAlign: 'center', textShadow: '0 0 30px rgba(139,92,246,0.5)' }}>
              {winner ? `${winner.name} wins!` : "It's a draw!"}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 32 }}>
              {rounds.length > 1 ? `${rounds.length} rounds · ${totalQs} questions` : `${questions.length} questions`}
            </p>

            {/* Score cards */}
            <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 380, marginBottom: 32 }}>
              {[
                { p: p1, total: gs1, totalCorrect: p1TotalCorrect, accent: '139,92,246', isWinner: p1Won },
                { p: p2, total: gs2, totalCorrect: p2TotalCorrect, accent: '217,70,239', isWinner: p2Won },
              ].map(({ p, total, totalCorrect, accent, isWinner }, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, borderRadius: 20, padding: '20px 16px', textAlign: 'center',
                    background: isWinner ? `linear-gradient(160deg,rgba(${accent},0.2),rgba(${accent},0.05))` : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${isWinner ? `rgba(${accent},0.5)` : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: isWinner ? `0 0 24px rgba(${accent},0.2)` : 'none',
                  }}
                >
                  {isWinner && <div style={{ fontSize: 20, marginBottom: 6 }}>👑</div>}
                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.55)' }}>{p.name}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color: isWinner ? `rgb(${accent})` : 'rgba(255,255,255,0.5)' }}>
                    {total.toLocaleString()}
                  </p>
                  <p style={{ fontSize: 12, marginTop: 8, color: 'rgba(255,255,255,0.3)' }}>
                    {totalCorrect}/{totalQs || questions.length} correct
                  </p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setPhase('setup'); phaseRef.current = 'setup'; }}
                style={{
                  padding: '12px 24px', borderRadius: 14, fontSize: 14, fontWeight: 600,
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)',
                  border: '1.5px solid rgba(255,255,255,0.12)', cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              >
                ↩ Rematch
              </button>
              <button
                className="btn-battle"
                onClick={() => router.push('/student')}
                style={{ width: 'auto', fontSize: 14, padding: '12px 24px' }}
              >
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
