/**
 * WOW Sir — Study Corner class & mode definitions
 * Shared between /study/page.tsx and /study/[classId]/[mode]/page.tsx
 */

export interface StudyClass {
  id: string;
  label: string;
  grade: string;
  subject: string;
  color: string;
  glow: string;
}

export interface StudyMode {
  id: string;
  label: string;
  description: string;
}

export const CLASSES: StudyClass[] = [
  // ── Lower school ──────────────────────────────────────────────────
  {
    id: 'gr4-cs',
    label: 'Grade 4',
    grade: 'Grade 4',
    subject: 'ICT Foundations',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.2)',
  },
  {
    id: 'gr5-cs',
    label: 'Grade 5',
    grade: 'Grade 5',
    subject: 'Digital Skills',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.2)',
  },
  {
    id: 'gr6-cs',
    label: 'Grade 6',
    grade: 'Grade 6',
    subject: 'Spreadsheets & Coding',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.2)',
  },
  // ── Middle school ─────────────────────────────────────────────────
  {
    id: 'gr7-cs',
    label: 'Grade 7',
    grade: 'Grade 7',
    subject: 'Computing & Web',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.2)',
  },
  {
    id: 'gr8-cs',
    label: 'ICT',
    grade: 'Grade 8',
    subject: 'IGCSE ICT 0417',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.2)',
  },
  // ── IGCSE ─────────────────────────────────────────────────────────
  {
    id: 'gr9-cs',
    label: 'CS',
    grade: 'IGCSE',
    subject: 'IGCSE CS 0478',
    color: '#6366f1',
    glow: 'rgba(99,102,241,0.2)',
  },
  {
    id: 'gr9-dt',
    label: 'DT',
    grade: 'IGCSE',
    subject: 'D&T 0445 / 9705',
    color: '#ec4899',
    glow: 'rgba(236,72,153,0.2)',
  },
  // ── A Level ───────────────────────────────────────────────────────
  {
    id: 'gr11-cs',
    label: 'A Level CS',
    grade: 'A Level',
    subject: 'A Level CS 9618',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.2)',
  },
];

export const STUDY_MODES: StudyMode[] = [
  {
    id: 'practice',
    label: 'Practice Tests',
    description: 'Timed practice tests across multiple chapters',
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    description: 'Review key terms and definitions',
  },
  {
    id: 'resources',
    label: 'Resources',
    description: 'Keywords, notes & mindmaps by chapter',
  },
];
