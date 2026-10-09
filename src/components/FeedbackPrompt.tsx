'use client';

import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { incrementVisitCount, saveFeedback } from '@/lib/firebase/auth';
import type { UserProfile, FeedbackEntry } from '@/types/user';

interface Props {
  uid: string;
  profile: UserProfile;
}

export default function FeedbackPrompt({ uid, profile }: Props) {
  const [show, setShow]     = useState(false);
  const [done, setDone]     = useState(false);
  const [visitNum, setVisitNum] = useState(0);

  useEffect(() => {
    // Only show on visit 1 or 2, and only if no feedback given yet for this visit
    const visitCount = profile.visitCount ?? 0;
    const feedbackGiven = profile.feedback ?? [];

    // Increment visit count on mount
    let cancelled = false;
    incrementVisitCount(uid).then(newCount => {
      if (cancelled) return;
      setVisitNum(newCount);
      // Show feedback prompt only on visits 1 and 2
      if (newCount <= 2) {
        const alreadyGaveForThisVisit = feedbackGiven.some(f => f.visitNumber === newCount);
        if (!alreadyGaveForThisVisit) {
          // Delay slightly so page renders first
          setTimeout(() => setShow(true), 1800);
        }
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFeedback(value: FeedbackEntry['value']) {
    const entry: FeedbackEntry = { value, visitNumber: visitNum, timestamp: Date.now() };
    await saveFeedback(uid, entry);
    setDone(true);
    setTimeout(() => setShow(false), 1000);
  }

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 100,
        borderRadius: 20,
        background: 'rgba(9,8,22,0.95)',
        backdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
        padding: '18px 20px',
        width: 260,
        animation: 'slideUp 0.3s ease',
      }}
    >
      {done ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p style={{ fontSize: 14, color: '#c4b5fd', fontWeight: 600 }}>Thanks for your feedback!</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              How's WOW Sir working for you?
            </p>
            <button
              onClick={() => setShow(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 16, lineHeight: 1.5 }}>
            Your feedback helps us improve the platform.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleFeedback('positive')}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                background: 'rgba(74,222,128,0.08)',
                border: '1.5px solid rgba(74,222,128,0.2)',
                color: '#86efac',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(74,222,128,0.16)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(74,222,128,0.45)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(74,222,128,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(74,222,128,0.2)'; }}
            >
              <ThumbsUp size={18} strokeWidth={1.75} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>Loving it</span>
            </button>
            <button
              onClick={() => handleFeedback('neutral')}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)',
                border: '1.5px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.55)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              <Minus size={18} strokeWidth={1.75} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>It's okay</span>
            </button>
            <button
              onClick={() => handleFeedback('negative')}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                background: 'rgba(248,113,113,0.08)',
                border: '1.5px solid rgba(248,113,113,0.2)',
                color: '#fca5a5',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.16)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.45)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.2)'; }}
            >
              <ThumbsDown size={18} strokeWidth={1.75} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>Needs work</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
