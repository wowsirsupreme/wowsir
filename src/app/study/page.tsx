'use client';

import { useRouter } from 'next/navigation';
import { BookOpen, ChevronRight, ArrowLeft } from 'lucide-react';
import { CLASSES, STUDY_MODES } from '@/data/studyClasses';

export default function StudyIndexPage() {
  const router = useRouter();

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.15) 0%, transparent 60%), #09090f',
        fontFamily: 'var(--font-body)',
        color: '#f5f3ee',
      }}
    >
      {/* Star field */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          opacity: 0.04,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Back */}
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginBottom: 36, background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.45)', fontSize: 14,
          }}
        >
          <ArrowLeft size={15} /> Back
        </button>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BookOpen size={20} color="#6ee7b7" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#fff' }}>Study Corner</h1>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                Choose your class to start studying
              </p>
            </div>
          </div>
        </div>

        {/* Class cards */}
        <div style={{ display: 'grid', gap: 12 }}>
          {CLASSES.map(cls => (
            <div
              key={cls.id}
              style={{
                borderRadius: 16,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid rgba(255,255,255,0.09)`,
                overflow: 'hidden',
              }}
            >
              {/* Class header */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: cls.color }}>{cls.grade}</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{cls.subject}</p>
                </div>
              </div>

              {/* Mode buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.05)' }}>
                {STUDY_MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => router.push(`/study/${cls.id}/${mode.id}`)}
                    style={{
                      padding: '14px 12px',
                      background: 'rgba(6,5,16,0.9)',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${cls.glow}`)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(6,5,16,0.9)')}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: cls.color }}>{mode.label}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.3 }}>{mode.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          More grades and chapters coming soon
        </p>
      </div>
    </main>
  );
}
