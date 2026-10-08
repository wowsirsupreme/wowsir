'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseInstances } from '@/lib/firebase/config';
import type { SessionResult } from '@/types/session';

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const router = useRouter();
  const { user, ready } = useAuth();
  const [result, setResult] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !user) return;
    const { fs } = getFirebaseInstances();
    if (!fs) { setLoading(false); return; }
    getDoc(doc(fs, 'results', sessionId)).then(snap => {
      if (snap.exists()) setResult(snap.data() as SessionResult);
      setLoading(false);
    });
  }, [ready, user, sessionId]);

  function exportCSV() {
    if (!result) return;
    const rows = [
      ['Name', 'Score', 'Correct', 'Total', 'Accuracy', 'Best Streak', 'Tab Switches'],
      ...result.playerResults.map(p => [
        p.name, p.score, p.correct, p.total,
        `${Math.round(p.accuracy * 100)}%`, p.streak, p.tabSwitches,
      ]),
    ];
    const csv = rows.map(r => r.map(String).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results_${result.quizTitle}_${result.code}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!ready || loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-2xl animate-pulse-slow">🎓</div></div>;
  if (!user) { router.replace('/teacher'); return null; }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="text-5xl">😕</div>
        <p className="font-medium">Results not found</p>
        <Button variant="outline" onClick={() => router.push('/teacher')}>Back</Button>
      </div>
    );
  }

  const sortedPlayers = [...result.playerResults].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6 animate-fadeUp">
        <button onClick={() => router.push('/teacher')} className="text-2xl hover:scale-110 transition-transform">←</button>
        <div className="flex-1">
          <h1 className="font-display text-3xl">{result.quizTitle}</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Room {result.code} · {new Date(result.completedAt).toLocaleDateString()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>⬇️ Export CSV</Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 animate-fadeUp" style={{ animationDelay: '60ms' }}>
        {[
          { label: 'Players', val: result.summary.totalPlayers },
          { label: 'Avg Score', val: Math.round(result.summary.avgScore).toLocaleString() },
          { label: 'Avg Accuracy', val: `${Math.round(result.summary.avgAccuracy * 100)}%` },
          { label: 'Top Score', val: result.summary.topScore.toLocaleString() },
        ].map(({ label, val }) => (
          <div
            key={label}
            className="rounded-xl border p-4 text-center"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="text-2xl font-mono font-bold" style={{ color: 'var(--color-gold)' }}>{val}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="animate-fadeUp" style={{ animationDelay: '120ms' }}>
        <h2 className="font-display text-2xl mb-4">Results</h2>
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.04)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left px-4 py-3 font-semibold">#</th>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-right px-4 py-3 font-semibold">Score</th>
                <th className="text-right px-4 py-3 font-semibold">Accuracy</th>
                <th className="text-right px-4 py-3 font-semibold">Streak</th>
                <th className="text-right px-4 py-3 font-semibold text-xs" style={{ color: 'var(--color-red)' }}>
                  Tab Switch
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((p, i) => (
                <tr
                  key={i}
                  className="animate-fadeUp"
                  style={{
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    animationDelay: `${200 + i * 40}ms`,
                  }}
                >
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-muted)' }}>
                    {['🥇','🥈','🥉'][i] || i + 1}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: 'var(--color-gold)' }}>
                    {p.score.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: p.accuracy >= 0.7 ? 'rgba(26,107,74,0.12)' : p.accuracy >= 0.4 ? 'rgba(201,168,76,0.12)' : 'rgba(192,57,43,0.12)',
                        color: p.accuracy >= 0.7 ? 'var(--color-green)' : p.accuracy >= 0.4 ? 'var(--color-gold)' : 'var(--color-red)',
                      }}
                    >
                      {Math.round(p.accuracy * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.streak > 0 && <span className="text-xs">🔥 {p.streak}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.tabSwitches > 0 && (
                      <span className="text-xs font-medium" style={{ color: 'var(--color-red)' }}>
                        ⚠️ {p.tabSwitches}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
