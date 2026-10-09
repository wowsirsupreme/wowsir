'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { TOPIC_LABELS, getGroupedTopics } from '@/types/question';

const GOLD = '#c9a84c';
const GROUPED = getGroupedTopics();

interface Props {
  value: string;
  onChange: (key: string) => void;
  inputStyle?: React.CSSProperties;
}

export default function TopicPicker({ value, onChange, inputStyle }: Props) {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const selected = value ? TOPIC_LABELS[value] : null;

  // Auto-select the group containing current value when opening
  useEffect(() => {
    if (open) {
      if (value) {
        for (const { subject, topics } of GROUPED) {
          if (topics.some(t => t.key === value)) {
            setActiveGroup(subject);
            break;
          }
        }
      } else {
        setActiveGroup(GROUPED[0]?.subject ?? null);
      }
    } else {
      setActiveGroup(null);
    }
  }, [open, value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pick = useCallback((key: string) => {
    onChange(key);
    setOpen(false);
  }, [onChange]);

  const triggerStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 12,
    border: `1.5px solid ${open ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.1)'}`,
    background: 'rgba(255,255,255,0.03)',
    color: '#f5f3ee',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'border-color 0.15s',
    ...inputStyle,
  };

  const activeTopics = GROUPED.find(g => g.subject === activeGroup)?.topics ?? [];

  return (
    <div ref={dropRef} style={{ position: 'relative', width: '100%' }}>
      {/* ── Trigger ── */}
      <button type="button" onClick={() => setOpen(o => !o)} style={triggerStyle}>
        <span style={{ color: selected ? '#f5f3ee' : 'rgba(255,255,255,0.28)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? `${selected.emoji} ${selected.title}` : '— Choose a topic —'}
        </span>
        <ChevronDown
          size={13}
          color="rgba(255,255,255,0.3)"
          style={{ flexShrink: 0, marginLeft: 8, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>

      {/* ── Two-panel dropdown ── */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          zIndex: 40,
          background: 'rgba(9,8,22,0.98)',
          backdropFilter: 'blur(18px)',
          border: '1.5px solid rgba(201,168,76,0.18)',
          borderRadius: 14,
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          display: 'flex',
          overflow: 'hidden',
          minHeight: 220,
        }}>

          {/* Left panel — subjects */}
          <div style={{
            width: '42%',
            flexShrink: 0,
            borderRight: '1px solid rgba(255,255,255,0.06)',
            overflowY: 'auto',
          }}>
            {GROUPED.map(({ subject, topics }, gi) => {
              const isActive = activeGroup === subject;
              const hasSelected = topics.some(t => t.key === value);
              return (
                <button
                  key={subject}
                  type="button"
                  onMouseEnter={() => setActiveGroup(subject)}
                  onClick={() => setActiveGroup(subject)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 12px',
                    background: isActive ? 'rgba(201,168,76,0.1)' : 'none',
                    borderTop: gi > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    borderLeft: isActive ? `2.5px solid ${GOLD}` : '2.5px solid transparent',
                    borderRight: 'none',
                    borderBottom: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                >
                  <span style={{
                    flex: 1,
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    color: hasSelected ? GOLD : isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                    lineHeight: 1.3,
                  }}>
                    {subject}
                  </span>
                  {hasSelected && (
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, flexShrink: 0 }} />
                  )}
                  <ChevronRight size={10} color={isActive ? GOLD : 'rgba(255,255,255,0.2)'} style={{ flexShrink: 0 }} />
                </button>
              );
            })}
          </div>

          {/* Right panel — chapters */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTopics.length === 0 ? (
              <div style={{ padding: '14px 12px', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                No topics available
              </div>
            ) : activeTopics.map(t => {
              const isChosen = t.key === value;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => pick(t.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '9px 12px',
                    background: isChosen ? 'rgba(201,168,76,0.13)' : 'none',
                    border: 'none',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    color: isChosen ? GOLD : 'rgba(255,255,255,0.7)',
                    fontSize: 12,
                    textAlign: 'left',
                    transition: 'background 0.1s, color 0.1s',
                  }}
                  onMouseEnter={e => { if (!isChosen) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = '#fff'; } }}
                  onMouseLeave={e => { if (!isChosen) { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; } }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{t.emoji}</span>
                  <span style={{ flex: 1, lineHeight: 1.35 }}>{t.title}</span>
                  {isChosen && <Check size={11} color={GOLD} style={{ flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
