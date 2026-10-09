'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';

interface Props {
  /** Position override — defaults to bottom-left */
  position?: React.CSSProperties;
}

export default function MuteButton({ position }: Props) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    // Load saved preference on mount
    const saved = audioEngine.loadMutePref();
    setMuted(saved);
  }, []);

  function toggle() {
    const next = !muted;
    audioEngine.setMuted(next);
    setMuted(next);
    if (!next) audioEngine.click(); // satisfying feedback on unmute
  }

  const defaultPos: React.CSSProperties = {
    position: 'fixed',
    bottom: 22,
    left: 22,
    zIndex: 90,
  };

  return (
    <button
      onClick={toggle}
      aria-label={muted ? 'Unmute' : 'Mute'}
      style={{
        ...(position ?? defaultPos),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 38,
        height: 38,
        borderRadius: 12,
        background: muted
          ? 'rgba(248,113,113,0.12)'
          : 'rgba(255,255,255,0.07)',
        border: `1.5px solid ${muted ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.12)'}`,
        color: muted ? '#fca5a5' : 'rgba(255,255,255,0.5)',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.18s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = muted
          ? 'rgba(248,113,113,0.22)'
          : 'rgba(255,255,255,0.12)';
        (e.currentTarget as HTMLElement).style.color = muted ? '#fca5a5' : '#fff';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = muted
          ? 'rgba(248,113,113,0.12)'
          : 'rgba(255,255,255,0.07)';
        (e.currentTarget as HTMLElement).style.color = muted ? '#fca5a5' : 'rgba(255,255,255,0.5)';
      }}
    >
      {muted
        ? <VolumeX size={17} strokeWidth={1.75} />
        : <Volume2 size={17} strokeWidth={1.75} />
      }
    </button>
  );
}
