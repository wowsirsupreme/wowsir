import { cn } from '@/lib/utils';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border p-6',
        className
      )}
      style={{
        borderColor: 'rgba(0,0,0,0.07)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        ...(props.style || {}),
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('font-display text-3xl mb-1', className)} {...props}>
      {children}
    </h2>
  );
}

export function CardSub({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-muted text-[15px] mb-6', className)} {...props}>
      {children}
    </p>
  );
}

/** Glass card for use on dark screens */
export function GlassCard({ className, color = 'white', children, ...props }: React.HTMLAttributes<HTMLDivElement> & { color?: 'white' | 'gold' | 'teal' | 'green' | 'electric' | 'ember' }) {
  const palette: Record<string, { bg: string; border: string }> = {
    white:    { bg: 'rgba(255,255,255,0.06)',    border: 'rgba(255,255,255,0.12)' },
    gold:     { bg: 'rgba(201,168,76,0.08)',     border: 'rgba(201,168,76,0.2)' },
    teal:     { bg: 'rgba(6,182,212,0.08)',      border: 'rgba(6,182,212,0.2)' },
    green:    { bg: 'rgba(16,185,129,0.08)',     border: 'rgba(16,185,129,0.2)' },
    electric: { bg: 'rgba(139,92,246,0.08)',     border: 'rgba(139,92,246,0.2)' },
    ember:    { bg: 'rgba(249,115,22,0.08)',     border: 'rgba(249,115,22,0.2)' },
  };
  const { bg, border } = palette[color] || palette.white;

  return (
    <div
      className={cn('rounded-2xl p-6', className)}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        ...(props.style || {}),
      }}
      {...props}
    >
      {children}
    </div>
  );
}
