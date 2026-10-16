'use client';

import { useRef, useState } from 'react';

interface ImageUploaderProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export default function ImageUploader({ value, onChange, disabled }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10 MB.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
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
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={value}
            alt="Question image"
            style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 10, display: 'block', border: '1px solid rgba(255,255,255,0.15)' }}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              border: 'none', borderRadius: 6, padding: '2px 8px',
              cursor: 'pointer', fontSize: 12,
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
            <span>📷 Click or drag an image here (optional)</span>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
