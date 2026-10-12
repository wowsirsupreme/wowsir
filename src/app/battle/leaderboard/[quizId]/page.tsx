'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { getBattleLeaderboard } from '@/lib/firebase/battles';
import type { BattleResult } from '@/types/battle';

const BG = [
  'radial-gradient(ellipse 70% 60% at 20% -10%, rgba(239,68,68,0.18) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 50% at 85% 20%,  rgba(99,102,241,0.15) 0%, transparent 55%)',
  '#060410',
].join(',');

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

type WinCount = { name: string; wins: number; losses: number; draws: number; totalScore: number; battles: number };

export default function BattleLeaderboardPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();

  const [results, setResults] = useState<BattleResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'leaderboard' | 'recent'>('leaderboard');

  useEffect(() => {
    getBattleLeaderboard(quizId, 100).then(r => {
      setResults(r);
      setLoading(false);
    });
  }, [quizId]);

  // Build win-count leaderboard (aggregate by player)
  const playerMap = new Map<string, WinCount>();
  for (const r of results) {
    for (const [id, name, isWinner] of [
      [r.player1Id, r.player1Name, r.winnerId === r.player1Id],
      [r.player2Id, r.player2Name, r.winnerId === r.player2Id],
    ] as [string, string, boolean][]) {
      if (id === 'ai') continue;
      const existing = playerMap.get(id) ?? { name, wins: 0, losses: 0, draws: 0, totalScore: 0, battles: 0 };
      existing.battles++;
      if (r.draw) existing.draws++;
      else if (isWinner) existing.wins++;
      else existing.losses++;
      existing.totalScore += (id === r.player1Id ? r.player1Score : r.player2Score);
      playerMap.set(id, existing);
    }
  }

  const leaderboard = Array.from(playerMap.values())
    .sort((a, b) => b.wins - a.wins || b.totalScore - a.totalScore);

  const quizTitle = results[0]?.quizTitle ?? 'Quiz Battles';

  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(6,4,16,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 20px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.back()} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20, padding: '0 4px' }}>←</button>
          <span style={{ fontSize: 18 }}>🏆</span>
          <div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Battle Leaderboard</span>
            <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>{quizTitle}</span>
          </div>
        </div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>
          {results.length} battles
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 20px' }}>
        {(['leaderboard', 'recent'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '14px 20px', fontSize: 13, fontWeight: 600,
              color: tab === t ? '#fff' : 'rgba(255,255,255,0.35)',
              borderBottom: tab === t ? '2px solid #ef4444' : '2px solid transparent',
              textTransform: 'capitalize', cursor: 'pointer',
            }}
          >
            {t === 'leaderboard' ? '🏆 Rankings' : '⚔️ Recent Battles'}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 60px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Loading…</p>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>⚔️</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>No battles yet</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Play a battle to appear here</p>
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {!loading && tab === 'leaderboard' && leaderboard.length > 0 && (
          <div style={{ display: 'grid', gap: 10 }}>
            {leaderboard.map((player, idx) => {
              const winRate = player.battles > 0 ? Math.round((player.wins / player.battles) * 100) : 0;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
              return (
                <div
                  key={player.name + idx}
                  style={{
                    borderRadius: 16,
                    background: idx === 0 ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${idx === 0 ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    padding: '14px 18px',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}
                >
                  <div style={{
                    minWidth: 36, textAlign: 'center',
                    fontSize: medal ? 22 : 16,
                    fontWeight: 800, color: 'rgba(255,255,255,0.3)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {medal ?? `#${idx + 1}`}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 16, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {player.name}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '3px 0 0' }}>
                      {player.wins}W · {player.losses}L · {player.draws}D · {winRate}% win rate
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color: idx === 0 ? '#fbbf24' : '#fff', margin: 0, lineHeight: 1 }}>
                      {player.wins}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>wins</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* RECENT BATTLES TAB */}
        {!loading && tab === 'recent' && results.length > 0 && (
          <div style={{ display: 'grid', gap: 10 }}>
            {results.slice(0, 50).map(r => (
              <div
                key={r.id}
                style={{
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '14px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>
                    {timeAgo(r.playedAt)}
                  </span>
                  {r.draw ? (
                    <span style={{ fontSize: 11, color: '#94a3b8', background: 'rgba(148,163,184,0.1)', borderRadius: 6, padding: '2px 8px' }}>DRAW</span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', borderRadius: 6, padding: '2px 8px' }}>
                      🏆 {r.winnerName}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: r.winnerId === r.player1Id ? '#fbbf24' : '#fff', margin: 0 }}>
                      {r.player1Name}
                      {r.player1Id === 'ai' && <span style={{ fontSize: 10, color: 'rgba(99,102,241,0.7)', marginLeft: 4 }}>AI</span>}
                    </p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>{r.player1Score}</p>
                  </div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>VS</div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: r.winnerId === r.player2Id ? '#fbbf24' : '#fff', margin: 0 }}>
                      {r.player2Name}
                      {r.player2Id === 'ai' && <span style={{ fontSize: 10, color: 'rgba(99,102,241,0.7)', marginLeft: 4 }}>AI</span>}
                    </p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>{r.player2Score}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
