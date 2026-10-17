'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Gamepad2, User, Wifi, Zap, Lock, AlertTriangle, ChevronLeft } from 'lucide-react';
import { AvatarCustomizer, UnoCard, decodeAvatar, CARD_COLORS } from '@/components/ui/Avatar';
import { useFirebase } from '@/hooks/useFirebase';
import { findSessionByCode } from '@/lib/firebase/sessions';
import QuizNav from '@/components/QuizNav';

/** Standalone card preview with pulsing colour-matched glow */
function CardPreview({ avatarId, name }: { avatarId: number; name: string }) {
  const col = CARD_COLORS[decodeAvatar(avatarId).color % CARD_COLORS.length];
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* Outer bloom */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 32,
        background: `radial-gradient(ellipse at 50% 55%, ${col.bg}66, transparent 68%)`,
        animation: 'pulseDot 2.4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* Inner halo ring */}
      <div style={{
        position: 'absolute', inset: 8, borderRadius: 26,
        boxShadow: `0 0 48px 10px ${col.bg}44`,
        pointerEvents: 'none',
      }} />
      <UnoCard config={avatarId} name={name} size={160} spotlight animate />
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="join-screen flex flex-col min-h-screen items-center justify-center"><span className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full inline-block" /></div>}>
      <JoinInner />
    </Suspense>
  );
}

function JoinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { configured } = useFirebase();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState(0);
  const [step, setStep] = useState<'code' | 'name'>('code');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const autoJoined = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('playerName');
      if (saved) setName(saved);
      const savedAvatar = localStorage.getItem('playerAvatar');
      if (savedAvatar) setAvatarId(parseInt(savedAvatar, 10));
    } catch {}
  }, []);

  // Auto-fill code from URL ?code=XXXXXX and skip to name step
  useEffect(() => {
    if (autoJoined.current) return;
    const urlCode = searchParams.get('code')?.replace(/\s/g, '').toUpperCase();
    if (!urlCode || urlCode.length !== 6) return;
    autoJoined.current = true;
    setCode(urlCode);
    setLoading(true);
    findSessionByCode(urlCode)
      .then(result => {
        if (!result) {
          setError('Room not found. The session may have ended.');
        } else if (result.session.status === 'ended') {
          setError('This session has already ended.');
        } else {
          setStep('name');
        }
      })
      .catch(() => setError('Could not connect. Check your connection.'))
      .finally(() => setLoading(false));
  }, [searchParams]);

  async function handleCodeSubmit() {
    const clean = code.replace(/\s/g, '').toUpperCase();
    if (clean.length !== 6) { setError('Enter the 6-digit room code'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await findSessionByCode(clean);
      if (!result) {
        setError('Room not found. Check the code and try again.');
      } else if (result.session.status === 'ended') {
        setError('This session has ended.');
      } else {
        setCode(clean);
        setStep('name');
      }
    } catch {
      setError('Could not connect. Make sure Firebase is configured.');
    } finally {
      setLoading(false);
    }
  }

  function handleJoin() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Enter your name'); return; }
    try {
      localStorage.setItem('playerName', trimmed);
      localStorage.setItem('playerAvatar', String(avatarId));
    } catch {}
    router.push(`/play/${code}?name=${encodeURIComponent(trimmed)}&avatar=${avatarId}`);
  }

  return (
    <div className="join-screen flex flex-col min-h-screen">

      {/* Nav */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', background: 'rgba(2,12,18,0.5)' }}
      >
        <button
          onClick={() => router.push('/student')}
          className="text-sm font-medium transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', gap: 4 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(6,182,212,0.9)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          <span className="animate-tealGlow flex items-center"><Gamepad2 size={18} color="#22d3ee" strokeWidth={1.75} /></span>
          <span className="font-display text-lg" style={{ color: '#fff' }}>Join Game</span>
        </div>
        <div className="w-14" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">

        {/* Portal icon */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 animate-tealGlow"
          style={{ background: 'rgba(6,182,212,0.12)', border: '1.5px solid rgba(6,182,212,0.3)' }}
        >
          {step === 'code'
            ? <Gamepad2 size={36} color="#22d3ee" strokeWidth={1.5} />
            : <User size={36} color="#22d3ee" strokeWidth={1.5} />}
        </div>

        {step === 'code' ? (
          <div className="w-full max-w-sm animate-slideUp">
            <h1 className="text-center font-display text-[42px] leading-tight mb-2" style={{ color: '#fff', textShadow: '0 0 30px rgba(6,182,212,0.5)' }}>
              Join Game
            </h1>
            <p className="text-center text-[15px] mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Enter the room code from your teacher&apos;s screen
            </p>

            {!configured && (
              <div className="mb-5 px-4 py-3 rounded-xl text-sm text-center flex items-center justify-center gap-2"
                style={{ background: 'rgba(245,158,11,0.1)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.2)' }}>
                <AlertTriangle size={14} /> Firebase not connected. Ask your teacher to share the link.
              </div>
            )}

            <label className="section-label-light">Room Code</label>
            <input
              className="dark-input teal"
              style={{ textAlign: 'center', fontSize: 32, letterSpacing: '14px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
              placeholder="XXXXXX"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
              maxLength={7}
              autoFocus
            />

            {error && (
              <p className="text-sm text-center mb-4 animate-fadeIn" style={{ color: '#f87171' }}>
                {error}
              </p>
            )}

            <button
              className="btn-teal"
              onClick={handleCodeSubmit}
              disabled={loading || code.replace(/\s/g,'').length < 6}
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Checking…
                </span>
              ) : 'Continue →'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Info row */}
            <div className="flex justify-center gap-6">
              {[
                { Icon: Wifi, label: 'Live sync' },
                { Icon: Zap, label: 'Instant' },
                { Icon: Lock, label: 'Secure' },
              ].map(({ Icon, label }) => (
                <div key={label} className="text-center">
                  <div className="flex justify-center mb-1"><Icon size={18} color="rgba(255,255,255,0.35)" strokeWidth={1.5} /></div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full animate-slideUp" style={{ maxWidth: 720 }}>
            <h1 className="text-center font-display text-[42px] leading-tight mb-1" style={{ color: '#fff', textShadow: '0 0 30px rgba(6,182,212,0.5)' }}>
              Who are you?
            </h1>
            <p className="text-center text-[15px] mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Room code:{' '}
              <span className="font-mono font-bold" style={{ color: '#22d3ee', textShadow: '0 0 12px rgba(34,211,238,0.5)' }}>{code}</span>
            </p>

            {/* Two-column on md+, single column on mobile */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, alignItems: 'start' }}>

              {/* Left col — customiser pickers */}
              <div
                className="rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <label className="section-label-light" style={{ marginBottom: 10, display: 'block' }}>Your Name</label>
                <input
                  className="dark-input teal"
                  style={{ textAlign: 'center', fontSize: 18, marginBottom: 18 }}
                  placeholder="Enter your name"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  maxLength={30}
                  autoFocus
                />
                <AvatarCustomizer
                  value={avatarId}
                  onChange={setAvatarId}
                  previewName={name.trim() || 'You'}
                  hidePreviw
                />
              </div>

              {/* Right col — live card preview + join button */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                {/* Card preview with strong glow */}
                <CardPreview avatarId={avatarId} name={name.trim() || 'You'} />

                {error && (
                  <p className="text-sm text-center animate-fadeIn" style={{ color: '#f87171', margin: 0 }}>
                    {error}
                  </p>
                )}

                <button className="btn-teal" style={{ width: '100%' }} onClick={handleJoin} disabled={!name.trim()}>
                  <Gamepad2 size={16} className="inline mr-1.5" /> Join the Game
                </button>

                <button
                  onClick={() => { setStep('code'); setError(''); }}
                  className="w-full text-sm py-3 text-center"
                  style={{ color: 'rgba(255,255,255,0.35)', minHeight: 44 }}
                >
                  ← Change code
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <QuizNav />
    </div>
  );
}
