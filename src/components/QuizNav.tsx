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
import { Home, BookOpen, Swords, Flame, GraduationCap, X, Music } from 'lucide-react';
import { useMusicContext } from '@/contexts/MusicContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home',     href: '/student',  icon: <Home size={18} /> },
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
  const [musicOpen, setMusicOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const { tracks, nowPlaying, volume, toggleTrack, setVolume, addCustomTrack } = useMusicContext();
  const nowTrack = tracks.find(t => t.id === nowPlaying);

  function activeSection() {
    // join/play are part of the student home flow — keep Home tab active
    if (pathname.startsWith('/student') || pathname.startsWith('/join') || pathname.startsWith('/play')) return '/student';
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

      {/* ── Music pill (floating above nav) ────────────────────── */}
      {musicOpen && (
        <div
          style={{
            position: 'fixed', bottom: 66, left: '50%', transform: 'translateX(-50%)',
            zIndex: 90, width: 'calc(100% - 32px)', maxWidth: 400,
            background: 'rgba(9,9,15,0.96)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
          }}
        >
          {tracks.map(t => {
            const active = nowPlaying === t.id;
            return (
              <button
                key={t.id}
                onClick={() => toggleTrack(t.id, t.src)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', background: active ? 'rgba(52,211,153,0.1)' : 'transparent',
                  border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 16 }}>{t.emoji}</span>
                <span style={{ flex: 1, fontSize: 13, color: active ? '#34d399' : 'rgba(255,255,255,0.7)', fontWeight: active ? 600 : 400 }}>
                  {t.label}
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginLeft: 6 }}>{t.artist}</span>
                </span>
                <span style={{ fontSize: 15, color: active ? '#34d399' : 'rgba(255,255,255,0.2)' }}>{active ? '⏸' : '▶'}</span>
              </button>
            );
          })}

          {nowPlaying && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>🔈</span>
              <input
                type="range" min={0} max={1} step={0.05} value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#34d399', height: 4 }}
              />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>🔊</span>
            </div>
          )}

          {!showAddCustom ? (
            <button
              onClick={() => setShowAddCustom(true)}
              style={{ width: '100%', padding: '9px 16px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
            >
              + Add custom URL…
            </button>
          ) : (
            <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                placeholder="Track name"
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, outline: 'none' }}
              />
              <input
                placeholder="Audio URL (.mp3, .ogg…)"
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { if (customUrl.trim()) { addCustomTrack(customLabel, customUrl.trim()); setCustomUrl(''); setCustomLabel(''); setShowAddCustom(false); } }}
                  style={{ flex: 1, padding: '7px', borderRadius: 8, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                >
                  Add &amp; Play
                </button>
                <button
                  onClick={() => setShowAddCustom(false)}
                  style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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

        {/* Music button */}
        <button
          onClick={() => setMusicOpen(o => !o)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 2,
            padding: '0 14px',
            background: 'none', border: 'none',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer', flexShrink: 0,
            color: nowPlaying ? '#34d399' : 'rgba(255,255,255,0.32)',
            position: 'relative',
          }}
        >
          {nowPlaying && (
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 28, height: 2, borderRadius: 2, background: '#34d399',
            }} />
          )}
          <Music size={16} />
          <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            {nowPlaying ? '♪' : 'Music'}
          </span>
        </button>

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
