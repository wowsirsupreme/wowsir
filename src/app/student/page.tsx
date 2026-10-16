'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Gamepad2, BookOpen, GraduationCap, Swords, Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import QuizNav from '@/components/QuizNav';
import { Avatar } from '@/components/ui/Avatar';

const BG = [
  'radial-gradient(ellipse 70% 50% at 20% 0%,   rgba(6,182,212,0.10) 0%, transparent 55%)',
  'radial-gradient(ellipse 50% 60% at 85% 25%,  rgba(139,92,246,0.07) 0%, transparent 50%)',
  '#020c12',
].join(',');

const MODES: {
  id: string;
  Icon: LucideIcon;
  label: string;
  description: string;
  href: string;
  accent: string;
  border: string;
  hoverBorder: string;
  glow: string;
  tagColor: string;
}[] = [
  {
    id: 'join',
    Icon: Gamepad2,
    label: 'Join Game',
    description: 'Enter your teacher\'s room code',
    href: '/join',
    accent: 'rgba(6,182,212,0.15)',
    border: 'rgba(6,182,212,0.28)',
    hoverBorder: 'rgba(6,182,212,0.6)',
    glow: 'rgba(6,182,212,0.22)',
    tagColor: '#22d3ee',
  },
  {
    id: 'practice',
    Icon: BookOpen,
    label: 'Practice',
    description: 'Solo quiz by topic',
    href: '/practice',
    accent: 'rgba(139,92,246,0.15)',
    border: 'rgba(139,92,246,0.28)',
    hoverBorder: 'rgba(139,92,246,0.6)',
    glow: 'rgba(139,92,246,0.22)',
    tagColor: '#a78bfa',
  },
  {
    id: 'study',
    Icon: GraduationCap,
    label: 'Study',
    description: 'Flashcards & notes',
    href: '/study',
    accent: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.26)',
    hoverBorder: 'rgba(16,185,129,0.55)',
    glow: 'rgba(16,185,129,0.18)',
    tagColor: '#34d399',
  },
  {
    id: 'battle',
    Icon: Swords,
    label: 'Battle',
    description: 'Head-to-head vs a classmate',
    href: '/battle',
    accent: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.25)',
    hoverBorder: 'rgba(239,68,68,0.55)',
    glow: 'rgba(239,68,68,0.18)',
    tagColor: '#f87171',
  },
  {
    id: 'hotseat',
    Icon: Flame,
    label: 'Hot Seat',
    description: 'Rapid-fire timed challenge',
    href: '/hotseat',
    accent: 'rgba(249,115,22,0.12)',
    border: 'rgba(249,115,22,0.25)',
    hoverBorder: 'rgba(249,115,22,0.55)',
    glow: 'rgba(249,115,22,0.18)',
    tagColor: '#fb923c',
  },
];

export default function StudentHomePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [avatarId, setAvatarId] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('playerName');
      if (saved) setPlayerName(saved);
      const savedAvatar = localStorage.getItem('playerAvatar');
      if (savedAvatar) setAvatarId(parseInt(savedAvatar, 10));
    } catch {}
  }, []);

  const firstName = playerName ? playerName.split(' ')[0] : null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div
      style={{
        height: '100dvh',
        background: BG,
        color: '#f5f3ee',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── top bar ── */}
      <div
        style={{
          flexShrink: 0,
          background: 'rgba(2,12,18,0.75)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div
          style={{
            maxWidth: 720, margin: '0 auto',
            padding: '0 20px',
            height: 52,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => router.push('/')}
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', minHeight: 44, display: 'flex', alignItems: 'center' }}
          >
            WOW Sir
          </button>

          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>
            STUDENT
          </span>

          {firstName ? (
            <button
              onClick={() => router.push('/join')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 10px 5px 5px', borderRadius: 999,
                background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)',
                cursor: 'pointer', minHeight: 44,
              }}
            >
              <Avatar id={avatarId} size={22} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#22d3ee' }}>{firstName}</span>
            </button>
          ) : (
            <div style={{ width: 60 }} />
          )}
        </div>
      </div>

      {/* ── content — fills remaining space ── */}
      <div
        style={{
          flex: 1,
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        {/* Greeting */}
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 4 }}>
            {greeting.toUpperCase()}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,5.5vw,40px)', lineHeight: 1.1, margin: 0 }}>
            {firstName ? (
              <>What&apos;s on today,{' '}
                <span style={{ color: '#22d3ee', textShadow: '0 0 24px rgba(6,182,212,0.5)' }}>{firstName}?</span>
              </>
            ) : (
              <>Pick a mode and{' '}
                <span style={{ color: '#22d3ee', textShadow: '0 0 24px rgba(6,182,212,0.5)' }}>get started.</span>
              </>
            )}
          </h1>
        </div>

        {/* Mode cards — 2 columns, 3 rows (last row has 1 centred card) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          {MODES.map((m) => {
            const hov = hoveredId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => router.push(m.href)}
                onMouseEnter={() => setHoveredId(m.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  borderRadius: 16,
                  border: `1.5px solid ${hov ? m.hoverBorder : m.border}`,
                  background: hov ? m.accent : `${m.accent}88`,
                  boxShadow: hov ? `0 0 20px ${m.glow}` : 'none',
                  padding: '16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer', transition: 'all 0.18s',
                  textAlign: 'left',
                  // last item (Hot Seat, index 4) spans both columns and centres itself
                  ...(m.id === 'hotseat' ? { gridColumn: '1 / -1', maxWidth: 'calc(50% - 5px)', margin: '0 auto', width: '100%' } : {}),
                }}
              >
                <div
                  style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                    background: `${m.accent}cc`, border: `1px solid ${m.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: hov ? `0 0 10px ${m.glow}` : 'none',
                    transition: 'all 0.18s',
                  }}
                >
                  <m.Icon size={19} color={m.tagColor} strokeWidth={1.75} />
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
                    {m.label}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: '2px 0 0', lineHeight: 1.4 }}>
                    {m.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* QuizNav sits at the bottom — its own fixed positioning handles it */}
      <QuizNav />
    </div>
  );
}
