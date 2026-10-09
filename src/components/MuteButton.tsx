'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';

export default function AudioControls() {
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const m = audioEngine.loadMutePref();
    setMuted(m);
  }, []);

  function toggleMute() {
    const next = !muted;
    audioEngine.setMuted(next);
    setMuted(next);
  }

  function togglePlay() {
    const nowPaused = audioEngine.togglePause();
    setPaused(nowPaused);
  }

  const btnBase: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '1.5px solid rgba(255,255,255,0.12)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.15s',
    flexShrink: 0,
  };

  return (
    <div
      className="audio-controls-bar"
      style={{
        position: 'fixed',
        bottom: 18,
        left: 18,
        zIndex: 90,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {/* Play / Pause */}
      <button
        onClick={togglePlay}
        aria-label={paused ? 'Resume music' : 'Pause music'}
        style={{
          ...btnBase,
          background: paused
            ? 'rgba(139,92,246,0.25)'
            : 'rgba(30,20,50,0.7)',
          borderColor: paused ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.12)',
          color: paused ? '#c4b5fd' : 'rgba(255,255,255,0.7)',
        }}
      >
        {paused ? <Play size={16} /> : <Pause size={16} />}
      </button>

      {/* Mute / Unmute */}
      <button
        onClick={toggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
        style={{
          ...btnBase,
          background: muted
            ? 'rgba(239,68,68,0.2)'
            : 'rgba(30,20,50,0.7)',
          borderColor: muted ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)',
          color: muted ? '#fca5a5' : 'rgba(255,255,255,0.7)',
        }}
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </div>
  );
}
