'use client';

import { useState, useEffect } from 'react';
import { audioEngine, MUSIC_THEMES, MUSIC_THEME_LABELS, type MusicTheme } from '@/lib/audioEngine';

interface Props {
  /** Called when the user picks a theme. Pass to update local state if needed. */
  onChange?: (theme: MusicTheme) => void;
}

export default function MusicThemePicker({ onChange }: Props) {
  const [selected, setSelected] = useState<MusicTheme>('chill');

  useEffect(() => {
    // Sync to persisted preference on mount
    const saved = audioEngine.loadThemePref();
    setSelected(saved);
  }, []);

  function pick(theme: MusicTheme) {
    audioEngine.setMusicTheme(theme);
    setSelected(theme);
    audioEngine.click();
    onChange?.(theme);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 2 }}>
        Music
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {MUSIC_THEMES.map(theme => {
          const active = selected === theme;
          return (
            <button
              key={theme}
              onClick={() => pick(theme)}
              aria-pressed={active}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: active
                  ? 'rgba(139,92,246,0.25)'
                  : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${active ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
                color: active ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                backdropFilter: 'blur(6px)',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                }
              }}
            >
              {MUSIC_THEME_LABELS[theme]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
