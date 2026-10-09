'use client';

import { useState, useEffect, useRef } from 'react';
import { audioEngine, MUSIC_THEMES, MUSIC_THEME_LABELS, type MusicTheme } from '@/lib/audioEngine';

interface Props {
  onChange?: (theme: MusicTheme) => void;
}

export default function MusicThemePicker({ onChange }: Props) {
  const [selected, setSelected] = useState<MusicTheme>('chill');
  const [customLabel, setCustomLabel] = useState('🎵 Custom');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = audioEngine.loadThemePref();
    setSelected(saved);
    if (saved === 'custom') setCustomLabel(audioEngine.customLabel);
  }, []);

  function pick(theme: MusicTheme) {
    if (theme === 'custom') {
      // If we have a track loaded already, just switch to it
      if (audioEngine.hasCustomTrack) {
        audioEngine.setMusicTheme('custom');
        setSelected('custom');
        audioEngine.click();
        onChange?.(theme);
      } else {
        // Trigger file picker
        fileRef.current?.click();
      }
      return;
    }
    audioEngine.setMusicTheme(theme);
    setSelected(theme);
    audioEngine.click();
    onChange?.(theme);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    audioEngine.loadCustomTrack(url, file.name);
    const label = audioEngine.customLabel;
    setCustomLabel(label);
    setSelected('custom');
    audioEngine.click();
    onChange?.('custom');
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  // Build pill list: standard themes + custom pill at the end
  const allThemes: MusicTheme[] = [...MUSIC_THEMES, 'custom'];
  // Remove 'off' from MUSIC_THEMES position and put at very end
  // MUSIC_THEMES is ['battle','chill','retro','lofi','off'] — keep that order, add custom before off
  const orderedThemes: MusicTheme[] = ['battle', 'chill', 'retro', 'lofi', 'custom', 'off'];
  void allThemes; // silence unused warning

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      <span style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 2,
      }}>
        Music
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {orderedThemes.map(theme => {
          const active = selected === theme;
          const label = theme === 'custom' ? customLabel : MUSIC_THEME_LABELS[theme];
          return (
            <button
              key={theme}
              onClick={() => pick(theme)}
              aria-pressed={active}
              title={theme === 'custom' && !audioEngine.hasCustomTrack ? 'Upload a music file' : undefined}
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
                display: 'flex',
                alignItems: 'center',
                gap: 4,
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
              {label}
              {theme === 'custom' && (
                <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>↑</span>
              )}
            </button>
          );
        })}

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
