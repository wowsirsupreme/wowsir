'use client';

import { useEffect, useRef, useState } from 'react';

interface ScoreBarProps {
  score: number;
  streak: number;
}

export function ScoreBar({ score, streak }: ScoreBarProps) {
  const [delta, setDelta] = useState<number | null>(null);
  const prevScore = useRef(score);

  useEffect(() => {
    const diff = score - prevScore.current;
    if (diff > 0) {
      setDelta(diff);
      setTimeout(() => setDelta(null), 800);
    }
    prevScore.current = score;
  }, [score]);

  return (
    <div className="flex gap-5 items-center">
      <div className="text-center relative">
        <div className="text-[10px] tracking-widest uppercase text-muted">Score</div>
        <div className="font-mono text-[22px] font-medium text-paper transition-all duration-300">
          {score.toLocaleString()}
        </div>
        {delta !== null && (
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-sm text-green-400 animate-scoreSlide pointer-events-none">
            +{delta}
          </div>
        )}
      </div>
      <div className="text-center">
        <div className="text-[10px] tracking-widest uppercase text-muted">Streak</div>
        <div className="font-mono text-[22px] font-medium text-paper">
          {streak > 0 ? `🔥 ${streak}` : streak}
        </div>
      </div>
    </div>
  );
}
