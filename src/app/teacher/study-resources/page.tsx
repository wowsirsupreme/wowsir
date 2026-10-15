'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronLeft, BookOpen, Plus, Trash2, Save, Check,
  Key, FileText, ChevronDown, ChevronUp, RefreshCw, Image, X,
} from 'lucide-react';
import { CLASSES } from '@/data/studyClasses';
import { GRADE_CHAPTERS } from '@/data/studyContent';
import { getStudyOverride, saveStudyOverride, toStudyNote } from '@/lib/firebase/studyOverrides';
import type { StudyKeyword, StudyNote, StudyOverride } from '@/lib/firebase/studyOverrides';

const BG = '#060510';
const ACCENT = '#8b5cf6';

type EditTab = 'keywords' | 'notes';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/* ── Tiny image-URL input row ── */
function ImageInput({
  value,
  onChange,
  accentColor,
}: {
  value: string;
  onChange: (v: string) => void;
  accentColor: string;
}) {
  const [open, setOpen] = useState(!!value);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'none', border: 'none', cursor: 'pointer',
          color: value ? accentColor : 'rgba(255,255,255,0.3)',
          fontSize: 11, fontWeight: 600, padding: '2px 0',
        }}
      >
        <Image size={11} />
        {value ? 'Image attached' : 'Add image URL'}
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      {open && (
        <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
            style={{
              flex: 1, padding: '7px 10px', borderRadius: 7,
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${value ? accentColor + '50' : 'rgba(255,255,255,0.12)'}`,
              color: '#fff', fontSize: 12, outline: 'none',
            }}
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              title="Remove image"
              style={{
                width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'rgba(248,113,113,0.1)', color: '#f87171',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <X size={11} />
            </button>
          )}
        </div>
      )}

      {open && value && (
        <img
          src={value}
          alt="preview"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          style={{
            marginTop: 6, maxHeight: 100, maxWidth: '100%',
            borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            objectFit: 'cover',
          }}
        />
      )}
    </div>
  );
}

/* ── Per-chapter edit panel ── */
function ChapterEditor({
  chapterKey,
  chapterTitle,
  staticKeywords,
  staticNotes,
  teacherUid,
  accentColor,
}: {
  chapterKey: string;
  chapterTitle: string;
  staticKeywords: StudyKeyword[];
  staticNotes: StudyNote[];
  teacherUid: string;
  accentColor: string;
}) {
  const [open, setOpen]           = useState(false);
  const [tab, setTab]             = useState<EditTab>('keywords');
  const [keywords, setKeywords]   = useState<StudyKeyword[]>([]);
  const [notes, setNotes]         = useState<StudyNote[]>([]);
  const [loaded, setLoaded]       = useState(false);
  const [loadErr, setLoadErr]     = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMsg, setSaveMsg]     = useState('');

  const load = useCallback(async () => {
    setLoadErr('');
    try {
      const override = await getStudyOverride(chapterKey);
      if (override) {
        setKeywords(override.keywords ?? [...staticKeywords]);
        setNotes(override.notes ?? [...staticNotes]);
      } else {
        setKeywords([...staticKeywords]);
        setNotes([...staticNotes]);
      }
      setLoaded(true);
    } catch (e: unknown) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [chapterKey, staticKeywords, staticNotes]);

  useEffect(() => { if (open && !loaded) load(); }, [open, loaded, load]);

  async function handleSave() {
    setSaveState('saving');
    try {
      const data: StudyOverride = { keywords, notes };
      await saveStudyOverride(chapterKey, data, teacherUid);
      setSaveState('saved'); setSaveMsg('Saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (e: unknown) {
      setSaveState('error');
      setSaveMsg(e instanceof Error ? e.message : 'Save failed');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  }

  /* ── Keyword helpers ── */
  function addKeyword() { setKeywords(p => [...p, { term: '', definition: '', imageUrl: '' }]); }
  function updateKw(i: number, patch: Partial<StudyKeyword>) {
    setKeywords(p => p.map((k, idx) => idx === i ? { ...k, ...patch } : k));
  }
  function removeKw(i: number) { setKeywords(p => p.filter((_, idx) => idx !== i)); }

  /* ── Note helpers ── */
  function addNote()  { setNotes(p => [...p, { text: '', imageUrl: '' }]); }
  function updateNote(i: number, patch: Partial<StudyNote>) {
    setNotes(p => p.map((n, idx) => idx === i ? { ...n, ...patch } : n));
  }
  function removeNote(i: number) { setNotes(p => p.filter((_, idx) => idx !== i)); }

  function resetToStatic() { setKeywords([...staticKeywords]); setNotes([...staticNotes]); }

  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${open ? accentColor + '40' : 'rgba(255,255,255,0.08)'}`,
      background: open ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
      overflow: 'hidden', transition: 'border-color 0.2s, background 0.2s',
      marginBottom: 10,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
            background: `${accentColor}20`, color: accentColor, fontFamily: 'monospace', flexShrink: 0,
          }}>
            {chapterKey}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {chapterTitle}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
            {staticKeywords.length}kw · {staticNotes.length}notes
          </span>
          {open ? <ChevronUp size={14} color="rgba(255,255,255,0.4)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.4)" />}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 18px' }}>
          {loadErr && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>⚠ {loadErr}</p>}

          {!loaded ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.3)' }}>
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13 }}>Loading…</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {([
                  { id: 'keywords' as EditTab, label: 'Keywords / Flashcards', icon: Key },
                  { id: 'notes'    as EditTab, label: 'Notes',                 icon: FileText },
                ] as const).map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setTab(id)} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 8,
                    border: `1px solid ${tab === id ? accentColor + '60' : 'rgba(255,255,255,0.1)'}`,
                    background: tab === id ? `${accentColor}15` : 'transparent',
                    color: tab === id ? accentColor : 'rgba(255,255,255,0.4)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>
                    <Icon size={12} />
                    {label} ({id === 'keywords' ? keywords.length : notes.length})
                  </button>
                ))}
              </div>

              {/* ── Keywords / Flashcards editor ── */}
              {tab === 'keywords' && (
                <div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
                    Each card is a flashcard — term on the front, definition on the back. Image is optional.
                  </p>
                  <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
                    {keywords.map((kw, i) => (
                      <div key={i} style={{
                        borderRadius: 10, padding: '12px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        display: 'grid', gap: 8,
                      }}>
                        {/* Term row */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            value={kw.term}
                            onChange={e => updateKw(i, { term: e.target.value })}
                            placeholder="Term (front of card)"
                            style={{
                              flex: 1, padding: '8px 12px', borderRadius: 8,
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              color: '#fff', fontSize: 13, fontWeight: 700, outline: 'none',
                            }}
                          />
                          <button onClick={() => removeKw(i)} title="Remove" style={{
                            width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'rgba(248,113,113,0.1)', color: '#f87171',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Definition */}
                        <textarea
                          value={kw.definition}
                          onChange={e => updateKw(i, { definition: e.target.value })}
                          placeholder="Definition (back of card)"
                          rows={2}
                          style={{
                            width: '100%', padding: '8px 12px', borderRadius: 8,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.8)', fontSize: 12,
                            resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                          }}
                        />

                        {/* Image URL */}
                        <ImageInput
                          value={kw.imageUrl ?? ''}
                          onChange={v => updateKw(i, { imageUrl: v || undefined })}
                          accentColor={accentColor}
                        />
                      </div>
                    ))}
                  </div>
                  <button onClick={addKeyword} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8,
                    border: `1px dashed ${accentColor}50`,
                    background: 'transparent', color: accentColor, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>
                    <Plus size={12} /> Add flashcard
                  </button>
                </div>
              )}

              {/* ── Notes editor ── */}
              {tab === 'notes' && (
                <div>
                  <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
                    {notes.map((note, i) => (
                      <div key={i} style={{
                        borderRadius: 10, padding: '12px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        display: 'grid', gap: 8,
                      }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{
                            width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 4,
                            background: `${accentColor}20`, border: `1px solid ${accentColor}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, color: accentColor,
                          }}>
                            {i + 1}
                          </span>
                          <textarea
                            value={note.text}
                            onChange={e => updateNote(i, { text: e.target.value })}
                            placeholder="Note…"
                            rows={2}
                            style={{
                              flex: 1, padding: '8px 12px', borderRadius: 8,
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'rgba(255,255,255,0.8)', fontSize: 13,
                              resize: 'vertical', outline: 'none',
                            }}
                          />
                          <button onClick={() => removeNote(i)} title="Remove" style={{
                            width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'rgba(248,113,113,0.1)', color: '#f87171',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                          }}>
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Image URL for note */}
                        <div style={{ paddingLeft: 30 }}>
                          <ImageInput
                            value={note.imageUrl ?? ''}
                            onChange={v => updateNote(i, { imageUrl: v || undefined })}
                            accentColor={accentColor}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={addNote} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8,
                    border: `1px dashed ${accentColor}50`,
                    background: 'transparent', color: accentColor, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>
                    <Plus size={12} /> Add note
                  </button>
                </div>
              )}

              {/* Action bar */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={handleSave}
                  disabled={saveState === 'saving'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '9px 18px', borderRadius: 10,
                    background: saveState === 'saved' ? 'rgba(74,222,128,0.15)' : saveState === 'error' ? 'rgba(248,113,113,0.15)' : `${accentColor}25`,
                    border: `1px solid ${saveState === 'saved' ? '#4ade8060' : saveState === 'error' ? '#f8717160' : accentColor + '50'}`,
                    color: saveState === 'saved' ? '#4ade80' : saveState === 'error' ? '#f87171' : accentColor,
                    fontSize: 13, fontWeight: 700, cursor: saveState === 'saving' ? 'not-allowed' : 'pointer',
                    opacity: saveState === 'saving' ? 0.6 : 1,
                  }}
                >
                  {saveState === 'saving'
                    ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    : saveState === 'saved' ? <Check size={13} /> : <Save size={13} />}
                  {saveState === 'idle' ? 'Save changes' : saveState === 'saving' ? 'Saving…' : saveMsg}
                </button>

                <button onClick={resetToStatic} style={{
                  padding: '9px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer',
                }}>
                  Reset to defaults
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function StudyResourcesEditorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState<string>('');

  const classData = CLASSES.find(c => c.id === selectedClass);
  const chapters  = selectedClass ? (GRADE_CHAPTERS[selectedClass] ?? []) : [];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={24} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f87171', marginBottom: 12 }}>You must be signed in.</p>
          <button onClick={() => router.push('/teacher')} style={{ color: '#7dd3fc', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Teacher login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#f5f3ee' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(6,5,16,0.85)', backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => router.push('/teacher')} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
        }}>
          <ChevronLeft size={14} /> Dashboard
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `${ACCENT}20`, border: `1px solid ${ACCENT}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={14} color={ACCENT} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Study Resources Editor</span>
        </div>
        <div style={{ width: 80 }} />
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 80px' }}>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 24 }}>
          Edit keywords, flashcards and notes per chapter. Each keyword card becomes a flip-card for students.
          Images are optional — paste any public image URL to attach one.
        </p>

        {/* Class selector */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>
            SELECT CLASS
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CLASSES.map(cls => (
              <button key={cls.id} onClick={() => setSelectedClass(cls.id)} style={{
                padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: selectedClass === cls.id ? `${cls.color}20` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${selectedClass === cls.id ? cls.color + '60' : 'rgba(255,255,255,0.1)'}`,
                color: selectedClass === cls.id ? cls.color : 'rgba(255,255,255,0.5)',
                transition: 'all 0.15s',
              }}>
                {cls.grade} — {cls.subject}
              </button>
            ))}
          </div>
        </div>

        {/* Chapter list */}
        {selectedClass && classData && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>
                {classData.grade} — {classData.subject}
                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.35)', marginLeft: 8 }}>
                  {chapters.length} chapters
                </span>
              </h2>
            </div>

            {chapters.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No chapters found for this class.</p>
            ) : (
              chapters.map(ch => (
                <ChapterEditor
                  key={ch.key}
                  chapterKey={ch.key}
                  chapterTitle={ch.shortTitle}
                  staticKeywords={(ch.resources?.keywords ?? []) as StudyKeyword[]}
                  staticNotes={(ch.resources?.notes ?? []).map(toStudyNote)}
                  teacherUid={user.uid}
                  accentColor={classData.color}
                />
              ))
            )}
          </>
        )}

        {!selectedClass && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)' }}>
            <BookOpen size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: 14 }}>Select a class above to start editing its chapter resources.</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
