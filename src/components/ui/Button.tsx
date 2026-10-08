'use client';

import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'outline' | 'ghost' | 'danger'
          | 'glass' | 'glass-gold' | 'glass-teal' | 'glass-green' | 'glass-electric' | 'glass-ember';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  full?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  full,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  // Glass variants — delegate to CSS classes defined in globals.css
  if (variant.startsWith('glass')) {
    const modMap: Record<string, string> = {
      'glass':          'btn-glass',
      'glass-gold':     'btn-glass btn-glass-gold',
      'glass-teal':     'btn-glass btn-glass-teal',
      'glass-green':    'btn-glass btn-glass-green',
      'glass-electric': 'btn-glass btn-glass-electric',
      'glass-ember':    'btn-glass btn-glass-ember',
    };
    const glassSizes: Record<string, string> = {
      sm: 'text-[14px] px-5 py-2.5',
      md: '',  // defaults in .btn-glass
      lg: 'text-[18px] px-9 py-4',
    };
    return (
      <button
        className={cn(modMap[variant] || 'btn-glass', glassSizes[size], full && 'w-full', className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }

  // Light-screen variants
  const base = [
    'inline-flex items-center justify-center gap-2',
    'font-semibold rounded-xl transition-all duration-150',
    'cursor-pointer border-0 outline-none',
    'disabled:opacity-45 disabled:cursor-not-allowed select-none',
  ].join(' ');

  const variants: Record<string, string> = {
    primary: 'btn-light-primary',
    gold:    'btn-light-gold',
    outline: 'btn-light-outline',
    ghost:   'bg-transparent text-muted hover:text-ink hover:bg-black/5 border border-transparent',
    danger:  'bg-red-600 text-white hover:bg-red-700 active:scale-[.98] shadow-sm',
  };

  const sizes: Record<string, string> = {
    sm: 'px-4 py-2.5 text-[14px] min-h-[44px]',
    md: 'px-7 py-3.5 text-[15px] min-h-[52px]',
    lg: 'px-9 py-4 text-[17px] min-h-[56px]',
  };

  return (
    <button
      className={cn(base, variants[variant] || variants.primary, sizes[size], full && 'w-full', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
}
