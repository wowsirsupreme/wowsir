'use client';

import { cn } from '@/lib/utils';
import type { Question } from '@/types/question';

interface QuestionCardProps {
  question: Question;
  selected: number | null;
  revealed: boolean;
  onAnswer: (index: number) => void;
  disabled?: boolean;
}

export function QuestionCard({ question, selected, revealed, onAnswer, disabled }: QuestionCardProps) {
  const labels = ['A', 'B', 'C', 'D'];
  // answer may be a numeric index string ("0") or option text ("Paris") — handle both
  const parsedIdx = parseInt(question.answer, 10);
  const correctIndex = !isNaN(parsedIdx) && parsedIdx >= 0 && parsedIdx < (question.options?.length ?? 0)
    ? parsedIdx
    : (question.options ?? []).findIndex(o => o === question.answer);

  return (
    <div className="w-full">
      {/* Question text */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-10 mb-8">
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
      </div>

      {/* Options */}
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
                  'flex items-center gap-4 text-left px-6 py-5 rounded-xl border-[1.5px] transition-all duration-200',
                  'bg-white/6 border-white/10 text-paper font-body text-[18px] leading-relaxed',
                  !disabled && 'hover:bg-gold/15 hover:border-gold hover:-translate-y-0.5',
                  isSelected && !revealed && 'border-gold',
                  revealed && isCorrect && 'bg-green/30 border-green-500 animate-revealPulse',
                  revealed && isSelected && !isCorrect && 'bg-red/20 border-red-500',
                  disabled && 'cursor-default'
                )}
              >
                <span className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-[14px] font-bold font-mono flex-shrink-0">
                  {labels[i]}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      )}

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
                  'flex items-center justify-center gap-3 px-5 py-7 rounded-xl border-[1.5px] transition-all duration-200',
                  'bg-white/6 border-white/10 text-paper text-xl font-semibold',
                  !disabled && 'hover:bg-gold/15 hover:border-gold',
                  isSelected && !revealed && 'border-gold',
                  revealed && isCorrect && 'bg-green/30 border-green-500',
                  revealed && isSelected && !isCorrect && 'bg-red/20 border-red-500',
                  disabled && 'cursor-default'
                )}
              >
                {opt === 'True' ? '✓' : '✗'} {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* Explanation (shown after reveal) */}
      {revealed && question.explanation && (
        <div className="mt-6 mb-2 px-6 py-5 bg-white/5 border border-white/10 rounded-xl text-[16px] leading-relaxed text-muted animate-fadeIn">
          💡 {question.explanation}
        </div>
      )}
    </div>
  );
}
