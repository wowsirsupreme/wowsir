'use client';

import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, children, className }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center p-6 animate-fadeIn"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={cn('bg-surface rounded-2xl shadow-2xl w-full max-w-md border border-border animate-slideUp', className)}>
        {children}
      </div>
    </div>
  );
}
