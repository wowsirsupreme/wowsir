'use client';

/**
 * MusicContext — global persistent audio player.
 *
 * A single <audio> element lives here for the entire app lifetime.
 * Route changes and quiz phase transitions never stop playback.
 */

import {
  createContext,
  useContext,
  useRef,
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.5);
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS);

  const toggleTrack = useCallback((id: string, src: string) => {
    if (nowPlaying === id) {
      audioRef.current?.pause();
      setNowPlaying(null);
    } else {
      // Stop whatever was playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      const a = new Audio(src);
      a.loop = true;
      a.volume = volume;
      a.play().catch(() => {});
      audioRef.current = a;
      setNowPlaying(id);
    }
  }, [nowPlaying, volume]);

  const handleSetVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const addCustomTrack = useCallback((label: string, src: string) => {
    const id = `custom-${Date.now()}`;
    const track: Track = { id, label: label || 'Custom', artist: 'Custom', src, emoji: '🎵' };
    setTracks(prev => [...prev, track]);
    // Auto-play it
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    const a = new Audio(src);
    a.loop = true;
    a.volume = volume;
    a.play().catch(() => {});
    audioRef.current = a;
    setNowPlaying(id);
  }, [volume]);

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
