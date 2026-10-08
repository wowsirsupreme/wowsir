'use client';

import { cn } from '@/lib/utils';

const AVATARS: { bg: string; body: string }[] = [
  { bg: '#6c63ff', body: '🤖' },   // 0 robot
  { bg: '#2ec4b6', body: '👨‍🚀' }, // 1 astronaut
  { bg: '#e63946', body: '🥷' },   // 2 ninja
  { bg: '#8338ec', body: '🧙' },   // 3 wizard
  { bg: '#3a86ff', body: '🛡️' },  // 4 knight
  { bg: '#06d6a0', body: '🔬' },   // 5 scientist
  { bg: '#fb8500', body: '🎨' },   // 6 artist
  { bg: '#ef233c', body: '⚡' },   // 7 athlete
  { bg: '#118ab2', body: '🧭' },   // 8 explorer
  { bg: '#ffd60a', body: '🏆' },   // 9 champion
];

export const AVATAR_COUNT = AVATARS.length;

export function Avatar({
  id,
  size = 48,
  className,
}: {
  id: number;
  size?: number;
  className?: string;
}) {
  const av = AVATARS[id % AVATARS.length] || AVATARS[0];
  return (
    <div
      className={cn('rounded-full flex items-center justify-center flex-shrink-0 select-none', className)}
      style={{
        width: size,
        height: size,
        background: av.bg,
        fontSize: size * 0.5,
        lineHeight: 1,
      }}
    >
      {av.body}
    </div>
  );
}

export function AvatarGrid({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-3 mb-4">
      {AVATARS.map((av, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={cn(
            'rounded-xl p-1.5 border-2 transition-all',
            selected === i
              ? 'border-gold scale-110 shadow-lg'
              : 'border-transparent hover:border-gold/40'
          )}
        >
          <Avatar id={i} size={44} />
        </button>
      ))}
    </div>
  );
}
