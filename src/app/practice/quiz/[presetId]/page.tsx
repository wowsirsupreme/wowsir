'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, XCircle, Clock, RotateCcw, Trophy, Home, Crown } from 'lucide-react';
import { useFirebase } from '@/hooks/useFirebase';
import { getPresetQuiz, fetchQuestionsForPreset } from '@/lib/firebase/presetQuizzes';
import { submitScore, fetchLeaderboard } from '@/lib/firebase/leaderboard';
import type { LeaderboardEntry } from '@/lib/firebase/leaderboard';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import type { PresetQuiz } from '@/lib/firebase/presetQuizzes';
import type { Question } from '@/types/question';
import { audioEngine } from '@/lib/audioEngine';
import AudioControls from '@/components/MuteButton';
import MusicThemePicker from '@/components/MusicThemePicker';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'error' | 'playing' | 'reveal' | 'round-review' | 'results';

interface QuestionResult {
  question: Question;
  selected: number | null;
  correct: boolean;
  timeMs: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROUND_SIZE = 25;

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

// ── Name Modal ────────────────────────────────────────────────────────────────

function NameModal({ accent, onDone }: { accent: string; onDone(name: string): void }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div style={{ background: '#111827', border: `1.5px solid ${accent}40`, borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <Crown size={32} color={accent} style={{ margin: '0 auto 14px' }} />
        <h2 style={{ color: '#f1f5f9', fontFamily: 'var(--font-display)', fontSize: 22, margin: '0 0 8px' }}>Enter your name</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 20px' }}>for the leaderboard</p>
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value.slice(0, 20))}
          onKeyDown={e => e.key === 'Enter' && val.trim() && onDone(val.trim())}
          placeholder="Your name…"
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${accent}40`, background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 14, fontFamily: 'inherit' }}
        />
        <button
          onClick={() => val.trim() && onDone(val.trim())}
          disabled={!val.trim()}
          style={{ width: '100%', padding: '12px', borderRadius: 10, background: val.trim() ? accent : 'rgba(255,255,255,0.07)', border: 'none', color: val.trim() ? '#000' : 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 700, cursor: val.trim() ? 'pointer' : 'default' }}
        >
          Start
        </button>
        <button
          onClick={() => onDone('Anonymous')}
          style={{ marginTop: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 12, cursor: 'pointer' }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// ── Leaderboard components ────────────────────────────────────────────────────

function LbRow({ entry, rank, myScore, accent }: { entry: LeaderboardEntry; rank: number; myScore: number; accent: string }) {
  const medals = ['🥇', '🥈', '🥉'];
  const isMe = Math.abs(entry.score - myScore) < 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: isMe ? `${accent}12` : 'transparent' }}>
      <span style={{ width: 24, textAlign: 'center', fontSize: 14, flexShrink: 0 }}>{medals[rank] ?? rank + 1}</span>
      <span style={{ flex: 1, fontSize: 13, color: isMe ? accent : '#e2e8f0', fontWeight: isMe ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.name}{isMe ? ' ← you' : ''}
      </span>
      <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: isMe ? accent : 'rgba(255,255,255,0.55)', fontWeight: 700, flexShrink: 0 }}>{entry.score.toLocaleString()}</span>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.22)', flexShrink: 0, minWidth: 28, textAlign: 'right' }}>{entry.accuracy}%</span>
    </div>
  );
}

function LeaderboardSummary({ entries, myScore, accent, loading, onExpand }:
  { entries: LeaderboardEntry[]; myScore: number; accent: string; loading: boolean; onExpand: () => void }) {
  const myRank = entries.findIndex(e => Math.abs(e.score - myScore) < 1);
  const preview = entries.slice(0, 3);
  const showExtra = myRank > 2 && myRank !== -1;
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Trophy size={14} color={accent} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Leaderboard</span>
          {!loading && entries.length > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-mono)' }}>{entries.length} students</span>
          )}
        </div>
        <button onClick={onExpand}
          style={{ fontSize: 12, color: accent, background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
          View all →
        </button>
      </div>
      {loading && <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading…</div>}
      {!loading && entries.length === 0 && <div style={{ padding: '18px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>No scores yet — yours will be first!</div>}
      {!loading && preview.map((e, i) => <LbRow key={e.id ?? i} entry={e} rank={i} myScore={myScore} accent={accent} />)}
      {!loading && showExtra && (
        <>
          <div style={{ textAlign: 'center', padding: '3px', color: 'rgba(255,255,255,0.15)', fontSize: 13, letterSpacing: '0.2em' }}>···</div>
          <LbRow entry={entries[myRank]} rank={myRank} myScore={myScore} accent={accent} />
        </>
      )}
      {!loading && myRank !== -1 && (
        <div style={{ padding: '9px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Your rank</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: accent }}>#{myRank + 1} of {entries.length}</span>
        </div>
      )}
    </div>
  );
}

function LeaderboardDrawer({ entries, myScore, accent, onClose }:
  { entries: LeaderboardEntry[]; myScore: number; accent: string; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(400px, 100vw)',
        background: '#0d0d18', borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 201, display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.22s ease',
      }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={16} color={accent} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Leaderboard</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>top {entries.length}</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'rgba(255,255,255,0.5)', fontSize: 13, padding: '5px 12px', cursor: 'pointer' }}>✕ Close</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 20 }}>
          {entries.length === 0 && <div style={{ padding: '30px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>No entries yet.</div>}
          {entries.map((e, i) => <LbRow key={e.id ?? i} entry={e} rank={i} myScore={myScore} accent={accent} />)}
        </div>
      </div>
    </>
  );
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

  // Full bank + round state
  const [fullBank, setFullBank] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);    // current round's questions
  const [roundStart, setRoundStart] = useState(0);               // index into fullBank where this round began
  const [roundNum, setRoundNum] = useState(1);
  const [roundResultsStartIdx, setRoundResultsStartIdx] = useState(0); // index into results[] where this round starts

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const questionStart = useRef(0);

  // Leaderboard
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [lbEntries, setLbEntries] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [submittedToLb, setSubmittedToLb] = useState(false);
  const [showLbDrawer, setShowLbDrawer] = useState(false);

  const currentQ = questions[currentIdx];
  const timeLimit = preset?.timeLimitSeconds ?? 0;
  const timerRunning = phase === 'playing' && timeLimit > 0;
  const timerKey = `${currentIdx}-${questions.length}`;
  void timerKey; // used conceptually to reset timer

  const accent = preset ? gradeAccent(preset.grade) : '#6366f1';

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
        setFullBank(qs);
        setRoundStart(0);
        setQuestions(qs.slice(0, ROUND_SIZE));
        setPhase('playing');
        questionStart.current = Date.now();
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Failed to load quiz');
        setPhase('error');
      }
    })();

    // Load saved player name
    try {
      const saved = localStorage.getItem('practicePlayerName');
      if (saved) setPlayerName(saved);
      else setShowNameModal(true);
    } catch { /* storage blocked */ }
  }, [presetId, configured]);

  // ── Timer expiry ──────────────────────────────────────────────────────────

  const handleTimerExpire = useCallback(() => {
    if (phase !== 'playing') return;
    setPhase('reveal');
  }, [phase]);

  const _remaining = useCountdown(timeLimit, timerRunning, handleTimerExpire);
  const remaining = timerRunning ? _remaining : timeLimit;

  // ── Music ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase === 'playing') {
      audioEngine.startMusic();
    }
    if (phase === 'results') {
      audioEngine.stopMusic();
      setTimeout(() => {
        if (pct >= 60) audioEngine.win();
        else audioEngine.lose();
      }, 300);
    }
    // Fade music back in on round-review (don't stop it)
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Answer selection ──────────────────────────────────────────────────────

  function handleAnswer(index: number) {
    if (phase !== 'playing' || selected !== null) return;
    setSelected(index);
    setPhase('reveal');
    const correctIndex = parseInt(currentQ?.answer ?? '-1', 10);
    if (index === correctIndex) audioEngine.correct();
    else audioEngine.wrong();
  }

  // ── Advance to next question ──────────────────────────────────────────────

  function handleNext() {
    if (!currentQ) return;
    const timeMs = Date.now() - questionStart.current;
    const correctIndex = parseInt(currentQ.answer, 10);
    const isCorrect = selected !== null && selected === correctIndex;

    const result: QuestionResult = { question: currentQ, selected, correct: isCorrect, timeMs };
    const newResults = [...results, result];
    setResults(newResults);

    if (currentIdx + 1 >= questions.length) {
      // End of this round → show round review
      setPhase('round-review');
    } else {
      setCurrentIdx(i => i + 1);
      setSelected(null);
      setPhase('playing');
      questionStart.current = Date.now();
    }
  }

  // ── Start next round ──────────────────────────────────────────────────────

  function handleStartNextRound() {
    const nextStart = roundStart + questions.length;
    const nextRound = fullBank.slice(nextStart, nextStart + ROUND_SIZE);
    setRoundStart(nextStart);
    setRoundResultsStartIdx(results.length);
    setQuestions(nextRound);
    setCurrentIdx(0);
    setSelected(null);
    setRoundNum(r => r + 1);
    setPhase('playing');
    questionStart.current = Date.now();
  }

  // ── View final results (submit to leaderboard) ────────────────────────────

  function handleViewResults() {
    setPhase('results');
    if (!preset || submittedToLb || results.length === 0) return;
    const acc = Math.round((results.filter(r => r.correct).length / results.length) * 100);
    const gradeKey = `gr${String(preset.grade)}`;
    const name = playerName || 'Anonymous';
    const finalScore = results.filter(r => r.correct).length * 100; // simple score
    setLbLoading(true);
    submitScore({ name, score: finalScore, gradeKey, level: roundNum, accuracy: acc, streak: 0, source: 'practice' })
      .then(() => {
        setSubmittedToLb(true);
        return fetchLeaderboard(gradeKey, 100);
      })
      .then(entries => { setLbEntries(entries); setLbLoading(false); })
      .catch(() => setLbLoading(false));
  }

  // ── Restart quiz ──────────────────────────────────────────────────────────

  function handleRestart() {
    if (!preset) return;
    let bank = [...fullBank];
    if (preset.shuffleQuestions) bank = shuffle(bank);
    setFullBank(bank);
    setRoundStart(0);
    setQuestions(bank.slice(0, ROUND_SIZE));
    setCurrentIdx(0);
    setSelected(null);
    setResults([]);
    setRoundNum(1);
    setRoundResultsStartIdx(0);
    setSubmittedToLb(false);
    setLbEntries([]);
    setPhase('playing');
    questionStart.current = Date.now();
  }

  // ── Derived stats ─────────────────────────────────────────────────────────

  const totalCorrect = results.filter(r => r.correct).length;
  const pct = results.length > 0 ? Math.round((totalCorrect / results.length) * 100) : 0;
  const finalScore = totalCorrect * 100;

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

  // ── ROUND REVIEW ─────────────────────────────────────────────────────────

  if (phase === 'round-review') {
    const roundResults = results.slice(roundResultsStartIdx);
    const roundCorrect = roundResults.filter(r => r.correct).length;
    const nextStart = roundStart + questions.length;
    const hasMore = nextStart < fullBank.length;
    const moreCount = Math.min(fullBank.length - nextStart, ROUND_SIZE);
    const roundPct = roundResults.length > 0 ? Math.round((roundCorrect / roundResults.length) * 100) : 0;
    const bankDone = roundStart + questions.length;

    return (
      <main style={bgStyle}>
        <AudioControls />
        {starOverlay}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '40px 20px 120px' }}>

          {/* Round header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Round {roundNum} complete
            </div>
            <div style={{ fontSize: 52, fontFamily: 'var(--font-display)', color: accent, lineHeight: 1 }}>
              {roundPct}%
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 10 }}>
              <span style={{ color: '#10b981', fontFamily: 'var(--font-mono)', fontSize: 14 }}>✓ {roundCorrect} correct</span>
              <span style={{ color: '#ef4444', fontFamily: 'var(--font-mono)', fontSize: 14 }}>✗ {roundResults.length - roundCorrect} wrong</span>
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-mono)' }}>
              {bankDone} / {fullBank.length} questions done overall
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', maxWidth: 320, margin: '8px auto 0' }}>
              <div style={{ height: '100%', background: accent, borderRadius: 2, width: `${Math.round((bankDone / fullBank.length) * 100)}%`, transition: 'width 0.5s' }} />
            </div>
          </div>

          {/* Per-question review */}
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
            Round {roundNum} questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {roundResults.map((r, i) => {
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
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginRight: 6 }}>
                          Q{roundResultsStartIdx + i + 1}
                        </span>
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

        {/* Sticky bottom buttons */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(9,9,15,0.94)', backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '16px 20px', zIndex: 10,
          display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap',
        }}>
          {hasMore && (
            <button
              onClick={handleStartNextRound}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 24px', borderRadius: 12,
                background: accent + '22', border: `1.5px solid ${accent}55`,
                color: accent, fontSize: 14, cursor: 'pointer',
                fontFamily: 'var(--font-display)',
              }}
            >
              ▶ Round {roundNum + 1} — {moreCount} more questions
            </button>
          )}
          <button
            onClick={handleRestart}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 20px', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.65)', fontSize: 14, cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} /> Retake Quiz
          </button>
          <button
            onClick={handleViewResults}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 20px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer',
            }}
          >
            {hasMore ? "I'm done / See Results" : 'See Final Results →'}
          </button>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }`}</style>
      </main>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────

  if (phase === 'results') {
    return (
      <main style={bgStyle}>
        <AudioControls />
        {starOverlay}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '40px 20px 60px' }}>

          {/* Music theme picker — top-right of results */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <MusicThemePicker onChange={() => audioEngine.startMusic()} />
          </div>

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

            <div style={{ fontSize: 72, fontFamily: 'var(--font-display)', lineHeight: 1, color: accent, margin: '28px 0 8px' }}>
              {pct}%
            </div>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>
              <ScoreGrade />
            </p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>
              {totalCorrect} / {results.length} correct · {roundNum} round{roundNum > 1 ? 's' : ''}
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

          {/* Leaderboard */}
          <LeaderboardSummary entries={lbEntries} myScore={finalScore} accent={accent} loading={lbLoading} onExpand={() => setShowLbDrawer(true)} />
          {showLbDrawer && <LeaderboardDrawer entries={lbEntries} myScore={finalScore} accent={accent} onClose={() => setShowLbDrawer(false)} />}

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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }`}</style>
      </main>
    );
  }

  // ── PLAYING / REVEAL ──────────────────────────────────────────────────────

  const progressPct = questions.length > 0 ? ((currentIdx) / questions.length) * 100 : 0;
  const bankDone = roundStart + currentIdx;

  return (
    <main style={bgStyle}>
      {/* Floating audio controls — bottom-left */}
      <AudioControls />
      {showNameModal && (
        <NameModal
          accent={accent}
          onDone={name => {
            try { localStorage.setItem('practicePlayerName', name); } catch { /* blocked */ }
            setPlayerName(name);
            setShowNameModal(false);
          }}
        />
      )}
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

            {/* Round + question counter */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                Round {roundNum} · {currentIdx + 1}/{questions.length}
              </span>
              {fullBank.length > questions.length && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                  {bankDone}/{fullBank.length} total
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar (round progress) */}
        <div style={{ height: 3, borderRadius: 4, background: 'rgba(255,255,255,0.07)', marginBottom: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, background: accent, width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
        </div>
        {/* Overall bank progress bar */}
        {fullBank.length > questions.length && (
          <div style={{ height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.04)', marginBottom: 28, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, background: accent + '55', width: `${Math.round((bankDone / fullBank.length) * 100)}%`, transition: 'width 0.4s ease' }} />
          </div>
        )}
        {fullBank.length <= questions.length && <div style={{ marginBottom: 28 }} />}

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
                {currentIdx + 1 >= questions.length ? 'End Round' : 'Next Question'}
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
