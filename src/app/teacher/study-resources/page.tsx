'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronLeft, BookOpen, Plus, Trash2, Save, Check,
  Key, FileText, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { CLASSES } from '@/data/studyClasses';
import { GRADE_CHAPTERS } from '@/data/studyContent';
import { getStudyOverride, saveStudyOverride } from '@/lib/firebase/studyOverrides';
import type { StudyKeyword, StudyOverride } from '@/lib/firebase/studyOverrides';

const BG = '#060510';
const ACCENT = '#8b5cf6';

type EditTab = 'keywords' | 'notes';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

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
  staticNotes: string[];
  teacherUid: string;
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<EditTab>('keywords');
  const [keywords, setKeywords] = useState<StudyKeyword[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMsg, setSaveMsg] = useState('');

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

  useEffect(() => {
    if (open && !loaded) load();
  }, [open, loaded, load]);

  async function handleSave() {
    setSaveState('saving');
    try {
      const data: StudyOverride = { keywords, notes };
      await saveStudyOverride(chapterKey, data, teacherUid);
      setSaveState('saved');
      setSaveMsg('Saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (e: unknown) {
      setSaveState('error');
      setSaveMsg(e instanceof Error ? e.message : 'Save failed');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  }

  function addKeyword() {
    setKeywords(prev => [...prev, { term: '', definition: '' }]);
  }

  function updateKeyword(i: number, field: keyof StudyKeyword, val: string) {
    setKeywords(prev => prev.map((k, idx) => idx === i ? { ...k, [field]: val } : k));
  }

  function removeKeyword(i: number) {
    setKeywords(prev => prev.filter((_, idx) => idx !== i));
  }

  function addNote() {
    setNotes(prev => [...prev, '']);
  }

  function updateNote(i: number, val: string) {
    setNotes(prev => prev.map((n, idx) => idx === i ? val : n));
  }

  function removeNote(i: number) {
    setNotes(prev => prev.filter((_, idx) => idx !== i));
  }

  function resetToStatic() {
    setKeywords([...staticKeywords]);
    setNotes([...staticNotes]);
  }

  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${open ? accentColor + '40' : 'rgba(255,255,255,0.08)'}`,
      background: open ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
      overflow: 'hidden',
      transition: 'border-color 0.2s, background 0.2s',
      marginBottom: 10,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
            background: `${accentColor}20`, color: accentColor, fontFamily: 'monospace',
            flexShrink: 0,
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
          {loadErr && (
            <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>⚠ {loadErr}</p>
          )}
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
                  { id: 'keywords' as EditTab, label: 'Keywords', icon: Key },
                  { id: 'notes' as EditTab, label: 'Notes', icon: FileText },
                ] as const).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 12px', borderRadius: 8,
                      border: `1px solid ${tab === id ? accentColor + '60' : 'rgba(255,255,255,0.1)'}`,
                      background: tab === id ? `${accentColor}15` : 'transparent',
                      color: tab === id ? accentColor : 'rgba(255,255,255,0.4)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <Icon size={12} />
                    {label} ({id === 'keywords' ? keywords.length : notes.length})
                  </button>
                ))}
              </div>

              {/* Keywords editor */}
              {tab === 'keywords' && (
                <div>
                  <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
                    {keywords.map((kw, i) => (
                      <div key={i} style={{
                        borderRadius: 10, padding: '12px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        display: 'grid', gap: 8,
                      }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            value={kw.term}
                            onChange={e => updateKeyword(i, 'term', e.target.value)}
                            placeholder="Term"
                            style={{
                              flex: 1, padding: '8px 12px', borderRadius: 8,
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              color: '#fff', fontSize: 13, fontWeight: 700,
                              outline: 'none',
                            }}
                          />
                          <button
                            onClick={() => removeKeyword(i)}
                            title="Remove"
                            style={{
                              width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                              background: 'rgba(248,113,113,0.1)', color: '#f87171',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <textarea
                          value={kw.definition}
                          onChange={e => updateKeyword(i, 'definition', e.target.value)}
                          placeholder="Definition"
                          rows={2}
                          style={{
                            width: '100%', padding: '8px 12px', borderRadius: 8,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.8)', fontSize: 12,
                            resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addKeyword}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 8,
                      border: `1px dashed ${accentColor}50`,
                      background: 'transparent', color: accentColor, fontSize: 12,
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <Plus size={12} /> Add keyword
                  </button>
                </div>
              )}

              {/* Notes editor */}
              {tab === 'notes' && (
                <div>
                  <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                    {notes.map((note, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 8,
                          background: `${accentColor}20`, border: `1px solid ${accentColor}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, color: accentColor,
                        }}>
                          {i + 1}
                        </span>
                        <textarea
                          value={note}
                          onChange={e => updateNote(i, e.target.value)}
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
                        <button
                          onClick={() => removeNote(i)}
                          title="Remove"
                          style={{
                            width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'rgba(248,113,113,0.1)', color: '#f87171',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4,
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addNote}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 8,
                      border: `1px dashed ${accentColor}50`,
                      background: 'transparent', color: accentColor, fontSize: 12,
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >
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
                  {saveState === 'saving' ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : saveState === 'saved' ? <Check size={13} /> : <Save size={13} />}
                  {saveState === 'idle' ? 'Save changes' : saveState === 'saving' ? 'Saving…' : saveMsg}
                </button>

                <button
                  onClick={resetToStatic}
                  style={{
                    padding: '9px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer',
                  }}
                >
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
  const chapters = selectedClass ? (GRADE_CHAPTERS[selectedClass] ?? []) : [];

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
        <button
          onClick={() => router.push('/teacher')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
        >
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
          Edit keywords and notes for each chapter. Your changes are saved to Firestore and immediately visible to students in the Study Corner.
        </p>

        {/* Class selector */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>
            SELECT CLASS
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CLASSES.map(cls => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                style={{
                  padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                  background: selectedClass === cls.id ? `${cls.color}20` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedClass === cls.id ? cls.color + '60' : 'rgba(255,255,255,0.1)'}`,
                  color: selectedClass === cls.id ? cls.color : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.15s',
                }}
              >
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
                  staticNotes={ch.resources?.notes ?? []}
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
    </div>
  );
}
