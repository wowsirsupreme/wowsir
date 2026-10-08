'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, BookOpen, Key, FileText, Map, ChevronDown, ChevronUp } from 'lucide-react';
import { GRADE_CHAPTERS } from '@/data/studyContent';
import { CLASSES } from '@/data/studyClasses';
import type { StudyChapter } from '@/data/studyContent';

interface PageProps {
  params: Promise<{ classId: string }>;
}

type Tab = 'keywords' | 'notes' | 'mindmap';

function ChapterResourceCard({
  chapter,
  accentColor,
  index,
}: {
  chapter: StudyChapter;
  accentColor: string;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('keywords');

  const res = chapter.resources;
  const hasKeywords = res?.keywords && res.keywords.length > 0;
  const hasNotes    = res?.notes    && res.notes.length    > 0;
  const hasMindmap  = !!res?.mindmapUrl;
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
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: `${accentColor}20`,
            border: `1px solid ${accentColor}30`,
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
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
              Coming soon
            </span>
          )}
          {open
            ? <ChevronUp size={15} color="rgba(255,255,255,0.4)" />
            : <ChevronDown size={15} color="rgba(255,255,255,0.4)" />
          }
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0 18px 18px' }}>

          {!hasAny ? (
            <p style={{ margin: '16px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
              Resources for this chapter will be added soon.
            </p>
          ) : (
            <>
              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 4, marginTop: 14, marginBottom: 16 }}>
                {([
                  { id: 'keywords' as Tab, label: 'Keywords', icon: Key,      has: hasKeywords },
                  { id: 'notes'    as Tab, label: 'Notes',    icon: FileText,  has: hasNotes    },
                  { id: 'mindmap'  as Tab, label: 'Mindmap',  icon: Map,       has: hasMindmap  },
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
                    </button>
                  );
                })}
              </div>

              {/* Keywords */}
              {tab === 'keywords' && hasKeywords && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {res!.keywords!.map((kw, i) => (
                    <div key={i} style={{
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      padding: '10px 14px',
                    }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: accentColor }}>
                        {kw.term}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                        {kw.definition}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {tab === 'notes' && hasNotes && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
                  {res!.notes!.map((note, i) => (
                    <li key={i} style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: accentColor, flexShrink: 0, marginTop: 6,
                      }} />
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                        {note}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Mindmap */}
              {tab === 'mindmap' && hasMindmap && (
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <img
                    src={res!.mindmapUrl}
                    alt={res!.mindmapAlt ?? `${chapter.shortTitle} mindmap`}
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

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#fff' }}>
            Chapter Resources
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            {classData.subject} · Keywords, notes &amp; mindmaps
          </p>
        </div>

        {/* Chapter list */}
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
    </div>
  );
}
