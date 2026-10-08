'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Gamepad2, GraduationCap, Swords, Flame, ChevronRight, Loader2,
  BookOpen, Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { AdminPanel, useAdminTap } from '@/components/admin/AdminPanel';
import { useFirebase } from '@/hooks/useFirebase';

// ── Mode cards ────────────────────────────────────────────────────────────────

const MODES: {
  id: string; Icon: LucideIcon; title: string; sub: string; href: string;
  accent: string; bg: string; border: string; borderHover: string; glow: string; tag: string;
}[] = [
  {
    id: 'join', Icon: Gamepad2, title: 'Join Game', sub: 'Enter a room code to play',
    href: '/join', accent: '#fcd34d',
    bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.18)', borderHover: 'rgba(245,158,11,0.5)',
    glow: 'rgba(245,158,11,0.22)', tag: 'STUDENT',
  },
  {
    id: 'teacher', Icon: GraduationCap, title: 'Teacher', sub: 'Host quizzes & manage classes',
    href: '/teacher', accent: '#7dd3fc',
    bg: 'rgba(56,189,248,0.06)', border: 'rgba(56,189,248,0.16)', borderHover: 'rgba(56,189,248,0.45)',
    glow: 'rgba(56,189,248,0.22)', tag: 'TEACHER',
  },
  {
    id: 'battle', Icon: Swords, title: 'Battle Mode', sub: '1v1 head-to-head competition',
    href: '/battle', accent: '#c4b5fd',
    bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', borderHover: 'rgba(139,92,246,0.55)',
    glow: 'rgba(139,92,246,0.28)', tag: 'PvP',
  },
  {
    id: 'hotseat', Icon: Flame, title: 'Hot Seat', sub: 'Solo · 10 questions · 15s each',
    href: '/hotseat', accent: '#fdba74',
    bg: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.18)', borderHover: 'rgba(249,115,22,0.5)',
    glow: 'rgba(249,115,22,0.25)', tag: 'SOLO',
  },
  {
    id: 'study', Icon: BookOpen, title: 'Study Corner', sub: 'Chapter questions & flashcards',
    href: '/study', accent: '#6ee7b7',
    bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.18)', borderHover: 'rgba(16,185,129,0.45)',
    glow: 'rgba(16,185,129,0.22)', tag: 'STUDY',
  },
  {
    id: 'practice', Icon: Layers, title: 'Practice Mode', sub: 'Grade quizzes · IGCSE & A-Level prep',
    href: '/practice', accent: '#818cf8',
    bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.18)', borderHover: 'rgba(99,102,241,0.45)',
    glow: 'rgba(99,102,241,0.25)', tag: 'PREP',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const { configured, checking } = useFirebase();
  const { open: adminOpen, setOpen: setAdminOpen, handleTap } = useAdminTap();

  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') setAdminOpen(true);
  }, [setAdminOpen]);

  if (!mounted) return null;

  const BG = [
    'radial-gradient(ellipse 70% 50% at 20% 20%, rgba(201,168,76,0.12) 0%, transparent 50%)',
    'radial-gradient(ellipse 60% 50% at 80% 15%, rgba(139,92,246,0.1) 0%, transparent 50%)',
    'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(56,189,248,0.08) 0%, transparent 50%)',
    '#060510',
  ].join(',');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        color: '#f5f3ee',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Star-field */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.15), transparent),
            radial-gradient(1px 1px at 70% 15%, rgba(255,255,255,0.1), transparent),
            radial-gradient(1px 1px at 45% 70%, rgba(255,255,255,0.08), transparent),
            radial-gradient(1px 1px at 85% 55%, rgba(255,255,255,0.12), transparent),
            radial-gradient(1px 1px at 30% 85%, rgba(255,255,255,0.08), transparent)
          `,
        }}
      />

      {/* ── Two-column layout: sidebar + cards ── */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 980, display: 'flex', alignItems: 'center', gap: 32 }}>

        {/* ── Left sidebar: logo & branding ── */}
        <div style={{ flexShrink: 0, width: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* Logo icon */}
          <button
            onClick={handleTap}
            aria-label="WOW Sir"
            style={{ background: 'none', border: 'none', cursor: 'default', padding: 0 }}
          >
            <div
              className="animate-float"
              style={{
                width: 72, height: 72, borderRadius: 22,
                background: 'rgba(201,168,76,0.12)',
                border: '1.5px solid rgba(201,168,76,0.25)',
                filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.45))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <GraduationCap size={36} color="#c9a84c" strokeWidth={1.5} />
            </div>
          </button>

          {/* Title */}
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 36,
                color: '#fff',
                margin: 0, lineHeight: 1,
              }}
            >
              WOW{' '}
              <span style={{ color: '#c9a84c', textShadow: '0 0 24px rgba(201,168,76,0.5)' }}>
                Sir
              </span>
            </h1>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '6px 0 0', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', lineHeight: 1.5 }}>
              DPS International<br />Ghana · Gr 4–11
            </p>
          </div>

          {/* Firebase status */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 999,
              fontSize: 10, fontFamily: 'var(--font-mono)',
              background: configured ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)',
              color: configured ? '#4ade80' : 'rgba(255,255,255,0.3)',
              border: `1px solid ${configured ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)'}`,
              textAlign: 'center',
            }}
          >
            {checking ? (
              <><Loader2 size={9} className="animate-spin" /> connecting…</>
            ) : configured ? (
              <><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80', flexShrink: 0 }} /> connected</>
            ) : (
              <><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'inline-block', flexShrink: 0 }} /> tap 5× to setup</>
            )}
          </div>

          {/* Footer */}
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.12)', fontFamily: 'var(--font-mono)', textAlign: 'center', margin: 0 }}>
            v1.0
          </p>
        </div>

        {/* ── Right: card grid ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
        {/* ── 6-card grid ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          {MODES.map((mode, i) => {
            const isHov = hovered === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => router.push(mode.href)}
                onMouseEnter={() => setHovered(mode.id)}
                onMouseLeave={() => setHovered(null)}
                className="animate-slideUp"
                style={{
                  animationDelay: `${i * 60}ms`,
                  padding: '20px 18px',
                  borderRadius: 20,
                  background: isHov
                    ? mode.bg.replace(/[\d.]+\)$/, v => String(Math.min(parseFloat(v) * 2, 0.18)) + ')')
                    : mode.bg,
                  border: `1.5px solid ${isHov ? mode.borderHover : mode.border}`,
                  boxShadow: isHov
                    ? `0 8px 32px ${mode.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`
                    : '0 2px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
                  transform: isHov ? 'translateY(-3px)' : 'none',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(12px)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  minHeight: 130,
                  position: 'relative',
                }}
              >
                {/* Tag */}
                <span
                  style={{
                    position: 'absolute', top: 14, right: 14,
                    fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700,
                    letterSpacing: '0.1em', color: mode.accent,
                    background: mode.bg,
                    border: `1px solid ${mode.border}`,
                    padding: '2px 7px', borderRadius: 999,
                    opacity: isHov ? 1 : 0.55, transition: 'opacity 0.2s',
                  }}
                >
                  {mode.tag}
                </span>

                {/* Icon */}
                <div
                  style={{
                    width: 42, height: 42, borderRadius: 12, marginBottom: 14,
                    background: mode.bg,
                    border: `1px solid ${mode.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transform: isHov ? 'scale(1.1) rotate(-5deg)' : 'none',
                    filter: isHov ? `drop-shadow(0 0 7px ${mode.glow})` : 'none',
                    transition: 'transform 0.2s, filter 0.2s',
                  }}
                >
                  <mode.Icon size={20} color={mode.accent} strokeWidth={1.75} />
                </div>

                {/* Title */}
                <span
                  style={{
                    fontFamily: 'var(--font-display)', fontSize: 17, color: '#fff',
                    marginBottom: 4, lineHeight: 1.2,
                    textShadow: isHov ? `0 0 18px ${mode.glow}` : 'none',
                    transition: 'text-shadow 0.2s',
                  }}
                >
                  {mode.title}
                </span>

                {/* Sub */}
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>
                  {mode.sub}
                </span>

                {/* Hover arrow */}
                <ChevronRight
                  size={16}
                  color={mode.accent}
                  style={{
                    position: 'absolute', right: 14, bottom: 14,
                    opacity: isHov ? 1 : 0,
                    transform: isHov ? 'translateX(0)' : 'translateX(-6px)',
                    transition: 'opacity 0.2s, transform 0.2s',
                  }}
                />
              </button>
            );
          })}
        </div>

        </div>

      </div>

      {/* Admin Modal */}
      <Modal open={adminOpen} onClose={() => setAdminOpen(false)}>
        <AdminPanel onClose={() => setAdminOpen(false)} />
      </Modal>
    </div>
  );
}
