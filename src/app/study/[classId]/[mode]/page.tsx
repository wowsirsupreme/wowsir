'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, FileText, BookOpen, Layers, ChevronRight,
  Clock, HelpCircle, CheckCircle, XCircle, RotateCcw, ChevronDown,
} from 'lucide-react';
import {
  GRADE_CHAPTERS,
  GRADE_PRACTICE_TESTS,
  buildPracticeTest,
} from '@/data/studyContent';
import { CLASSES, STUDY_MODES } from '@/data/studyClasses';
import type { Question } from '@/types/question';
import type { Flashcard } from '@/data/studyContent';

/* ═══════════════════════════════════════ */

interface PageProps {
  params: Promise<{ classId: string; mode: string }>;
}

export default function StudyPage({ params }: PageProps) {
  const { classId, mode } = use(params);
  const router = useRouter();

  const classData  = CLASSES.find(c => c.id === classId);
  const modeData   = STUDY_MODES.find(m => m.id === mode);

  if (!classData || !modeData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060510', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 16, color: 'rgba(255,255,255,0.4)' }}>Page not found</p>
          <button onClick={() => router.push('/')} style={{ color: classData?.color ?? '#7dd3fc' }}>← Back home</button>
        </div>
      </div>
    );
  }

  const accentColor = classData.color;

  /* ── bg ── */
  const BG = [
    `radial-gradient(ellipse 70% 50% at 20% 10%, ${accentColor}18 0%, transparent 50%)`,
    'radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 50%)',
    '#060510',
  ].join(',');

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#f5f3ee' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)', background: 'rgba(6,5,16,0.6)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => router.push('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: 14, transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = accentColor)}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          <ChevronLeft size={16} /> Home
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `${accentColor}18`, border: `1px solid ${accentColor}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={14} color={accentColor} strokeWidth={1.75} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{modeData.label}</span>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 999,
            background: `${accentColor}18`, border: `1px solid ${accentColor}30`,
            color: accentColor, fontFamily: 'var(--font-mono)',
          }}>
            {classData.label}
          </span>
        </div>

        <div style={{ width: 60 }} />
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>
        {mode === 'practice'   && <PracticeMode   accentColor={accentColor} classId={classId} />}
        {mode === 'chapters'   && <ChaptersMode   accentColor={accentColor} classId={classId} />}
        {mode === 'flashcards' && <FlashcardsMode accentColor={accentColor} classId={classId} />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   PRACTICE TEST MODE
   ══════════════════════════════════════════════════════ */

function PracticeMode({ accentColor, classId }: { accentColor: string; classId: string }) {
  const chapters     = GRADE_CHAPTERS[classId] ?? [];
  const practiceTests = GRADE_PRACTICE_TESTS[classId] ?? [];

  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [questions, setQuestions]       = useState<Question[]>([]);
  const [current, setCurrent]           = useState(0);
  const [answers, setAnswers]           = useState<Record<string, string>>({});
  const [submitted, setSubmitted]       = useState(false);
  const [started, setStarted]           = useState(false);

  function start(testId: string) {
    const qs = buildPracticeTest(testId, classId);
    setSelectedTest(testId);
    setQuestions(qs);
    setCurrent(0);
    setAnswers({});
    setSubmitted(false);
    setStarted(true);
  }

  function reset() {
    setStarted(false);
    setSelectedTest(null);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setCurrent(0);
  }

  /* Empty state — no questions loaded yet */
  if (!started || questions.length === 0) {
    const totalLoaded = chapters.reduce((s, c) => s + c.questions.length, 0);

    return (
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 8 }}>Practice Tests</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 28, fontSize: 14 }}>
          Timed tests drawn from all chapter question banks.
        </p>

        {totalLoaded === 0 && (
          <div style={{
            padding: '16px 20px', borderRadius: 14, marginBottom: 24,
            background: 'rgba(250,204,21,0.08)', border: '1.5px dashed rgba(250,204,21,0.25)',
            fontSize: 13, color: 'rgba(250,204,21,0.7)',
          }}>
            <strong>Questions coming soon.</strong> Your teacher will add the chapter notes and questions will appear here automatically.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {practiceTests.map(test => {
            const available = test.chapterKeys.flatMap(k =>
              chapters.find(c => c.key === k)?.questions ?? []
            ).length;
            return (
              <button
                key={test.id}
                onClick={() => available > 0 && start(test.id)}
                style={{
                  padding: '18px 20px', borderRadius: 16, textAlign: 'left',
                  background: available > 0 ? `${accentColor}0d` : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${available > 0 ? `${accentColor}30` : 'rgba(255,255,255,0.07)'}`,
                  opacity: available > 0 ? 1 : 0.5,
                  cursor: available > 0 ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
                onMouseEnter={e => available > 0 && ((e.currentTarget as HTMLElement).style.borderColor = `${accentColor}55`)}
                onMouseLeave={e => available > 0 && ((e.currentTarget as HTMLElement).style.borderColor = `${accentColor}30`)}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{test.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{test.description}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {test.timeLimitMinutes} min</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><HelpCircle size={12} /> {available} question{available !== 1 ? 's' : ''} available</span>
                  </div>
                </div>
                {available > 0 && <ChevronRight size={18} color={accentColor} />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Quiz running ── */
  const q  = questions[current];
  const total = questions.length;
  const progress = ((current + 1) / total) * 100;

  if (submitted) {
    const correct = questions.filter(q => answers[q.id] === q.answer).length;
    const pct     = Math.round((correct / total) * 100);
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>{pct >= 70 ? '🎉' : '📚'}</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, marginBottom: 4 }}>
          {correct} / {total}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>{pct}% correct</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, background: `${accentColor}18`, border: `1.5px solid ${accentColor}35`, color: accentColor, fontWeight: 600, cursor: 'pointer' }}
          >
            <RotateCcw size={15} /> Try again
          </button>
        </div>
        {/* Review answers */}
        <div style={{ marginTop: 32, textAlign: 'left' }}>
          {questions.map((q, i) => {
            const userAns   = answers[q.id];
            const isCorrect = userAns === q.answer;
            return (
              <div key={q.id} style={{ padding: '14px 16px', borderRadius: 12, marginBottom: 10, background: isCorrect ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {isCorrect ? <CheckCircle size={16} color="#4ade80" style={{ flexShrink: 0, marginTop: 2 }} /> : <XCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />}
                  <div>
                    <p style={{ fontSize: 14, marginBottom: 4 }}><strong>Q{i+1}:</strong> {q.text}</p>
                    {q.type === 'mcq' && (
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                        Your answer: <span style={{ color: isCorrect ? '#4ade80' : '#f87171' }}>{q.options[parseInt(userAns ?? '-1')] ?? '(not answered)'}</span>
                        {!isCorrect && <> · Correct: <span style={{ color: '#4ade80' }}>{q.options[parseInt(q.answer)]}</span></>}
                      </p>
                    )}
                    {q.explanation && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{q.explanation}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Question {current + 1} of {total}</span>
        <button onClick={reset} style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }}>Exit</button>
      </div>
      <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)', marginBottom: 28 }}>
        <div style={{ height: '100%', borderRadius: 999, background: accentColor, width: `${progress}%`, transition: 'width 0.3s' }} />
      </div>

      {/* Question */}
      <QuestionCard question={q} selected={answers[q.id]} accentColor={accentColor}
        onSelect={ans => setAnswers(prev => ({ ...prev, [q.id]: ans }))} />

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', opacity: current === 0 ? 0.35 : 1, cursor: current === 0 ? 'default' : 'pointer' }}
        >
          <ChevronLeft size={16} /> Back
        </button>
        {current < total - 1 ? (
          <button
            onClick={() => setCurrent(c => c + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, background: `${accentColor}20`, border: `1px solid ${accentColor}40`, color: accentColor, fontWeight: 600, cursor: 'pointer' }}
          >
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={() => setSubmitted(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 10, background: accentColor, color: '#000', fontWeight: 700, cursor: 'pointer' }}
          >
            Submit <CheckCircle size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CHAPTER QUESTIONS MODE
   ══════════════════════════════════════════════════════ */

function ChaptersMode({ accentColor, classId }: { accentColor: string; classId: string }) {
  const chapters = GRADE_CHAPTERS[classId] ?? [];

  const [expanded, setExpanded] = useState<string | null>(null);
  const [answers, setAnswers]   = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  function reveal(id: string) {
    setRevealed(prev => new Set([...prev, id]));
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 8 }}>Chapter Questions</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 28, fontSize: 14 }}>
        Work through questions chapter by chapter at your own pace.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {chapters.map(ch => {
          const isOpen = expanded === ch.key;
          const count  = ch.questions.length;
          return (
            <div key={ch.key} style={{
              borderRadius: 16,
              background: isOpen ? `${accentColor}0a` : 'rgba(255,255,255,0.03)',
              border: `1.5px solid ${isOpen ? `${accentColor}30` : 'rgba(255,255,255,0.07)'}`,
              overflow: 'hidden', transition: 'border-color 0.2s, background 0.2s',
            }}>
              <button
                onClick={() => setExpanded(isOpen ? null : ch.key)}
                style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{ch.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{ch.description}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 12 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: count > 0 ? `${accentColor}18` : 'rgba(255,255,255,0.06)', color: count > 0 ? accentColor : 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>
                    {count} Q
                  </span>
                  <ChevronDown size={16} color="rgba(255,255,255,0.3)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
              </button>

              {isOpen && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px' }}>
                  {count === 0 ? (
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '16px 0' }}>
                      Questions for this chapter coming soon.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {ch.questions.map((q, i) => (
                        <div key={q.id}>
                          <QuestionCard
                            question={q}
                            selected={answers[q.id]}
                            accentColor={accentColor}
                            onSelect={ans => {
                              setAnswers(prev => ({ ...prev, [q.id]: ans }));
                              // Auto-reveal after answering
                              setTimeout(() => reveal(q.id), 400);
                            }}
                            label={`Q${i + 1}`}
                          />
                          {revealed.has(q.id) && (
                            <div style={{
                              marginTop: 8, padding: '10px 14px', borderRadius: 10,
                              background: answers[q.id] === q.answer ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                              border: `1px solid ${answers[q.id] === q.answer ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                              fontSize: 13,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: q.explanation ? 4 : 0 }}>
                                {answers[q.id] === q.answer
                                  ? <><CheckCircle size={14} color="#4ade80" /> <span style={{ color: '#4ade80', fontWeight: 600 }}>Correct!</span></>
                                  : <><XCircle size={14} color="#f87171" /> <span style={{ color: '#f87171', fontWeight: 600 }}>
                                      Correct answer: {q.type === 'mcq' ? q.options[parseInt(q.answer)] : q.answer}
                                    </span></>}
                              </div>
                              {q.explanation && <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{q.explanation}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   FLASHCARDS MODE
   ══════════════════════════════════════════════════════ */

function FlashcardsMode({ accentColor, classId }: { accentColor: string; classId: string }) {
  const chapters = GRADE_CHAPTERS[classId] ?? [];
  const allFlashcards = chapters.flatMap(ch => ch.flashcards);
  const [index, setIndex]   = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [chapter, setChapter] = useState<string | null>(null);

  const filtered = chapter ? allFlashcards.filter(f => f.chapterKey === chapter) : allFlashcards;
  const card     = filtered[index];

  function next() { setFlipped(false); setTimeout(() => setIndex(i => (i + 1) % filtered.length), 150); }
  function prev() { setFlipped(false); setTimeout(() => setIndex(i => (i - 1 + filtered.length) % filtered.length), 150); }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 8 }}>Study Flashcards</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 20, fontSize: 14 }}>
        Tap a card to reveal the definition. Use arrows to move between cards.
      </p>

      {/* Chapter filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <button
          onClick={() => { setChapter(null); setIndex(0); setFlipped(false); }}
          style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer', fontWeight: chapter === null ? 700 : 400, background: chapter === null ? `${accentColor}20` : 'rgba(255,255,255,0.05)', border: `1.5px solid ${chapter === null ? `${accentColor}45` : 'rgba(255,255,255,0.1)'}`, color: chapter === null ? accentColor : 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}
        >
          All chapters
        </button>
        {chapters.map(ch => (
          <button
            key={ch.key}
            onClick={() => { setChapter(ch.key); setIndex(0); setFlipped(false); }}
            style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer', fontWeight: chapter === ch.key ? 700 : 400, background: chapter === ch.key ? `${accentColor}20` : 'rgba(255,255,255,0.05)', border: `1.5px solid ${chapter === ch.key ? `${accentColor}45` : 'rgba(255,255,255,0.1)'}`, color: chapter === ch.key ? accentColor : 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}
          >
            {ch.shortTitle}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Layers size={40} color="rgba(255,255,255,0.15)" style={{ marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Flashcards coming soon for this chapter.</p>
        </div>
      ) : (
        <>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
            {index + 1} / {filtered.length}
          </p>

          {/* Card — 3-D flip */}
          <div
            onClick={() => setFlipped(f => !f)}
            style={{ perspective: '1200px', cursor: 'pointer', userSelect: 'none' }}
          >
            <div
              style={{
                position: 'relative',
                minHeight: 220,
                transformStyle: 'preserve-3d',
                transition: 'transform 0.55s cubic-bezier(0.45, 0.05, 0.55, 0.95)',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front — Term */}
              <div
                style={{
                  borderRadius: 20, padding: '28px 32px', textAlign: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  border: '2px solid rgba(255,255,255,0.1)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  minHeight: 220,
                }}
              >
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 16 }}>TERM</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#fff', lineHeight: 1.3 }}>{card.term}</p>
                <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Tap to reveal</p>
              </div>

              {/* Back — Definition */}
              <div
                style={{
                  position: 'absolute', inset: 0,
                  borderRadius: 20, padding: '28px 32px', textAlign: 'center',
                  background: `${accentColor}14`,
                  border: `2px solid ${accentColor}45`,
                  boxShadow: `0 0 32px ${accentColor}20`,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  minHeight: 220,
                }}
              >
                <p style={{ fontSize: 10, color: accentColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 16, opacity: 0.7 }}>DEFINITION</p>
                <p style={{ fontSize: 16, color: '#fff', lineHeight: 1.6 }}>{card.definition}</p>
                {card.example && (
                  <p style={{ marginTop: 14, fontSize: 13, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                    e.g. {card.example}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Arrows */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 20 }}>
            <button
              onClick={prev}
              style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
            >
              <ChevronLeft size={20} color="rgba(255,255,255,0.5)" />
            </button>
            <button
              onClick={() => setFlipped(false)}
              style={{ padding: '0 20px', height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.3)', gap: 6 }}
            >
              <RotateCcw size={12} /> Flip back
            </button>
            <button
              onClick={next}
              style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
            >
              <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SHARED QUESTION CARD
   ══════════════════════════════════════════════════════ */

function QuestionCard({
  question, selected, accentColor, onSelect, label,
}: {
  question: Question;
  selected?: string;
  accentColor: string;
  onSelect: (answer: string) => void;
  label?: string;
}) {
  return (
    <div style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, marginBottom: 16 }}>
        {label && <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 8 }}>{label}</span>}
        {question.text}
      </p>

      {question.type === 'mcq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {question.options.map((opt, i) => {
            const isSelected = selected === String(i);
            return (
              <button
                key={i}
                onClick={() => onSelect(String(i))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12, textAlign: 'left',
                  background: isSelected ? `${accentColor}18` : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${isSelected ? `${accentColor}45` : 'rgba(255,255,255,0.07)'}`,
                  transition: 'all 0.15s', cursor: 'pointer',
                }}
              >
                <span style={{
                  width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700,
                  background: isSelected ? accentColor : 'rgba(255,255,255,0.07)',
                  color: isSelected ? '#000' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.15s',
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span style={{ fontSize: 14, color: isSelected ? '#fff' : 'rgba(255,255,255,0.65)' }}>{opt}</span>
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'truefalse' && (
        <div style={{ display: 'flex', gap: 10 }}>
          {['true', 'false'].map(val => {
            const isSelected = selected === val;
            return (
              <button
                key={val}
                onClick={() => onSelect(val)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  background: isSelected ? `${accentColor}18` : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${isSelected ? `${accentColor}45` : 'rgba(255,255,255,0.07)'}`,
                  fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  color: isSelected ? accentColor : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.15s',
                }}
              >
                {val === 'true' ? 'True' : 'False'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
