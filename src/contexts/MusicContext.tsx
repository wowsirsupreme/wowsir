'use client';

/**
 * MusicContext — global persistent audio player.
 *
 * The Audio element lives at MODULE scope (outside React) so it is truly
 * immortal — no React lifecycle, no cleanup, no navigation can kill it.
 * Route changes, quiz phase transitions, and re-renders never stop playback.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

export interface Track {
  id: string;
  label: string;
  artist: string;
  src: string;
  emoji: string;
}

const DEFAULT_TRACKS: Track[] = [
  { id: 'big-guy',   label: 'Big Guy',   artist: 'Ice Spice',    src: '/music/big-guy.mp3',   emoji: '🎤' },
  { id: 'lush-life', label: 'Lush Life', artist: 'Zara Larsson', src: '/music/lush-life.mp3', emoji: '🌸' },
];

// ─── Module-level singletons — survive every React render/remount ──────────
let _audio: HTMLAudioElement | null = null;
let _nowPlaying: string | null = null;
let _volume = 0.5;
// ──────────────────────────────────────────────────────────────────────────

interface MusicContextValue {
  tracks: Track[];
  nowPlaying: string | null;
  volume: number;
  toggleTrack: (id: string, src: string) => void;
  setVolume: (v: number) => void;
  addCustomTrack: (label: string, src: string) => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  // React state is just for triggering UI re-renders — real state lives above
  const [nowPlaying, setNowPlaying] = useState<string | null>(_nowPlaying);
  const [volume, setVolumeState] = useState(_volume);
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS);

  const toggleTrack = useCallback((id: string, src: string) => {
    if (_nowPlaying === id) {
      _audio?.pause();
      _nowPlaying = null;
      setNowPlaying(null);
    } else {
      // Stop whatever was playing
      if (_audio) { _audio.pause(); _audio.src = ''; }
      const a = new Audio(src);
      a.loop = true;
      a.volume = _volume;
      a.play().catch(() => {});
      _audio = a;
      _nowPlaying = id;
      setNowPlaying(id);
    }
  }, []);

  const handleSetVolume = useCallback((v: number) => {
    _volume = v;
    setVolumeState(v);
    if (_audio) _audio.volume = v;
  }, []);

  const addCustomTrack = useCallback((label: string, src: string) => {
    const id = `custom-${Date.now()}`;
    const track: Track = { id, label: label || 'Custom', artist: 'Custom', src, emoji: '🎵' };
    setTracks(prev => [...prev, track]);
    // Auto-play it
    if (_audio) { _audio.pause(); _audio.src = ''; }
    const a = new Audio(src);
    a.loop = true;
    a.volume = _volume;
    a.play().catch(() => {});
    _audio = a;
    _nowPlaying = id;
    setNowPlaying(id);
  }, []);

  return (
    <MusicContext.Provider value={{
      tracks,
      nowPlaying,
      volume,
      toggleTrack,
      setVolume: handleSetVolume,
      addCustomTrack,
    }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusicContext(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusicContext must be used within MusicProvider');
  return ctx;
}
