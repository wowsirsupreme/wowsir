'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, BookOpen, Key, FileText, Map, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { GRADE_CHAPTERS } from '@/data/studyContent';
import { CLASSES } from '@/data/studyClasses';
import type { StudyChapter } from '@/data/studyContent';
import { getStudyOverride, toStudyNote } from '@/lib/firebase/studyOverrides';
import type { StudyKeyword, StudyNote, StudyOverride } from '@/lib/firebase/studyOverrides';

interface PageProps {
  params: Promise<{ classId: string }>;
}

type Tab = 'keywords' | 'notes' | 'mindmap';

/* ── Flip-card for keywords ── */
function FlipCard({
  kw,
  accentColor,
}: {
  kw: StudyKeyword;
  accentColor: string;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      onClick={() => setFlipped(f => !f)}
      title={flipped ? 'Click to flip back' : 'Click to reveal definition'}
      style={{
        perspective: 900,
        cursor: 'pointer',
        userSelect: 'none',
        minHeight: kw.imageUrl && flipped ? 220 : 100,
        transition: 'min-height 0.3s',
      }}
    >
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 'inherit',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>
        {/* Front — term */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          borderRadius: 12,
          background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`,
          border: `1px solid ${accentColor}30`,
          padding: '18px 20px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          minHeight: 100,
        }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.4 }}>
            {kw.term}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 10, color: `${accentColor}80`, fontWeight: 600, letterSpacing: '0.08em' }}>
            TAP TO FLIP
          </p>
        </div>

        {/* Back — definition + optional image */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${accentColor}20`,
          padding: '14px 18px',
          display: 'flex', flexDirection: 'column', gap: 10,
          minHeight: 100,
        }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: '0.07em' }}>
            {kw.term}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, flex: 1 }}>
            {kw.definition}
          </p>
          {kw.imageUrl && (
            <img
              src={kw.imageUrl}
              alt={kw.term}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              style={{
                width: '100%', maxHeight: 130, objectFit: 'cover',
                borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          )}
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'right' }}>tap to flip</p>
        </div>
      </div>
    </div>
  );
}

/* ── Per-chapter card ── */
function ChapterResourceCard({
  chapter,
  accentColor,
  index,
}: {
  chapter: StudyChapter;
  accentColor: string;
  index: number;
}) {
  const [open, setOpen]             = useState(false);
  const [tab, setTab]               = useState<Tab>('keywords');
  const [override, setOverride]     = useState<StudyOverride | null>(null);
  const [overrideLoaded, setOverrideLoaded] = useState(false);

  // Load Firestore override when the card is opened
  useEffect(() => {
    if (!open || overrideLoaded) return;
    getStudyOverride(chapter.key)
      .then(data => { setOverride(data); setOverrideLoaded(true); })
      .catch(() => { setOverrideLoaded(true); });
  }, [open, overrideLoaded, chapter.key]);

  // Use Firestore override if available, otherwise fall back to static
  const staticRes = chapter.resources;
  const keywords: StudyKeyword[] = (override?.keywords ?? staticRes?.keywords ?? []) as StudyKeyword[];
  const notes: StudyNote[] = (
    override?.notes ?? (staticRes?.notes ?? []).map(toStudyNote)
  ) as StudyNote[];

  const hasKeywords = keywords.length > 0;
  const hasNotes    = notes.length > 0;
  const hasMindmap  = !!staticRes?.mindmapUrl;
  const hasAny      = hasKeywords || hasNotes || hasMindmap;

  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${open ? accentColor + '40' : 'rgba(255,255,255,0.08)'}`,
      background: open ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
      overflow: 'hidden',
      transition: 'border-color 0.2s, background 0.2s',
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '14px 18px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: `${accentColor}20`, border: `1px solid ${accentColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: accentColor,
          }}>
            {index + 1}
          </span>
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {chapter.shortTitle}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
              {chapter.description.slice(0, 60)}{chapter.description.length > 60 ? '…' : ''}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!hasAny && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Coming soon</span>
          )}
          {open ? <ChevronUp size={15} color="rgba(255,255,255,0.4)" /> : <ChevronDown size={15} color="rgba(255,255,255,0.4)" />}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0 18px 18px' }}>
          {!hasAny ? (
            <p style={{ margin: '16px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
              Resources for this chapter will be added soon.
            </p>
          ) : !overrideLoaded ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '18px 0', color: 'rgba(255,255,255,0.3)' }}>
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13 }}>Loading…</span>
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 4, marginTop: 14, marginBottom: 16 }}>
                {([
                  { id: 'keywords' as Tab, label: 'Flashcards', icon: Key,      has: hasKeywords, count: keywords.length },
                  { id: 'notes'    as Tab, label: 'Notes',      icon: FileText,  has: hasNotes,    count: notes.length },
                  { id: 'mindmap'  as Tab, label: 'Mindmap',    icon: Map,       has: hasMindmap,  count: 0 },
                ] as const).filter(t => t.has).map(t => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 8,
                        border: `1px solid ${active ? accentColor + '60' : 'rgba(255,255,255,0.1)'}`,
                        background: active ? `${accentColor}15` : 'transparent',
                        color: active ? accentColor : 'rgba(255,255,255,0.4)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <Icon size={12} />
                      {t.label}
                      {t.count > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, marginLeft: 2,
                          background: active ? `${accentColor}30` : 'rgba(255,255,255,0.07)',
                          borderRadius: 999, padding: '1px 5px',
                        }}>
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── Flashcard / Keywords tab ── */}
              {tab === 'keywords' && hasKeywords && (
                <>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
                    Tap a card to flip it and see the definition.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {keywords.map((kw, i) => (
                      <FlipCard key={i} kw={kw} accentColor={accentColor} />
                    ))}
                  </div>
                </>
              )}

              {/* ── Notes tab ── */}
              {tab === 'notes' && hasNotes && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
                  {notes.map((note, i) => {
                    const n = toStudyNote(note as string | StudyNote);
                    return (
                      <li key={i} style={{ display: 'grid', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: accentColor, flexShrink: 0, marginTop: 7,
                          }} />
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                            {n.text}
                          </span>
                        </div>
                        {n.imageUrl && (
                          <div style={{ paddingLeft: 16 }}>
                            <img
                              src={n.imageUrl}
                              alt=""
                              onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                              style={{
                                maxWidth: '100%', maxHeight: 200, borderRadius: 10,
                                border: '1px solid rgba(255,255,255,0.1)',
                                objectFit: 'cover',
                              }}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* ── Mindmap tab ── */}
              {tab === 'mindmap' && hasMindmap && (
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <img
                    src={staticRes!.mindmapUrl}
                    alt={staticRes!.mindmapAlt ?? `${chapter.shortTitle} mindmap`}
                    style={{ width: '100%', display: 'block' }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function ResourcesPage({ params }: PageProps) {
  const { classId } = use(params);
  const router = useRouter();

  const classData = CLASSES.find(c => c.id === classId);
  const chapters  = GRADE_CHAPTERS[classId] ?? [];

  if (!classData) {
    return (
      <div style={{ minHeight: '100vh', background: '#060510', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={() => router.push('/study')} style={{ color: '#7dd3fc' }}>← Back</button>
      </div>
    );
  }

  const accent = classData.color;

  const BG = [
    `radial-gradient(ellipse 70% 50% at 20% 10%, ${accent}18 0%, transparent 50%)`,
    'radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 50%)',
    '#060510',
  ].join(',');

  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)', background: 'rgba(6,5,16,0.6)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => router.push('/study')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.color = accent)}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          <ChevronLeft size={16} /> Study Corner
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `${accent}18`, border: `1px solid ${accent}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={14} color={accent} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Resources</span>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 999,
            background: `${accent}20`, color: accent, fontWeight: 600,
          }}>
            {classData.grade}
          </span>
        </div>
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 20px 80px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#fff' }}>
            Chapter Resources
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            {classData.subject} · Flashcards, notes &amp; mindmaps
          </p>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {chapters.map((ch, i) => (
            <ChapterResourceCard
              key={ch.key}
              chapter={ch}
              accentColor={accent}
              index={i}
            />
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          Resources are added chapter by chapter — check back often.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
