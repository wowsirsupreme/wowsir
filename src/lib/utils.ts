export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function fmtCode(s: string): string {
  return s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6);
}

export function calcTimeBonus(timeLeft: number, totalTime: number, maxBonus = 50): number {
  return Math.round((timeLeft / totalTime) * maxBonus);
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function formatScore(n: number): string {
  return n.toLocaleString();
}

export function pct(correct: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((correct / total) * 100)}%`;
}

export function trophy(accuracy: number): string {
  if (accuracy >= 80) return '🏆';
  if (accuracy >= 60) return '🥈';
  return '🎓';
}

// Shuffle array in place (Fisher-Yates)
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
