'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Gamepad2, BookOpen, GraduationCap, Swords, Flame,
  ChevronRight, Star, Zap, Trophy,
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
    description: 'Enter a room code from your teacher',
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
    description: 'Solo quiz by topic, any time',
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
    description: 'Flashcards, notes & summaries',
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
    description: 'Challenge a classmate head-to-head',
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

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>

      {/* ── sticky nav bar ── */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'rgba(2,12,18,0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div
          style={{
            maxWidth: 720, margin: '0 auto',
            padding: '0 24px',
            height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => router.push('/')}
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', minHeight: 44, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            WOW Sir
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>
              STUDENT
            </span>
          </div>

          {/* Avatar / name chip */}
          {firstName ? (
            <button
              onClick={() => router.push('/join')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px 6px 6px', borderRadius: 999,
                background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)',
                cursor: 'pointer', minHeight: 44,
              }}
            >
              <Avatar id={avatarId} size={24} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#22d3ee' }}>{firstName}</span>
            </button>
          ) : (
            <button
              onClick={() => router.push('/join')}
              style={{
                fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 10,
                background: 'rgba(6,182,212,0.15)', border: '1.5px solid rgba(6,182,212,0.35)',
                color: '#22d3ee', cursor: 'pointer', minHeight: 44,
              }}
            >
              Join Game
            </button>
          )}
        </div>
      </div>

      {/* ── page body ── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 100px' }}>

        {/* Hero greeting */}
        <div className="animate-fadeUp" style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 6 }}>
            STUDENT HOME
          </p>
          {firstName ? (
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,6vw,44px)', lineHeight: 1.1, margin: 0 }}>
              {greeting},{' '}
              <span style={{ color: '#22d3ee', textShadow: '0 0 28px rgba(6,182,212,0.5)' }}>{firstName}.</span>
            </h1>
          ) : (
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,6vw,44px)', lineHeight: 1.1, margin: 0 }}>
              Welcome,{' '}
              <span style={{ color: '#22d3ee', textShadow: '0 0 28px rgba(6,182,212,0.5)' }}>student.</span>
            </h1>
          )}
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', marginTop: 8 }}>
            What would you like to do today?
          </p>
        </div>

        {/* Quick-action grid */}
        <div
          className="animate-fadeUp"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
            animationDelay: '80ms',
          }}
        >
          {MODES.map((m, i) => {
            const hov = hoveredId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => router.push(m.href)}
                onMouseEnter={() => setHoveredId(m.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="animate-fadeUp"
                style={{
                  animationDelay: `${80 + i * 60}ms`,
                  borderRadius: 18,
                  border: `1.5px solid ${hov ? m.hoverBorder : m.border}`,
                  background: hov ? m.accent : `${m.accent}88`,
                  boxShadow: hov ? `0 0 22px ${m.glow}` : 'none',
                  padding: '20px 16px',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
                  cursor: 'pointer', transition: 'all 0.18s',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: `${m.accent}cc`, border: `1px solid ${m.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.18s',
                    boxShadow: hov ? `0 0 12px ${m.glow}` : 'none',
                  }}
                >
                  <m.Icon size={20} color={m.tagColor} strokeWidth={1.75} />
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
                    {m.label}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: '3px 0 0', lineHeight: 1.4 }}>
                    {m.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Tips row ── */}
        <div
          className="animate-fadeUp"
          style={{
            marginTop: 36, borderRadius: 16, padding: '18px 20px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            animationDelay: '400ms',
          }}
        >
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 14 }}>
            QUICK TIPS
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { Icon: Zap,    color: '#fbbf24', text: 'Your teacher will share a 6-digit code when a game is live.' },
              { Icon: Star,   color: '#a78bfa', text: 'Practice anytime — pick a topic and quiz yourself solo.' },
              { Icon: Trophy, color: '#34d399', text: 'Battle a classmate by sharing your battle link.' },
            ].map(({ Icon, color, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: `${color}1a`, border: `1px solid ${color}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={14} color={color} strokeWidth={2} />
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: 0 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Go to Join shortcut ── */}
        <button
          onClick={() => router.push('/join')}
          className="animate-fadeUp"
          style={{
            animationDelay: '480ms',
            marginTop: 16, width: '100%',
            padding: '16px 20px', borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(6,182,212,0.18), rgba(6,182,212,0.08))',
            border: '1.5px solid rgba(6,182,212,0.35)',
            color: '#22d3ee', fontSize: 15, fontWeight: 700,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 0 24px rgba(6,182,212,0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Gamepad2 size={20} strokeWidth={1.75} />
            Join a live game
          </div>
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>

      </div>

      <QuizNav />
    </div>
  );
}
