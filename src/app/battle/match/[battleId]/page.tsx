'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import {
  listenBattleMeta,
  listenBattleScores,
  getBattleQuestions,
  submitBattleAnswer,
  advanceBattleQuestion,
  markPlayerDone,
  endBattle,
  saveBattleResult,
  simulateAIAnswer,
} from '@/lib/firebase/battles';
import type { BattleMeta, BattlePlayer } from '@/types/battle';
import type { Question } from '@/types/question';

const BG = [
  'radial-gradient(ellipse 70% 60% at 20% -10%, rgba(239,68,68,0.18) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 50% at 85% 20%,  rgba(99,102,241,0.15) 0%, transparent 55%)',
  '#060410',
].join(',');

function calcScore(isCorrect: boolean, timeMs: number, timeLimit: number, pointsPerQ: number): number {
  if (!isCorrect) return 0;
  const timeFraction = Math.max(0, 1 - timeMs / (timeLimit * 1000));
  return Math.round(pointsPerQ * (0.5 + 0.5 * timeFraction));
}

export default function BattleMatchPage({ params }: { params: Promise<{ battleId: string }> }) {
  const { battleId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const myId = searchParams.get('me') ?? '';
  const aiDifficulty = (searchParams.get('ai') ?? '') as 'easy' | 'medium' | 'hard' | '';

  const [meta, setMeta] = useState<BattleMeta | null>(null);
  const [scores, setScores] = useState<Record<string, BattlePlayer>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answered, setAnswered] = useState<Record<number, number>>({}); // qIndex → choice
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [phase, setPhase] = useState<'waiting' | 'question' | 'between' | 'ended'>('waiting');
  const [betweenResult, setBetweenResult] = useState<{ correct: boolean; myScore: number } | null>(null);

  const metaRef = useRef<BattleMeta | null>(null);
  const questionsRef = useRef<Question[]>([]);
  const answeredRef = useRef<Record<number, number>>({});
  const scoresRef = useRef<Record<string, BattlePlayer>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultSavedRef = useRef(false);

  metaRef.current = meta;
  questionsRef.current = questions;
  answeredRef.current = answered;
  scoresRef.current = scores;

  const myScore = scores[myId];
  const opponentId = meta ? (meta.player1.id === myId ? meta.player2.id : meta.player1.id) : null;
  const opponentScore = opponentId ? scores[opponentId] : null;
  const isAI = opponentId === 'ai';

  // ── Load questions ──
  useEffect(() => {
    getBattleQuestions(battleId).then(qs => {
      setQuestions(qs);
      questionsRef.current = qs;
    });
  }, [battleId]);

  // ── Listen meta + scores ──
  useEffect(() => {
    const unsub1 = listenBattleMeta(battleId, m => setMeta(m));
    const unsub2 = listenBattleScores(battleId, s => setScores(s));
    return () => { unsub1(); unsub2(); };
  }, [battleId]);

  // ── Timer for current question ──
  const startTimer = useCallback((startedAt: number, timeLimit: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, timeLimit - elapsed);
      setTimeLeft(left);
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        // Auto-submit if not answered
        const m = metaRef.current;
        if (m && !(m.currentQ in answeredRef.current)) {
          handleAnswer(-1, m); // -1 = no answer (timeout)
        }
      }
    };
    tick();
    timerRef.current = setInterval(tick, 100);
  }, []);

  // ── Schedule AI answer for current question ──
  const scheduleAIAnswer = useCallback((qIndex: number, startedAt: number, m: BattleMeta) => {
    if (!isAI || !aiDifficulty) return;
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

    const q = questionsRef.current[qIndex];
    if (!q) return;
    const { delay, choice, correct } = simulateAIAnswer({ options: q.options, answer: q.answer }, aiDifficulty);

    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, delay - elapsed);

    aiTimerRef.current = setTimeout(async () => {
      const timeMs = Date.now() - startedAt;
      const scoreEarned = calcScore(correct, timeMs, m.timeLimit, m.pointsPerQ);
      await submitBattleAnswer(battleId, 'ai', qIndex, choice, correct, timeMs, scoreEarned);
    }, remaining);
  }, [battleId, isAI, aiDifficulty]);

  // ── React to meta changes ──
  useEffect(() => {
    if (!meta || questions.length === 0) return;

    if (meta.status === 'active') {
      setPhase('question');
      if (meta.questionStartedAt) {
        startTimer(meta.questionStartedAt, meta.timeLimit);
        if (isAI) scheduleAIAnswer(meta.currentQ, meta.questionStartedAt, meta);
      }
    }

    if (meta.status === 'ended' && phase !== 'ended') {
      if (timerRef.current) clearInterval(timerRef.current);
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      setPhase('ended');
      saveResult(meta);
    }
  }, [meta?.status, meta?.currentQ, meta?.questionStartedAt, questions.length]);

  // Cleanup timers
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
  }, []);

  async function saveResult(m: BattleMeta) {
    if (resultSavedRef.current) return;
    resultSavedRef.current = true;
    const s = scoresRef.current;  // use ref — never stale in async closures
    const p1s = s[m.player1.id];
    const p2s = s[m.player2.id] ?? { score: 0 };
    try {
    await saveBattleResult({
      id: m.id,
      quizId: m.quizId,
      quizTitle: m.quizTitle,
      sessionCode: m.sessionCode,
      winnerId: m.winnerId ?? 'draw',
      winnerName: m.winnerId === m.player1.id ? m.player1.name : m.winnerId === m.player2.id ? m.player2.name : 'draw',
      loserId: m.winnerId === m.player1.id ? m.player2.id : m.winnerId === m.player2.id ? m.player1.id : undefined,
      loserName: m.winnerId === m.player1.id ? m.player2.name : m.winnerId === m.player2.id ? m.player1.name : undefined,
      draw: m.winnerId === 'draw',
      player1Id: m.player1.id, player1Name: m.player1.name, player1Score: p1s?.score ?? 0,
      player2Id: m.player2.id, player2Name: m.player2.name, player2Score: (p2s as BattlePlayer).score ?? 0,
      playedAt: m.endedAt ?? Date.now(),
    });
    } catch (err) {
      console.error('[saveBattleResult] failed:', err);
    }
  }

  async function handleAnswer(choice: number, currentMeta?: BattleMeta) {
    const m = currentMeta ?? metaRef.current;
    if (!m || m.status !== 'active') return;
    const qIndex = m.currentQ;
    if (qIndex in answeredRef.current) return; // already answered

    setAnswered(prev => ({ ...prev, [qIndex]: choice }));
    answeredRef.current = { ...answeredRef.current, [qIndex]: choice };

    const q = questionsRef.current[qIndex];
    if (!q) return;

    const isCorrect = choice >= 0 && String(choice) === q.answer;
    const timeMs = m.questionStartedAt ? Date.now() - m.questionStartedAt : m.timeLimit * 1000;
    const scoreEarned = calcScore(isCorrect, timeMs, m.timeLimit, m.pointsPerQ);

    if (timerRef.current) clearInterval(timerRef.current);
    setBetweenResult({ correct: isCorrect, myScore: scoreEarned });
    setPhase('between');

    try {
      await submitBattleAnswer(battleId, myId, qIndex, choice, isCorrect, timeMs, scoreEarned);
    } catch { toast('Answer sync error', 'error'); }

    // Check if this is last question
    const isLast = qIndex >= m.totalQ - 1;

    if (isAI) {
      // AI battle: we control progression
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      // Wait 2s between questions
      await new Promise(r => setTimeout(r, 2000));
      setPhase('question');
      setBetweenResult(null);

      if (isLast) {
        // Determine winner
        await markPlayerDone(battleId, myId);
        // Tally after short delay to let AI score sync
        setTimeout(async () => {
          const freshScores = metaRef.current;
          // Re-read scores from state
          const myFinalScore = scores[myId]?.score ?? 0;
          const aiFinalScore = scores['ai']?.score ?? 0;
          const winnerId = myFinalScore > aiFinalScore ? myId : aiFinalScore > myFinalScore ? 'ai' : 'draw';
          await endBattle(battleId, winnerId);
        }, 1500);
      } else {
        await advanceBattleQuestion(battleId, qIndex + 1, m.totalQ);
      }
    } else {
      // PvP: wait for both players to answer, then host (player1) advances
      if (isLast) {
        await markPlayerDone(battleId, myId);
        // If I am player1 (initiator), determine winner once both are done
        if (myId === m.player1.id) {
          setTimeout(async () => {
            const myFinalScore = scores[myId]?.score ?? 0;
            const oppFinalScore = scores[opponentId!]?.score ?? 0;
            const winnerId = myFinalScore > oppFinalScore ? myId : oppFinalScore > myFinalScore ? opponentId! : 'draw';
            await endBattle(battleId, winnerId);
          }, 2000);
        }
      } else if (myId === m.player1.id) {
        // Player1 (battle creator) drives question advancement after delay
        await new Promise(r => setTimeout(r, 2000));
        setPhase('question');
        setBetweenResult(null);
        await advanceBattleQuestion(battleId, qIndex + 1, m.totalQ);
      } else {
        // Player2 just waits for meta to update (handled by listenBattleMeta)
        setTimeout(() => { setPhase('question'); setBetweenResult(null); }, 2000);
      }
    }
  }

  // ── WAITING SCREEN ──
  if (!meta || phase === 'waiting' || meta.status === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⚔️</div>
          <p style={{ fontSize: 20, fontWeight: 600 }}>Waiting for opponent…</p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>The battle will start shortly</p>
        </div>
      </div>
    );
  }

  // ── ENDED SCREEN ──
  if (phase === 'ended' || meta.status === 'ended') {
    const iWon = meta.winnerId === myId;
    const draw = meta.winnerId === 'draw';
    const myFinal = myScore?.score ?? 0;
    const oppFinal = opponentScore?.score ?? 0;
    const myCorrect = myScore?.correct ?? 0;
    const oppCorrect = opponentScore?.correct ?? 0;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10" style={{ background: BG, color: '#f5f3ee' }}>
        <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 80, marginBottom: 12 }}>
            {draw ? '🤝' : iWon ? '🏆' : '😔'}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: '#fff', marginBottom: 4 }}>
            {draw ? 'Draw!' : iWon ? 'You Win!' : 'You Lost'}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>
            {meta.quizTitle}
          </p>

          {/* Score card */}
          <div style={{
            borderRadius: 20, background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '24px', marginBottom: 28,
            display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center',
          }}>
            <div>
              <Avatar id={meta.player1.id === myId ? meta.player1.avatarId : meta.player2.avatarId} size={48} />
              <p style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginTop: 8 }}>
                {meta.player1.id === myId ? meta.player1.name : meta.player2.name}
                <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>You</span>
              </p>
              <p style={{ fontSize: 32, fontWeight: 800, color: iWon ? '#fbbf24' : '#fff', marginTop: 4 }}>{myFinal}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{myCorrect}/{meta.totalQ} correct</p>
            </div>

            <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.3)' }}>VS</div>

            <div>
              <Avatar id={opponentId === meta.player1.id ? meta.player1.avatarId : meta.player2.avatarId} size={48} />
              <p style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginTop: 8 }}>
                {opponentId === meta.player1.id ? meta.player1.name : meta.player2.name}
                {isAI && <span style={{ display: 'block', fontSize: 11, color: 'rgba(99,102,241,0.7)', fontWeight: 400 }}>AI</span>}
              </p>
              <p style={{ fontSize: 32, fontWeight: 800, color: !iWon && !draw ? '#fbbf24' : '#fff', marginTop: 4 }}>{oppFinal}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{oppCorrect}/{meta.totalQ} correct</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
            <button
              onClick={() => router.push(`/battle/${meta.sessionCode}`)}
              style={{
                padding: '14px', borderRadius: 14,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(239,68,68,0.35)',
              }}
            >
              ⚔️ Play Again
            </button>
            <button
              onClick={() => router.push(`/battle/leaderboard/${meta.quizId}`)}
              style={{
                padding: '14px', borderRadius: 14,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer',
              }}
            >
              🏆 Leaderboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── QUESTION / BETWEEN SCREEN ──
  const q = questions[meta.currentQ];
  const timeProgress = meta.timeLimit > 0 ? timeLeft / meta.timeLimit : 0;
  const timerColor = timeProgress > 0.5 ? '#22c55e' : timeProgress > 0.25 ? '#f59e0b' : '#ef4444';
  const myChoiceThisQ = answered[meta.currentQ];
  const opponentDoneThisQ = opponentScore && meta.currentQ in (opponentScore.answers ?? {});

  if (!q) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG, color: '#f5f3ee' }}>

      {/* Top bar — scoreboard */}
      <div style={{
        background: 'rgba(6,4,16,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        {/* Me */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar id={meta.player1.id === myId ? meta.player1.avatarId : meta.player2.avatarId} size={32} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0 }}>
              {meta.player1.id === myId ? meta.player1.name : meta.player2.name}
            </p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24', margin: 0, lineHeight: 1 }}>
              {myScore?.score ?? 0}
            </p>
          </div>
        </div>

        {/* Timer */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '0 0 3px', fontFamily: 'var(--font-mono)' }}>
            Q {meta.currentQ + 1}/{meta.totalQ}
          </p>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: timerColor,
              width: `${timeProgress * 100}%`,
              transition: 'width 0.1s linear, background 0.3s',
            }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: timerColor, margin: '3px 0 0' }}>
            {Math.ceil(timeLeft)}s
          </p>
        </div>

        {/* Opponent */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row-reverse' }}>
          <Avatar id={opponentId === meta.player1.id ? meta.player1.avatarId : meta.player2.avatarId} size={32} />
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0 }}>
              {opponentId === meta.player1.id ? meta.player1.name : meta.player2.name}
              {opponentDoneThisQ && <span style={{ marginLeft: 4, fontSize: 10 }}>✓</span>}
            </p>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1 }}>
              {opponentScore?.score ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Question */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px', maxWidth: 640, margin: '0 auto', width: '100%' }}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 20,
        }}>
          {/* Between question result overlay */}
          {phase === 'between' && betweenResult && (
            <div style={{
              borderRadius: 16, padding: '14px 20px', textAlign: 'center',
              background: betweenResult.correct ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1.5px solid ${betweenResult.correct ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
            }}>
              <span style={{ fontSize: 28 }}>{betweenResult.correct ? '✅' : '❌'}</span>
              <p style={{ fontWeight: 700, fontSize: 16, color: '#fff', margin: '6px 0 2px' }}>
                {betweenResult.correct ? `+${betweenResult.myScore} pts` : 'Incorrect'}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                {betweenResult.correct ? 'Nice one!' : `Correct: ${q.options[parseInt(q.answer)]}`}
              </p>
            </div>
          )}

          <h2 style={{
            fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.4,
            textAlign: 'center', margin: 0,
          }}>
            {q.text}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {q.options.map((opt, i) => {
              const isSelected = myChoiceThisQ === i;
              const correctIdx = parseInt(q.answer);
              const showCorrect = phase === 'between' && i === correctIdx;
              const showWrong = phase === 'between' && isSelected && i !== correctIdx;

              return (
                <button
                  key={i}
                  onClick={() => phase === 'question' && !(meta.currentQ in answered) && handleAnswer(i)}
                  disabled={phase !== 'question' || meta.currentQ in answered}
                  style={{
                    padding: '16px 14px', borderRadius: 14, textAlign: 'left',
                    background: showCorrect
                      ? 'rgba(16,185,129,0.25)'
                      : showWrong
                        ? 'rgba(239,68,68,0.2)'
                        : isSelected
                          ? 'rgba(99,102,241,0.2)'
                          : 'rgba(255,255,255,0.05)',
                    border: `1.5px solid ${
                      showCorrect
                        ? 'rgba(16,185,129,0.5)'
                        : showWrong
                          ? 'rgba(239,68,68,0.5)'
                          : isSelected
                            ? 'rgba(99,102,241,0.5)'
                            : 'rgba(255,255,255,0.1)'}`,
                    color: '#fff', fontSize: 15, fontWeight: isSelected ? 600 : 400,
                    cursor: phase !== 'question' || meta.currentQ in answered ? 'default' : 'pointer',
                    transition: 'all 0.12s', lineHeight: 1.4,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}
                >
                  <span style={{
                    minWidth: 26, height: 26, borderRadius: 8,
                    background: 'rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                    color: 'rgba(255,255,255,0.5)',
                  }}>
                    {showCorrect ? '✓' : showWrong ? '✗' : String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ paddingTop: 3 }}>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
