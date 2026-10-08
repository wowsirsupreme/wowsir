'use client';

import { cn } from '@/lib/utils';
import type { SessionPlayer } from '@/types/session';
import { Avatar } from '@/components/ui/Avatar';

interface LeaderboardProps {
  players: (SessionPlayer & { rank: number })[];
  currentPlayerId?: string;
  compact?: boolean;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function Leaderboard({ players, currentPlayerId, compact }: LeaderboardProps) {
  return (
    <div className={cn('flex flex-col gap-2.5 w-full max-w-lg', compact && 'max-w-full')}>
      {players.slice(0, compact ? 5 : 20).map((p, i) => {
        const isMe = p.id === currentPlayerId;
        const isTop3 = i < 3;
        return (
          <div
            key={p.id}
            className={cn(
              'flex items-center gap-4 px-5 py-3.5 rounded-xl border animate-slideUp',
              'bg-white/5 border-white/8',
              isTop3 && i === 0 && 'border-gold bg-gold/12',
              isTop3 && i === 1 && 'border-gold/40',
              isTop3 && i === 2 && 'border-gold/20',
              isMe && !isTop3 && 'border-accent/50 bg-accent/10',
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="font-mono text-sm text-muted w-6 text-center">
              {MEDALS[i] || i + 1}
            </span>
            <Avatar id={p.avatarId} size={compact ? 32 : 40} />
            <span className={cn('flex-1 text-base font-medium text-paper', isMe && 'text-gold')}>
              {p.name} {isMe && <span className="text-xs text-muted">(you)</span>}
            </span>
            {!compact && (
              <div className="flex gap-3 text-xs text-muted font-mono">
                <span className="text-green-400">{p.streak > 0 ? `🔥 ${p.streak}` : ''}</span>
              </div>
            )}
            <span className={cn('font-mono text-lg font-medium', isTop3 ? 'text-gold' : 'text-paper')}>
              {p.score.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
