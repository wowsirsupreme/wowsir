'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  RotateCcw, Trophy, Layers, Zap, Shield, Scissors, Flame, Crown,
} from 'lucide-react';
import { submitScore, fetchLeaderboard } from '@/lib/firebase/leaderboard';
import type { LeaderboardEntry } from '@/lib/firebase/leaderboard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Question {
  id: string; text: string; options: string[]; answer: string;
  explanation?: string; topicKey?: string; grade?: string;
}
interface QuizMeta { gradeLabel: string; gradeKey: string; accent: string; chapters: string[]; }

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_SIZE   = 40;
const BASE_POINTS  = 100;

// ── Power-up definitions ──────────────────────────────────────────────────────

type PowerUpKey = 'fifty_fifty' | 'double' | 'shield' | 'surge' | 'inferno';

interface PowerUp {
  key: PowerUpKey;
  label: string;
  desc: string;
  emoji: string;
  color: string;
}

const POWERUPS: PowerUp[] = [
  { key: 'fifty_fifty', label: '50 / 50',    desc: 'Remove 2 wrong options', emoji: '✂️', color: '#f59e0b' },
  { key: 'double',      label: 'Double',      desc: 'Next correct = 2× points',  emoji: '×2', color: '#6366f1' },
  { key: 'shield',      label: 'Shield',      desc: 'Protect streak on one miss', emoji: '🛡️', color: '#10b981' },
  { key: 'surge',       label: 'Surge',       desc: '+400 bonus instantly',        emoji: '⚡', color: '#ec4899' },
  { key: 'inferno',     label: 'Inferno',     desc: 'Triple multiplier for 5 Qs', emoji: '🔥', color: '#ef4444' },
];

function randomPowerUps(n = 3): PowerUpKey[] {
  const shuffled = [...POWERUPS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n).map(p => p.key);
}

// ── Streak multiplier ─────────────────────────────────────────────────────────

function getMultiplier(streak: number): number {
  if (streak >= 10) return 3;
  if (streak >= 7)  return 2.5;
  if (streak >= 5)  return 2;
  if (streak >= 3)  return 1.5;
  return 1;
}

function streakLabel(streak: number) {
  if (streak >= 10) return { label: '🔥 MAX ×3', color: '#ef4444' };
  if (streak >= 7)  return { label: '⚡ ×2.5',   color: '#f59e0b' };
  if (streak >= 5)  return { label: '🔥 ×2',     color: '#f97316' };
  if (streak >= 3)  return { label: '×1.5',      color: '#818cf8' };
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number, d: number) { return d === 0 ? 0 : Math.round((n / d) * 100); }
function levelAccent(s: number)    { return s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444'; }

// ── Name modal ────────────────────────────────────────────────────────────────

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
      </div>
    </div>
  );
}

// ── Leaderboard components ────────────────────────────────────────────────────

/** One row used in both the summary and the full drawer */
function LbRow({ entry, rank, myScore, accent }: { entry: LeaderboardEntry; rank: number; myScore: number; accent: string }) {
  const medals = ['🥇', '🥈', '🥉'];
  const isMe   = Math.abs(entry.score - myScore) < 1;
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

/** Compact top-3 + your rank card shown inline on the results screen */
function LeaderboardSummary({ entries, myScore, accent, loading, onExpand }:
  { entries: LeaderboardEntry[]; myScore: number; accent: string; loading: boolean; onExpand: () => void }) {
  const myRank = entries.findIndex(e => Math.abs(e.score - myScore) < 1);
  // Show top 3, plus the player's own row if outside top 3
  const preview = entries.slice(0, 3);
  const showExtra = myRank > 2 && myRank !== -1;
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
      {/* Header */}
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

      {/* Player's rank when outside top 3 */}
      {!loading && showExtra && (
        <>
          <div style={{ textAlign: 'center', padding: '3px', color: 'rgba(255,255,255,0.15)', fontSize: 13, letterSpacing: '0.2em' }}>···</div>
          <LbRow entry={entries[myRank]} rank={myRank} myScore={myScore} accent={accent} />
        </>
      )}

      {/* Your rank label */}
      {!loading && myRank !== -1 && (
        <div style={{ padding: '9px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Your rank</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: accent }}>#{myRank + 1} of {entries.length}</span>
        </div>
      )}
    </div>
  );
}

/** Full leaderboard slide-in drawer */
function LeaderboardDrawer({ entries, myScore, accent, onClose }:
  { entries: LeaderboardEntry[]; myScore: number; accent: string; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 200 }} />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(400px, 100vw)',
        background: '#0d0d18', borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 201, display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.22s ease',
      }}>
        {/* Drawer header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={16} color={accent} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Leaderboard</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>top {entries.length}</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'rgba(255,255,255,0.5)', fontSize: 13, padding: '5px 12px', cursor: 'pointer' }}>✕ Close</button>
        </div>
        {/* Scrollable list */}
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 20 }}>
          {entries.length === 0 && <div style={{ padding: '30px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>No entries yet.</div>}
          {entries.map((e, i) => <LbRow key={e.id ?? i} entry={e} rank={i} myScore={myScore} accent={accent} />)}
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CustomPracticePage() {
  const router = useRouter();

  // Data
  const [pool,     setPool]     = useState<Question[]>([]);
  const [meta,     setMeta]     = useState<QuizMeta | null>(null);
  const [loaded,   setLoaded]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Player
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);

  // Level
  const [level,    setLevel]    = useState(0);
  const [levelQs,  setLevelQs]  = useState<Question[]>([]);

  // Quiz state
  const [current,    setCurrent]    = useState(0);
  const [answers,    setAnswers]    = useState<Record<number, string>>({});
  const [hiddenOpts, setHiddenOpts] = useState<Record<number, string[]>>({}); // fifty_fifty
  const [submitted,  setSubmitted]  = useState(false);

  // Scoring
  const [score,        setScore]        = useState(0);
  const [streak,       setStreak]       = useState(0);
  const [bestStreak,   setBestStreak]   = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalDone,    setTotalDone]    = useState(0);
  const [scorePopup,   setScorePopup]   = useState<string | null>(null);
  const [qStartTime,   setQStartTime]   = useState<number>(Date.now()); // for speed bonus

  // Power-ups (keys available this level)
  const [availPowerUps, setAvailPowerUps] = useState<PowerUpKey[]>([]);
  const [usedPowerUps,  setUsedPowerUps]  = useState<Set<PowerUpKey>>(new Set());
  // Active effects
  const [doubleActive,    setDoubleActive]    = useState(false);
  const [infernoLeft,     setInfernoLeft]     = useState(0);   // questions remaining
  const [shieldActive,    setShieldActive]    = useState(false);

  // Leaderboard
  const [lbEntries,    setLbEntries]    = useState<LeaderboardEntry[]>([]);
  const [lbLoading,    setLbLoading]    = useState(false);
  const [submitted2lb, setSubmitted2lb] = useState(false);
  const [showLbDrawer, setShowLbDrawer] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const raw  = sessionStorage.getItem('customQuiz');
      const rawM = sessionStorage.getItem('customQuizMeta');
      if (!raw) { setError('No questions found. Please go back and select chapters.'); setLoaded(true); return; }
      // Normalise: q.answer may be a numeric index string ("0","2") — convert to option text so all
      // downstream comparisons (opt === q.answer) work correctly.
      // Also shuffle options per question so students can't exploit position or length patterns.
      const qs: Question[] = (JSON.parse(raw) as Question[]).map(q => {
        // 1. Resolve answer text from index if needed
        let answerText = q.answer as string;
        const idx = parseInt(answerText, 10);
        if (!isNaN(idx) && Array.isArray(q.options) && q.options[idx] !== undefined) {
          answerText = q.options[idx];
        }
        // 2. Shuffle options (Fisher-Yates) so position & length hacks don't work
        const opts = [...(q.options ?? [])];
        for (let i = opts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [opts[i], opts[j]] = [opts[j], opts[i]];
        }
        return { ...q, answer: answerText, options: opts };
      });
      if (!Array.isArray(qs) || qs.length === 0) { setError('Question data is empty.'); setLoaded(true); return; }
      const m: QuizMeta = rawM ? JSON.parse(rawM) : { gradeLabel: 'Practice', gradeKey: 'unknown', accent: '#6366f1', chapters: [] };
      setPool(qs);
      setMeta(m);
      setLevelQs(qs.slice(0, LEVEL_SIZE));
      setAvailPowerUps(randomPowerUps(3));
      setLoaded(true);

      // Name
      const saved = localStorage.getItem('practicePlayerName');
      if (saved) setPlayerName(saved);
      else setShowNameModal(true);
    } catch {
      setError('Could not read quiz data.');
      setLoaded(true);
    }
  }, []);

  // Reset speed timer whenever the question index changes
  useEffect(() => { setQStartTime(Date.now()); }, [current]);

  function saveName(name: string) {
    localStorage.setItem('practicePlayerName', name);
    setPlayerName(name);
    setShowNameModal(false);
  }

  // ── Answer a question ─────────────────────────────────────────────────────

  function pickAnswer(opt: string) {
    if (answers[current]) return; // locked
    const q       = levelQs[current];
    const correct = opt === q.answer;

    setAnswers(prev => ({ ...prev, [current]: opt }));

    if (correct) {
      const newStreak = streak + 1;
      const mult = infernoLeft > 0 ? 3 : getMultiplier(newStreak);

      // Speed bonus: answer in <5s → +50%, scales linearly to 0% at 20s
      const elapsed = (Date.now() - qStartTime) / 1000; // seconds
      const speedMult = elapsed < 5 ? 1.5 : elapsed < 20 ? 1 + 0.5 * (20 - elapsed) / 15 : 1;

      const pts = Math.round(BASE_POINTS * mult * (doubleActive ? 2 : 1) * speedMult);
      setScore(s => s + pts);
      setStreak(newStreak);
      setBestStreak(b => Math.max(b, newStreak));
      setDoubleActive(false);
      if (infernoLeft > 0) setInfernoLeft(n => n - 1);

      // Score popup text
      const totalMult = mult * (doubleActive ? 2 : 1) * speedMult;
      const bonus = totalMult > 1.05 ? ` (×${totalMult.toFixed(1)})` : '';
      const speedLabel = elapsed < 5 ? ' ⚡' : '';
      setScorePopup(`+${pts}${bonus}${speedLabel}`);
      setTimeout(() => setScorePopup(null), 900);
    } else {
      if (shieldActive) {
        setShieldActive(false);
        setScorePopup('🛡️ Streak saved!');
        setTimeout(() => setScorePopup(null), 900);
      } else {
        setStreak(0);
        setInfernoLeft(0);
        setDoubleActive(false);
      }
    }
  }

  // ── Power-up activation ───────────────────────────────────────────────────

  function usePowerUp(key: PowerUpKey) {
    if (usedPowerUps.has(key) || answers[current]) return;
    const q = levelQs[current];
    setUsedPowerUps(prev => new Set([...prev, key]));

    if (key === 'fifty_fifty') {
      const wrongs = q.options.filter(o => o !== q.answer);
      const remove = wrongs.sort(() => Math.random() - 0.5).slice(0, 2);
      setHiddenOpts(prev => ({ ...prev, [current]: remove }));
    } else if (key === 'double') {
      setDoubleActive(true);
    } else if (key === 'shield') {
      setShieldActive(true);
    } else if (key === 'surge') {
      setScore(s => s + 400);
      setScorePopup('+400 ⚡ SURGE!');
      setTimeout(() => setScorePopup(null), 1100);
    } else if (key === 'inferno') {
      setInfernoLeft(5);
      setScorePopup('🔥 INFERNO! ×3 for 5 Qs');
      setTimeout(() => setScorePopup(null), 1200);
    }
  }

  // ── Submit level ──────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    setSubmitted(true);
    const correct = levelQs.filter((q, i) => answers[i] === q.answer).length;
    const acc = pct(correct, levelQs.length);
    const newTotal = totalDone + levelQs.length;
    const newCorrect = totalCorrect + correct;
    setTotalDone(newTotal);
    setTotalCorrect(newCorrect);

    if (!playerName || !meta || submitted2lb) return;
    setLbLoading(true);
    try {
      await submitScore({ name: playerName, score, gradeKey: meta.gradeKey, level: level + 1, accuracy: acc, streak: bestStreak });
      setSubmitted2lb(true);
    } catch (e) {
      console.error('[Leaderboard] submitScore failed:', e);
    }
    try {
      const entries = await fetchLeaderboard(meta.gradeKey, 100);
      setLbEntries(entries);
    } catch (e) {
      console.error('[Leaderboard] fetchLeaderboard failed:', e);
    }
    setLbLoading(false);
  }, [submitted, levelQs, answers, playerName, meta, score, level, bestStreak, totalDone, totalCorrect, submitted2lb]);

  // ── Next level ────────────────────────────────────────────────────────────

  function goNextLevel() {
    const nextLevel = level + 1;
    const start = nextLevel * LEVEL_SIZE;
    setLevel(nextLevel);
    setLevelQs(pool.slice(start, start + LEVEL_SIZE));
    setCurrent(0);
    setAnswers({});
    setHiddenOpts({});
    setSubmitted(false);
    setSubmitted2lb(false);
    setAvailPowerUps(randomPowerUps(3));
    setUsedPowerUps(new Set());
    setDoubleActive(false);
    setShieldActive(false);
    setInfernoLeft(0);
  }

  function restartAll() {
    const reshuffled = [...pool].sort(() => Math.random() - 0.5);
    sessionStorage.setItem('customQuiz', JSON.stringify(reshuffled));
    setPool(reshuffled);
    setLevel(0); setLevelQs(reshuffled.slice(0, LEVEL_SIZE));
    setCurrent(0); setAnswers({}); setHiddenOpts({});
    setSubmitted(false); setSubmitted2lb(false);
    setScore(0); setStreak(0); setBestStreak(0);
    setTotalCorrect(0); setTotalDone(0);
    setAvailPowerUps(randomPowerUps(3));
    setUsedPowerUps(new Set());
    setDoubleActive(false); setShieldActive(false); setInfernoLeft(0);
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!loaded) return (
    <main style={{ minHeight: '100vh', background: '#09090f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </main>
  );

  if (error) return (
    <main style={{ minHeight: '100vh', background: '#09090f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 20px' }}>
      <XCircle size={40} color="#f87171" />
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, textAlign: 'center', maxWidth: 360 }}>{error}</p>
      <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontSize: 14 }}>
        <ArrowLeft size={14} /> Go back
      </button>
    </main>
  );

  const accent      = meta?.accent ?? '#6366f1';
  const totalLevels = Math.ceil(pool.length / LEVEL_SIZE);
  const isLastLevel = level >= totalLevels - 1;
  const levelStart  = level * LEVEL_SIZE;

  // ── Level results ─────────────────────────────────────────────────────────

  if (submitted) {
    const correct = levelQs.filter((q, i) => answers[i] === q.answer).length;
    const acc     = pct(correct, levelQs.length);
    const ia      = levelAccent(acc);

    return (
      <main style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%), #09090f', fontFamily: 'var(--font-body)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 20px 80px' }}>

          {/* Score banner */}
          <div style={{ textAlign: 'center', padding: '36px 20px 28px', background: `${ia}0d`, border: `1.5px solid ${ia}35`, borderRadius: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Level {level + 1} of {totalLevels}
            </div>
            <div style={{ fontSize: 56, fontFamily: 'var(--font-display)', color: ia, lineHeight: 1 }}>{acc}%</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{correct} / {levelQs.length} correct</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', color: accent }}>{score.toLocaleString()}</div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>points</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', color: '#f59e0b' }}>{bestStreak}</div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>best streak</div>
              </div>
            </div>
          </div>

          {/* Overall progress */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)' }}>Overall progress</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)' }}>{totalDone} / {pool.length}</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct(totalDone, pool.length)}%`, background: '#818cf8', borderRadius: 3, transition: 'width 0.4s' }} />
            </div>
          </div>

          {/* Leaderboard summary + drawer */}
          <LeaderboardSummary entries={lbEntries} myScore={score} accent={accent} loading={lbLoading} onExpand={() => setShowLbDrawer(true)} />
          {showLbDrawer && <LeaderboardDrawer entries={lbEntries} myScore={score} accent={accent} onClose={() => setShowLbDrawer(false)} />}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
            {!isLastLevel && (
              <button onClick={goNextLevel} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, background: accent, border: 'none', color: '#000', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                <Layers size={15} /> Level {level + 2} →
              </button>
            )}
            {isLastLevel && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7', fontSize: 14, fontWeight: 700 }}>
                <Trophy size={15} /> All done — total: {score.toLocaleString()} pts
              </div>
            )}
            <button onClick={restartAll} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', cursor: 'pointer', fontSize: 14 }}>
              <RotateCcw size={13} /> Restart
            </button>
            <button onClick={() => router.push('/practice')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 14 }}>
              <ArrowLeft size={13} /> Back
            </button>
          </div>

          {/* Per-question review */}
          <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Review · Q{levelStart + 1}–{levelStart + levelQs.length}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {levelQs.map((q, i) => {
              const ch = answers[i]; const right = ch === q.answer; const ia2 = right ? '#10b981' : '#ef4444';
              return (
                <div key={q.id ?? i} style={{ background: `${ia2}08`, border: `1px solid ${ia2}20`, borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    {right ? <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} /> : <XCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />}
                    <p style={{ margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.22)', marginRight: 6 }}>Q{levelStart + i + 1}</span>{q.text}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginLeft: 22 }}>
                    {q.options.map(opt => {
                      const isA = opt === q.answer; const isCh = opt === ch;
                      return (
                        <div key={opt} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, background: isA ? 'rgba(16,185,129,0.1)' : isCh ? 'rgba(239,68,68,0.08)' : 'transparent', border: isA ? '1px solid rgba(16,185,129,0.28)' : isCh ? '1px solid rgba(239,68,68,0.22)' : '1px solid transparent', color: isA ? '#6ee7b7' : isCh ? '#fca5a5' : 'rgba(255,255,255,0.35)' }}>
                          {opt}{isA && !isCh && <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.6 }}>← correct</span>}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && <p style={{ margin: '7px 0 0 22px', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.55, fontStyle: 'italic' }}>{q.explanation}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // ── Quiz screen ────────────────────────────────────────────────────────────

  const q       = levelQs[current];
  const chosen  = answers[current];
  const hidden  = hiddenOpts[current] ?? [];
  const sl      = streakLabel(streak);

  if (!q) return null;

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%), #09090f', fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes popUp     { 0%{opacity:0;transform:translateY(0) scale(0.8)} 20%{opacity:1;transform:translateY(-12px) scale(1.1)} 80%{opacity:1;transform:translateY(-18px) scale(1)} 100%{opacity:0;transform:translateY(-28px) scale(0.9)} }
        @keyframes speedDrain    { from{width:100%} to{width:0%} }
        @keyframes slideInRight  { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes puGlow    { 0%,100%{box-shadow:0 0 6px 0 var(--pu-color,#6366f1)} 50%{box-shadow:0 0 18px 4px var(--pu-color,#6366f1)} }
        @keyframes puShimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes puBounce  { 0%,100%{transform:translateY(0) scale(1)} 30%{transform:translateY(-5px) scale(1.08)} 60%{transform:translateY(2px) scale(0.97)} }
        @keyframes puUsed    { 0%{opacity:1;filter:brightness(2)} 100%{opacity:0.28;filter:brightness(0.5)} }
        @keyframes puFloat   { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-3px)} }
        .pu-btn { position:relative; overflow:hidden; }
        .pu-btn::after { content:''; position:absolute; inset:0; background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.22) 50%,transparent 60%); background-size:200% 100%; background-position:-200% center; border-radius:inherit; pointer-events:none; }
        .pu-btn:not(.pu-used):not(.pu-locked):hover::after { animation: puShimmer 0.6s ease forwards; }
        .pu-btn:not(.pu-used):not(.pu-locked) { animation: puFloat 2.8s ease-in-out infinite, puGlow 2.5s ease-in-out infinite; }
        .pu-btn:not(.pu-used):not(.pu-locked):hover { animation: puBounce 0.4s ease, puGlow 2.5s ease-in-out infinite; transform-origin: center bottom; }
        .pu-btn:not(.pu-used):not(.pu-locked):active { transform: scale(0.93); }
        .pu-btn.pu-used { animation: puUsed 0.35s ease forwards !important; pointer-events:none; }
      `}</style>

      {showNameModal && <NameModal accent={accent} onDone={saveName} />}

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <button onClick={() => router.push('/practice')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: 0 }}>
            <ArrowLeft size={13} /> Practice
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.25)', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 6, padding: '3px 8px' }}>
              Lvl {level + 1}/{totalLevels}
            </span>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)' }}>{current + 1}/{levelQs.length}</span>
          </div>
        </div>

        {/* Score + streak row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: 20, fontFamily: 'var(--font-display)', color: accent }}>{score.toLocaleString()}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 5 }}>pts</span>
            {scorePopup && (
              <span style={{ position: 'absolute', top: -4, left: 0, fontSize: 13, fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap', animation: 'popUp 0.9s ease forwards', pointerEvents: 'none' }}>
                {scorePopup}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {infernoLeft > 0 && <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#ef4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '2px 7px' }}>🔥 ×3 ({infernoLeft})</span>}
            {doubleActive && <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#818cf8', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6, padding: '2px 7px' }}>×2 ready</span>}
            {shieldActive && <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 6, padding: '2px 7px' }}>🛡️ active</span>}
            {sl && <span style={{ fontSize: 12, fontWeight: 700, color: sl.color, background: `${sl.color}15`, borderRadius: 6, padding: '2px 8px', border: `1px solid ${sl.color}30` }}>{sl.label}</span>}
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.25)' }}>🔥{streak}</span>
          </div>
        </div>

        {/* Progress bars */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, marginBottom: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct(current, levelQs.length)}%`, background: accent, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct(levelStart + current, pool.length)}%`, background: 'rgba(99,102,241,0.3)', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Power-ups */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {availPowerUps.map(key => {
            const p      = POWERUPS.find(x => x.key === key)!;
            const used   = usedPowerUps.has(key);
            const locked = !!chosen;
            const cls    = ['pu-btn', used ? 'pu-used' : '', locked && !used ? 'pu-locked' : ''].filter(Boolean).join(' ');
            return (
              <button
                key={key}
                title={p.desc}
                className={cls}
                onClick={() => !used && !locked && usePowerUp(key)}
                style={{
                  // CSS variable lets the keyframe animation pick up the per-powerup color
                  ['--pu-color' as string]: p.color + '80',
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: used
                    ? 'rgba(255,255,255,0.03)'
                    : `linear-gradient(135deg, ${p.color}22 0%, ${p.color}10 100%)`,
                  border: `1.5px solid ${used ? 'rgba(255,255,255,0.07)' : p.color + '55'}`,
                  color: used ? 'rgba(255,255,255,0.18)' : p.color,
                  cursor: used || locked ? 'default' : 'pointer',
                  opacity: locked && !used ? 0.55 : 1,
                  textDecoration: used ? 'line-through' : 'none',
                  backdropFilter: 'blur(6px)',
                  letterSpacing: '0.01em',
                  // reset inline transform so CSS class animation takes over
                  transform: 'none',
                }}
              >
                <span style={{ fontSize: 15, lineHeight: 1 }}>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Question card + speed-bonus bar */}
        <div style={{ background: 'rgba(255,255,255,0.035)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '26px 24px 18px', marginBottom: 16, backdropFilter: 'blur(12px)' }}>
          <p style={{ fontSize: 17, color: '#f1f5f9', lineHeight: 1.6, margin: '0 0 14px' }}>{q.text}</p>
          {/* Speed bar — only visible before answering; shrinks over 20 s */}
          {!chosen && (
            <div style={{ position: 'relative', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div
                key={`speed-${current}`}   /* key forces restart on question change */
                style={{
                  position: 'absolute', inset: '0 auto 0 0',
                  height: '100%', borderRadius: 2,
                  background: 'linear-gradient(90deg, #10b981, #6366f1)',
                  animation: 'speedDrain 20s linear forwards',
                }}
              />
            </div>
          )}
          {chosen && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
              answered in {((Date.now() - qStartTime) / 1000).toFixed(1)}s
              {(Date.now() - qStartTime) < 5000 && <span style={{ color: '#fbbf24', marginLeft: 5 }}>⚡ speed bonus!</span>}
            </div>
          )}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
          {q.options.map((opt, oi) => {
            if (hidden.includes(opt) && !chosen) return null; // fifty_fifty hides until answered
            const isSelected = chosen === opt;
            const isCorrect  = opt === q.answer;
            const revealed   = !!chosen;
            let bg = 'rgba(255,255,255,0.03)', bdr = 'rgba(255,255,255,0.07)', clr = 'rgba(255,255,255,0.75)';
            if (revealed && isCorrect)              { bg = 'rgba(16,185,129,0.15)'; bdr = 'rgba(16,185,129,0.55)'; clr = '#6ee7b7'; }
            else if (revealed && isSelected)        { bg = 'rgba(239,68,68,0.15)';  bdr = 'rgba(239,68,68,0.5)';   clr = '#fca5a5'; }
            else if (!revealed && isSelected)       { bg = 'rgba(99,102,241,0.18)'; bdr = 'rgba(99,102,241,0.5)';  clr = '#c7d2fe'; }
            else if (revealed && hidden.includes(opt)) { bg = 'rgba(255,255,255,0.01)'; bdr = 'rgba(255,255,255,0.04)'; clr = 'rgba(255,255,255,0.2)'; }
            return (
              <button key={oi} onClick={() => pickAnswer(opt)}
                style={{ textAlign: 'left', padding: '13px 16px', borderRadius: 12, fontSize: 15, background: bg, border: `1.5px solid ${bdr}`, color: clr, cursor: chosen ? 'default' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>{opt}</span>
                {revealed && isCorrect  && <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0 }} />}
                {revealed && isSelected && !isCorrect && <XCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {chosen && q.explanation && (
          <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '11px 14px', marginBottom: 18 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, fontStyle: 'italic' }}>{q.explanation}</p>
          </div>
        )}

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: current === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.55)', cursor: current === 0 ? 'default' : 'pointer', fontSize: 13 }}
          >
            <ChevronLeft size={14} /> Back
          </button>

          {current < levelQs.length - 1 ? (
            <button onClick={() => setCurrent(c => c + 1)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 18px', borderRadius: 10, background: chosen ? accent : 'rgba(255,255,255,0.05)', border: `1px solid ${chosen ? 'transparent' : 'rgba(255,255,255,0.07)'}`, color: chosen ? '#000' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, fontWeight: chosen ? 700 : 400 }}
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={Object.keys(answers).length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 10, background: Object.keys(answers).length > 0 ? accent : 'rgba(255,255,255,0.05)', border: 'none', color: Object.keys(answers).length > 0 ? '#000' : 'rgba(255,255,255,0.3)', cursor: Object.keys(answers).length > 0 ? 'pointer' : 'default', fontSize: 13, fontWeight: 700 }}
            >
              <CheckCircle2 size={14} /> Finish level
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-mono)', marginTop: 12 }}>
          {Object.keys(answers).length}/{levelQs.length} answered · overall {levelStart + current}/{pool.length}
        </p>
      </div>
    </main>
  );
}
