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
  const correctIndex = parseInt(question.answer, 10);

  return (
    <div className="w-full">
      {/* Question text */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-9 mb-6">
        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt="Question"
            className="w-full max-h-48 object-contain rounded-xl mb-4"
          />
        )}
        <p className="font-display text-[clamp(20px,3.5vw,30px)] leading-snug text-paper">
          {question.text}
        </p>
        {question.type === 'truefalse' && (
          <span className="inline-block mt-3 text-xs font-mono tracking-widest text-muted uppercase">True / False</span>
        )}
      </div>

      {/* Options */}
      {question.type === 'mcq' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.options.map((opt, i) => {
            const isCorrect = i === correctIndex;
            const isSelected = selected === i;
            return (
              <button
                key={i}
                onClick={() => !disabled && onAnswer(i)}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-3 text-left px-5 py-4 rounded-xl border-[1.5px] transition-all duration-200',
                  'bg-white/6 border-white/10 text-paper font-body text-[15px]',
                  !disabled && 'hover:bg-gold/15 hover:border-gold hover:-translate-y-0.5',
                  isSelected && !revealed && 'border-gold',
                  revealed && isCorrect && 'bg-green/30 border-green-500 animate-revealPulse',
                  revealed && isSelected && !isCorrect && 'bg-red/20 border-red-500',
                  disabled && 'cursor-default'
                )}
              >
                <span className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-[12px] font-bold font-mono flex-shrink-0">
                  {labels[i]}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'truefalse' && (
        <div className="grid grid-cols-2 gap-3">
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
                  'flex items-center justify-center gap-3 px-5 py-6 rounded-xl border-[1.5px] transition-all duration-200',
                  'bg-white/6 border-white/10 text-paper text-lg font-semibold',
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
        <div className="mt-4 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-muted animate-fadeIn">
          💡 {question.explanation}
        </div>
      )}
    </div>
  );
}
