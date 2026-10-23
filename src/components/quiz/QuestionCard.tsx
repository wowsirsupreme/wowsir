'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { cn, resolveAnswerIndex } from '@/lib/utils';
import type { Question } from '@/types/question';

interface QuestionCardProps {
  question: Question;
  selected: number | null;
  revealed: boolean;
  onAnswer: (index: number) => void;
  onAnswerText?: (value: string) => void; // for shortanswer, fillinblank, ordering, matching
  disabled?: boolean;
}

export function QuestionCard({ question, selected, revealed, onAnswer, onAnswerText, disabled }: QuestionCardProps) {
  const labels = ['A', 'B', 'C', 'D'];
  const parsedIdx = resolveAnswerIndex(question.answer);
  const correctIndex = !isNaN(parsedIdx) && parsedIdx >= 0 && parsedIdx < (question.options?.length ?? 0)
    ? parsedIdx
    : (question.options ?? []).findIndex(o => o === question.answer);

  // ── Short answer / fill-in-blank state ───────────────────────────
  const [textInput, setTextInput] = useState('');
  const [textSubmitted, setTextSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Ordering state ────────────────────────────────────────────────
  // shuffledOrder: indices of `question.options` in the display order
  const [shuffledOrder, setShuffledOrder] = useState<number[]>([]);
  // userSequence: indices of `question.options` chosen so far (click-to-build)
  const [userSequence, setUserSequence] = useState<number[]>([]);

  // ── Matching state ────────────────────────────────────────────────
  // Each option is "Left|Right" — we show left col in order, shuffle right col
  const [shuffledRight, setShuffledRight] = useState<number[]>([]);   // indices of options, shuffled
  const [selectedLeft, setSelectedLeft]   = useState<number | null>(null);
  const [matchedPairs, setMatchedPairs]   = useState<Record<number, number>>({}); // leftIdx → rightIdx

  // Reset per-question state when question changes
  useEffect(() => {
    setTextInput('');
    setTextSubmitted(false);
    setUserSequence([]);
    setSelectedLeft(null);
    setMatchedPairs({});

    if (question.type === 'ordering') {
      const n = question.options?.length ?? 0;
      const arr = Array.from({ length: n }, (_, i) => i);
      // Fisher-Yates shuffle
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setShuffledOrder(arr);
    }

    if (question.type === 'matching') {
      const n = question.options?.length ?? 0;
      const arr = Array.from({ length: n }, (_, i) => i);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setShuffledRight(arr);
    }
  }, [question.id, question.type]);

  // ── Short answer helpers ──────────────────────────────────────────
  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim() || textSubmitted) return;
    setTextSubmitted(true);
    const val = textInput.trim();
    if (onAnswerText) onAnswerText(val);
    else onAnswer(-1);
  }, [textInput, textSubmitted, onAnswerText, onAnswer]);

  // ── Ordering helpers ──────────────────────────────────────────────
  // correctSequence: answer field like "2,0,3,1" or "0,1,2,3"
  const correctOrderIndices: number[] = (question.answer ?? '').split(',').map(Number).filter(n => !isNaN(n));

  const handleOrderTap = useCallback((optIdx: number) => {
    if (disabled || userSequence.includes(optIdx)) return;
    const next = [...userSequence, optIdx];
    setUserSequence(next);
    if (next.length === (question.options?.length ?? 0)) {
      const val = next.join(',');
      if (onAnswerText) onAnswerText(val);
      else onAnswer(-1);
    }
  }, [disabled, userSequence, question.options, onAnswerText, onAnswer]);

  const handleOrderReset = useCallback(() => {
    if (disabled) return;
    setUserSequence([]);
  }, [disabled]);

  const isOrderingCorrect = userSequence.length > 0
    && userSequence.every((v, i) => v === correctOrderIndices[i]);

  // ── Matching helpers ──────────────────────────────────────────────
  // Each option is "LeftTerm|RightDefinition"
  const leftItems  = (question.options ?? []).map(o => o.split('|')[0] ?? o);
  const rightItems = (question.options ?? []).map(o => o.split('|')[1] ?? '');

  const handleLeftClick = useCallback((leftIdx: number) => {
    if (disabled || matchedPairs[leftIdx] !== undefined) return;
    setSelectedLeft(prev => prev === leftIdx ? null : leftIdx);
  }, [disabled, matchedPairs]);

  const handleRightClick = useCallback((rightIdx: number) => {
    if (disabled || selectedLeft === null) return;
    // rightIdx is already an index into question.options (via shuffledRight display)
    const alreadyUsed = Object.values(matchedPairs).includes(rightIdx);
    if (alreadyUsed) return;
    const next = { ...matchedPairs, [selectedLeft]: rightIdx };
    setMatchedPairs(next);
    setSelectedLeft(null);
    if (Object.keys(next).length === (question.options?.length ?? 0)) {
      // encode as "leftIdx:rightIdx,..." sorted by leftIdx
      const encoded = Object.entries(next).sort((a,b) => +a[0] - +b[0]).map(([l,r]) => `${l}:${r}`).join(',');
      if (onAnswerText) onAnswerText(encoded);
      else onAnswer(-1);
    }
  }, [disabled, selectedLeft, matchedPairs, question.options, onAnswerText, onAnswer]);

  const handleMatchReset = useCallback(() => {
    if (disabled) return;
    setMatchedPairs({});
    setSelectedLeft(null);
  }, [disabled]);

  const isMatchingCorrect = Object.keys(matchedPairs).length > 0
    && Object.entries(matchedPairs).every(([l, r]) => +l === r); // correct when leftIdx === rightIdx (pairs defined by same index)

  return (
    <div className="w-full">
      {/* Question text */}
      <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(196,181,253,0.3)', borderRadius: 18, padding: '40px 40px', marginBottom: 32 }}>
        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt="Question"
            className="w-full max-h-48 object-contain rounded-xl mb-6"
          />
        )}
        <p className="font-display text-[clamp(26px,4vw,38px)] leading-[1.5] text-paper">
          {question.text}
        </p>
        {question.type === 'truefalse' && (
          <span className="inline-block mt-4 text-sm font-mono tracking-widest text-muted uppercase">True / False</span>
        )}
        {question.type === 'ordering' && (
          <span className="inline-block mt-4 text-sm font-mono tracking-widest text-muted uppercase">Tap items in the correct order</span>
        )}
        {question.type === 'matching' && (
          <span className="inline-block mt-4 text-sm font-mono tracking-widest text-muted uppercase">Match each item on the left to the right</span>
        )}
      </div>

      {/* ── MCQ ── */}
      {question.type === 'mcq' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {question.options.map((opt, i) => {
            const isCorrect = i === correctIndex;
            const isSelected = selected === i;
            return (
              <button
                key={i}
                onClick={() => !disabled && onAnswer(i)}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-4 text-left px-6 py-5 rounded-xl transition-all duration-200',
                  'text-paper font-body text-[18px] leading-relaxed',
                  !disabled && !revealed && 'hover:-translate-y-0.5',
                  disabled && 'cursor-default'
                )}
                style={{
                  border: revealed
                    ? isCorrect
                      ? '2px solid rgba(74,222,128,0.7)'
                      : isSelected
                        ? '2px solid rgba(248,113,113,0.7)'
                        : '1.5px solid rgba(196,181,253,0.15)'
                    : isSelected
                      ? '2px solid rgba(196,181,253,0.75)'
                      : '1.5px solid rgba(196,181,253,0.2)',
                  background: revealed
                    ? isCorrect
                      ? 'rgba(74,222,128,0.12)'
                      : isSelected
                        ? 'rgba(248,113,113,0.1)'
                        : 'rgba(255,255,255,0.04)'
                    : isSelected
                      ? 'rgba(196,181,253,0.1)'
                      : 'rgba(255,255,255,0.04)',
                }}
              >
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold font-mono flex-shrink-0"
                  style={{ background: isSelected ? 'rgba(196,181,253,0.2)' : 'rgba(255,255,255,0.07)', color: isSelected ? 'rgba(196,181,253,0.9)' : 'rgba(255,255,255,0.5)' }}>
                  {labels[i]}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* ── True / False ── */}
      {question.type === 'truefalse' && (
        <div className="grid grid-cols-2 gap-4">
          {['True', 'False'].map((opt, i) => {
            const val = opt.toLowerCase();
            const isCorrect = question.answer === val;
            const isSelected = selected === i;
            return (
              <button
                key={opt}
                onClick={() => !disabled && onAnswer(i)}
                disabled={disabled}
                className={cn(
                  'flex items-center justify-center gap-3 px-5 py-7 rounded-xl transition-all duration-200',
                  'text-paper text-xl font-semibold',
                  disabled && 'cursor-default'
                )}
                style={{
                  border: revealed
                    ? isCorrect
                      ? '2px solid rgba(74,222,128,0.7)'
                      : isSelected
                        ? '2px solid rgba(248,113,113,0.7)'
                        : '1.5px solid rgba(196,181,253,0.15)'
                    : isSelected
                      ? '2px solid rgba(196,181,253,0.75)'
                      : '1.5px solid rgba(196,181,253,0.2)',
                  background: revealed
                    ? isCorrect
                      ? 'rgba(74,222,128,0.12)'
                      : isSelected
                        ? 'rgba(248,113,113,0.1)'
                        : 'rgba(255,255,255,0.04)'
                    : isSelected
                      ? 'rgba(196,181,253,0.1)'
                      : 'rgba(255,255,255,0.04)',
                }}
              >
                {opt === 'True' ? '✓' : '✗'} {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Short Answer ── */}
      {question.type === 'shortanswer' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
              disabled={disabled || textSubmitted}
              placeholder="Type your answer…"
              className={cn(
                'flex-1 px-5 py-4 rounded-xl border-[1.5px] bg-white/6 border-white/10 text-paper text-[18px]',
                'placeholder:text-muted focus:outline-none focus:border-gold transition-colors',
                (disabled || textSubmitted) && 'opacity-60 cursor-default'
              )}
            />
            {!textSubmitted && !disabled && (
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className={cn(
                  'px-6 py-4 rounded-xl font-semibold text-[16px] transition-all duration-200',
                  'bg-gold text-ink border-[1.5px] border-gold',
                  textInput.trim() ? 'hover:opacity-80 hover:-translate-y-0.5' : 'opacity-40 cursor-default'
                )}
              >
                Submit
              </button>
            )}
          </div>

          {/* Reveal correct answer */}
          {revealed && (
            <div className={cn(
              'px-5 py-4 rounded-xl border-[1.5px] text-[16px]',
              textSubmitted && textInput.trim().toLowerCase() === question.answer.toLowerCase()
                ? 'bg-green/20 border-green-500 text-paper'
                : 'bg-white/6 border-white/15 text-paper'
            )}>
              <span className="text-muted text-sm block mb-1 font-mono uppercase tracking-wider">Correct answer</span>
              <span className="font-semibold">{question.answer}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Fill in the Blank ── */}
      {question.type === 'fillinblank' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
              disabled={disabled || textSubmitted}
              placeholder="Fill in the blank…"
              className={cn(
                'flex-1 px-5 py-4 rounded-xl border-[1.5px] bg-white/6 border-white/10 text-paper text-[18px]',
                'placeholder:text-muted focus:outline-none focus:border-gold transition-colors',
                (disabled || textSubmitted) && 'opacity-60 cursor-default'
              )}
            />
            {!textSubmitted && !disabled && (
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className={cn(
                  'px-6 py-4 rounded-xl font-semibold text-[16px] transition-all duration-200',
                  'bg-gold text-ink border-[1.5px] border-gold',
                  textInput.trim() ? 'hover:opacity-80 hover:-translate-y-0.5' : 'opacity-40 cursor-default'
                )}
              >
                Submit
              </button>
            )}
          </div>
          {revealed && (
            <div className={cn(
              'px-5 py-4 rounded-xl border-[1.5px] text-[16px]',
              textSubmitted && textInput.trim().toLowerCase() === question.answer.toLowerCase()
                ? 'bg-green/20 border-green-500 text-paper'
                : 'bg-white/6 border-white/15 text-paper'
            )}>
              <span className="text-muted text-sm block mb-1 font-mono uppercase tracking-wider">Correct answer</span>
              <span className="font-semibold">{question.answer}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Ordering ── */}
      {question.type === 'ordering' && (
        <div className="space-y-4">
          {/* Items to tap */}
          <div className="grid grid-cols-1 gap-3">
            {shuffledOrder.map((optIdx) => {
              const posInSeq = userSequence.indexOf(optIdx);
              const chosen = posInSeq !== -1;
              // On reveal, check if this item is in the right position
              const correctPos = correctOrderIndices.indexOf(optIdx);
              const userPos = userSequence.indexOf(optIdx);
              const isCorrectPos = revealed && chosen && userPos === correctPos;
              const isWrongPos   = revealed && chosen && userPos !== correctPos;
              return (
                <button
                  key={optIdx}
                  onClick={() => !disabled && handleOrderTap(optIdx)}
                  disabled={disabled || chosen}
                  className={cn(
                    'flex items-center gap-4 px-5 py-4 rounded-xl border-[1.5px] transition-all duration-200 text-left',
                    'bg-white/6 border-white/10 text-paper text-[17px]',
                    !chosen && !disabled && 'hover:bg-gold/15 hover:border-gold hover:-translate-y-0.5',
                    chosen && !revealed && 'opacity-40 cursor-default border-gold/30',
                    isCorrectPos && 'bg-green/20 border-green-500',
                    isWrongPos   && 'bg-red/20 border-red-500',
                    disabled && !chosen && 'cursor-default',
                  )}
                >
                  {/* Position badge */}
                  <span className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold font-mono flex-shrink-0',
                    chosen ? 'bg-gold/20 text-gold' : 'bg-white/8 text-muted'
                  )}>
                    {chosen ? posInSeq + 1 : '?'}
                  </span>
                  {question.options[optIdx]}
                </button>
              );
            })}
          </div>

          {/* Sequence so far */}
          {userSequence.length > 0 && !revealed && (
            <div className="flex items-center gap-3 flex-wrap pt-2">
              <span className="text-sm text-muted font-mono">Your order:</span>
              {userSequence.map((optIdx, pos) => (
                <span key={pos} className="px-3 py-1 rounded-lg bg-gold/10 border border-gold/20 text-gold text-[13px] font-mono">
                  {pos + 1}. {question.options[optIdx]}
                </span>
              ))}
              {userSequence.length < (question.options?.length ?? 0) && (
                <button onClick={handleOrderReset} className="text-xs text-muted hover:text-paper underline ml-auto">
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Reveal: show correct order */}
          {revealed && (
            <div className={cn(
              'px-5 py-4 rounded-xl border-[1.5px]',
              isOrderingCorrect ? 'bg-green/20 border-green-500' : 'bg-white/6 border-white/15'
            )}>
              <span className="text-muted text-sm block mb-2 font-mono uppercase tracking-wider">Correct order</span>
              <ol className="space-y-1">
                {correctOrderIndices.map((optIdx, pos) => (
                  <li key={pos} className="text-[15px] text-paper flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-green/20 text-green-400 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                      {pos + 1}
                    </span>
                    {question.options[optIdx]}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* ── Matching ── */}
      {question.type === 'matching' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Left column */}
            <div className="space-y-2">
              <p className="text-xs text-muted font-mono uppercase tracking-wider mb-2">Terms</p>
              {leftItems.map((left, leftIdx) => {
                const isMatched = matchedPairs[leftIdx] !== undefined;
                const isActive = selectedLeft === leftIdx;
                const isCorrectMatch = revealed && matchedPairs[leftIdx] === leftIdx;
                const isWrongMatch   = revealed && isMatched && matchedPairs[leftIdx] !== leftIdx;
                return (
                  <button
                    key={leftIdx}
                    onClick={() => !disabled && handleLeftClick(leftIdx)}
                    disabled={disabled || isMatched}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border-[1.5px] text-left text-[15px] transition-all duration-200',
                      'bg-white/6 border-white/10 text-paper',
                      !isMatched && !disabled && 'hover:border-gold/50',
                      isActive && 'border-gold bg-gold/10',
                      isMatched && !revealed && 'opacity-60 cursor-default border-gold/20',
                      isCorrectMatch && 'bg-green/20 border-green-500',
                      isWrongMatch   && 'bg-red/20 border-red-500',
                    )}
                  >
                    {left}
                  </button>
                );
              })}
            </div>

            {/* Right column (shuffled) */}
            <div className="space-y-2">
              <p className="text-xs text-muted font-mono uppercase tracking-wider mb-2">Definitions</p>
              {shuffledRight.map((rightIdx) => {
                const isMatchedByLeft = Object.entries(matchedPairs).find(([, r]) => r === rightIdx);
                const isUsed = isMatchedByLeft !== undefined;
                const leftPartner = isMatchedByLeft ? parseInt(isMatchedByLeft[0]) : undefined;
                const isCorrectPair = revealed && leftPartner === rightIdx; // leftPartner index === rightIdx
                const isWrongPair   = revealed && isUsed && leftPartner !== rightIdx;
                return (
                  <button
                    key={rightIdx}
                    onClick={() => !disabled && !isUsed && handleRightClick(rightIdx)}
                    disabled={disabled || isUsed}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border-[1.5px] text-left text-[15px] transition-all duration-200',
                      'bg-white/6 border-white/10 text-paper',
                      !isUsed && selectedLeft !== null && !disabled && 'hover:border-gold/50 hover:bg-gold/8',
                      isUsed && !revealed && 'opacity-60 cursor-default border-white/6',
                      isCorrectPair && 'bg-green/20 border-green-500',
                      isWrongPair   && 'bg-red/20 border-red-500',
                    )}
                  >
                    {rightItems[rightIdx]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset + progress */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">
              {Object.keys(matchedPairs).length}/{question.options?.length ?? 0} matched
            </span>
            {Object.keys(matchedPairs).length > 0 && !disabled && !revealed && (
              <button onClick={handleMatchReset} className="text-xs text-muted hover:text-paper underline">
                Reset
              </button>
            )}
          </div>

          {/* Reveal: correct pairs */}
          {revealed && (
            <div className="px-5 py-4 rounded-xl border-[1.5px] bg-white/6 border-white/15">
              <span className="text-muted text-sm block mb-2 font-mono uppercase tracking-wider">Correct pairs</span>
              <div className="space-y-1">
                {leftItems.map((left, i) => (
                  <div key={i} className="flex items-center gap-2 text-[14px]">
                    <span className="text-gold">{left}</span>
                    <span className="text-muted">→</span>
                    <span className="text-paper">{rightItems[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Explanation (shown after reveal) */}
      {revealed && question.explanation && (
        <div
          className="px-6 py-6 bg-white/5 border border-white/10 rounded-xl text-[16px] leading-relaxed text-muted animate-fadeIn"
          style={{ marginTop: '2.5rem', marginBottom: '2.5rem' }}
        >
          💡 {question.explanation}
        </div>
      )}
    </div>
  );
}
