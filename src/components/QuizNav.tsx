'use client';

/**
 * QuizNav — fixed bottom navigation bar for student-facing pages.
 *
 * Shows: Home · Practice · Study · Battle · Hot Seat
 * Highlights the current section automatically.
 * Optionally shows an "End Game" button (pass showEndGame + onEndGame).
 */

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, BookOpen, Swords, Flame, GraduationCap, X } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home',     href: '/',         icon: <Home size={18} /> },
  { label: 'Practice', href: '/practice', icon: <BookOpen size={18} /> },
  { label: 'Study',    href: '/study',    icon: <GraduationCap size={18} /> },
  { label: 'Battle',   href: '/battle',   icon: <Swords size={18} /> },
  { label: 'Hot Seat', href: '/hotseat',  icon: <Flame size={18} /> },
];

interface Props {
  /** Show an "End Game" button — pass true when a quiz is in progress */
  showEndGame?: boolean;
  /** Called when the user confirms they want to end the game */
  onEndGame?: () => void;
  /** Label for the end-game button (default "End Game") */
  endGameLabel?: string;
}

export default function QuizNav({ showEndGame, onEndGame, endGameLabel = 'End Game' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [showConfirm, setShowConfirm] = useState(false);

  function activeSection() {
    if (pathname === '/') return '/';
    for (const item of NAV_ITEMS.slice(1)) {
      if (pathname.startsWith(item.href)) return item.href;
    }
    return null;
  }

  const active = activeSection();

  function handleNav(href: string) {
    // If a game is in progress, ask first
    if (showEndGame && href !== pathname) {
      setShowConfirm(true);
      // Store intent so confirmation can redirect
      pendingHref.current = href;
    } else {
      router.push(href);
    }
  }

  // Ref-free approach: store pending target in module scope (fine for singleton)
  const pendingHref = { current: '/' as string };

  function confirmEnd() {
    setShowConfirm(false);
    onEndGame?.();
    router.push(pendingHref.current);
  }

  return (
    <>
      {/* ── Confirmation modal ───────────────────────────────────── */}
      {showConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#111827',
              border: '1.5px solid rgba(239,68,68,0.35)',
              borderRadius: 20,
              padding: '32px 28px',
              width: '100%',
              maxWidth: 360,
              textAlign: 'center',
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
            }}>
              <X size={24} color="#f87171" />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 20,
              color: '#f1f5f9', margin: '0 0 10px',
            }}>
              End this quiz?
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.42)', fontSize: 14,
              margin: '0 0 26px', lineHeight: 1.5,
            }}>
              Your progress will be lost. Are you sure you want to leave?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.65)', fontSize: 14,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Keep playing
              </button>
              <button
                onClick={confirmEnd}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.15)',
                  border: '1.5px solid rgba(239,68,68,0.4)',
                  color: '#fca5a5', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Yes, end it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Nav bar ─────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 80,
          background: 'rgba(9,9,15,0.92)',
          backdropFilter: 'blur(18px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'stretch',
          height: 58,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* End Game button — far left, only when in a quiz */}
        {showEndGame && (
          <button
            onClick={() => {
              pendingHref.current = '/practice';
              setShowConfirm(true);
            }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 2,
              padding: '0 14px',
              background: 'none', border: 'none',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer', flexShrink: 0,
              color: '#f87171',
            }}
          >
            <X size={16} />
            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              {endGameLabel}
            </span>
          </button>
        )}

        {/* Nav items */}
        {NAV_ITEMS.map(item => {
          const isActive = active === item.href;
          return (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                background: 'none', border: 'none', cursor: 'pointer',
                color: isActive ? '#818cf8' : 'rgba(255,255,255,0.32)',
                transition: 'color 0.15s',
                position: 'relative',
                padding: 0,
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.32)';
              }}
            >
              {/* Active indicator pill */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 28, height: 2, borderRadius: 2, background: '#818cf8',
                }} />
              )}
              {item.icon}
              <span style={{
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                fontWeight: isActive ? 700 : 400,
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Spacer so content doesn't hide behind nav */}
      <div style={{ height: 58 }} />
    </>
  );
}
