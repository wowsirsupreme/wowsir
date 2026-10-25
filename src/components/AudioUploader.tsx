'use client';

import { useRef, useState } from 'react';

interface AudioUploaderProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export default function AudioUploader({ value, onChange, disabled }: AudioUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('audio/')) {
      setError('Please select an audio file (MP3, WAV, OGG, AAC, M4A).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Audio file must be under 20 MB.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload-audio', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Upload failed');
      onChange(data.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div style={{ marginTop: 6 }}>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(196,181,253,0.2)', borderRadius: 10, padding: '10px 14px' }}>
          <span style={{ fontSize: 20 }}>🎵</span>
          <audio
            controls
            src={value}
            style={{ flex: 1, height: 32, minWidth: 0 }}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            style={{
              background: 'rgba(248,113,113,0.15)',
              color: '#f87171',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 6,
              padding: '3px 10px',
              cursor: 'pointer',
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            ✕ Remove
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !uploading && !disabled && inputRef.current?.click()}
          style={{
            border: '2px dashed rgba(255,255,255,0.2)',
            borderRadius: 10,
            padding: '18px 16px',
            textAlign: 'center',
            cursor: uploading || disabled ? 'default' : 'pointer',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 13,
            background: 'rgba(255,255,255,0.03)',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => { if (!uploading && !disabled) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.4)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
        >
          {uploading ? (
            <span>Uploading…</span>
          ) : (
            <span>🎵 Click or drag an audio file here (MP3 / WAV / AAC / OGG)</span>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        disabled={disabled || uploading}
      />

      {error && (
        <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{error}</p>
      )}
    </div>
  );
}
