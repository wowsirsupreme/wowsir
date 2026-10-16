'use client';

/**
 * TeacherNav — fixed bottom navigation bar for teacher-facing pages.
 *
 * Shows: Dashboard · Quizzes · Results · Library · Resources
 * Highlights the current section automatically.
 */

import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, BookCopy, BarChart2, Library, BookMarked } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/teacher',
    icon: <LayoutDashboard size={18} />,
    match: (p) => p === '/teacher',
  },
  {
    label: 'Quizzes',
    href: '/teacher/quizzes',
    icon: <BookCopy size={18} />,
    match: (p) =>
      p.startsWith('/teacher/quizzes') ||
      p.startsWith('/teacher/quiz') ||
      p.startsWith('/teacher/host') ||
      p.startsWith('/teacher/import'),
  },
  {
    label: 'Results',
    href: '/teacher/results',
    icon: <BarChart2 size={18} />,
    match: (p) => p.startsWith('/teacher/results'),
  },
  {
    label: 'Library',
    href: '/teacher/library',
    icon: <Library size={18} />,
    match: (p) => p.startsWith('/teacher/library'),
  },
  {
    label: 'Resources',
    href: '/teacher/study-resources',
    icon: <BookMarked size={18} />,
    match: (p) => p.startsWith('/teacher/study-resources'),
  },
];

export default function TeacherNav() {
  const router = useRouter();
  const pathname = usePathname();

  const active = NAV_ITEMS.find(item => item.match(pathname))?.href ?? null;

  return (
    <>
      {/* ── Nav bar ─────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 80,
          background: 'rgba(9,9,15,0.94)',
          backdropFilter: 'blur(18px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'stretch',
          height: 58,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV_ITEMS.map(item => {
          const isActive = active === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                background: 'none', border: 'none', cursor: 'pointer',
                color: isActive ? '#c9a84c' : 'rgba(255,255,255,0.32)',
                transition: 'color 0.15s',
                position: 'relative',
                padding: 0,
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.32)';
              }}
            >
              {/* Active indicator pill — gold for teacher */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 28, height: 2, borderRadius: 2,
                  background: 'linear-gradient(90deg, #c9a84c, #e8d08a)',
                }} />
              )}
              {item.icon}
              <span style={{
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                fontWeight: isActive ? 700 : 400,
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Spacer so page content doesn't hide behind nav */}
      <div style={{ height: 58 }} />
    </>
  );
}
