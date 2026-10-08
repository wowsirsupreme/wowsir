'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface TimerRingProps {
  seconds: number;
  onEnd?: () => void;
  paused?: boolean;
  size?: number;
}

export function TimerRing({ seconds, onEnd, paused, size = 72 }: TimerRingProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = seconds;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = timeLeft / total;
  const urgent = timeLeft <= 5;

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          onEnd?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, seconds, onEnd]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={6}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={urgent ? '#e74c3c' : '#c9a84c'}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear' }}
        />
      </svg>
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center font-mono text-[22px] font-medium text-paper',
          urgent && 'text-red-400 animate-pulse'
        )}
      >
        {timeLeft}
      </div>
    </div>
  );
}
