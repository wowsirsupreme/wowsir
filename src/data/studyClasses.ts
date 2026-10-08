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
    label: 'Grade 8',
    grade: 'Grade 8',
    subject: 'Python & Networks',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.2)',
  },
  // ── IGCSE Year 1 ──────────────────────────────────────────────────
  {
    id: 'gr9-cs',
    label: 'Grade 9 CS',
    grade: 'Grade 9',
    subject: 'IGCSE CS 0478 Year 1',
    color: '#6366f1',
    glow: 'rgba(99,102,241,0.2)',
  },
  {
    id: 'gr9-dt',
    label: 'Grade 9 DT',
    grade: 'Grade 9',
    subject: 'IGCSE D&T 0445 Common',
    color: '#ec4899',
    glow: 'rgba(236,72,153,0.2)',
  },
  // ── IGCSE Year 2 ──────────────────────────────────────────────────
  {
    id: 'gr10-cs',
    label: 'Grade 10',
    grade: 'Grade 10',
    subject: 'IGCSE CS 0478 Year 2',
    color: '#6366f1',
    glow: 'rgba(99,102,241,0.2)',
  },
  // ── A-Level ───────────────────────────────────────────────────────
  {
    id: 'gr11-cs',
    label: 'Grade 11',
    grade: 'Grade 11',
    subject: 'A-Level CS 9618',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.2)',
  },
];

export const STUDY_MODES: StudyMode[] = [
  {
    id: 'chapters',
    label: 'Chapters',
    description: 'Study by chapter with questions & flashcards',
  },
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
];
