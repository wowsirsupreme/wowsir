'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { TOPIC_LABELS, getGroupedTopics } from '@/types/question';

const GOLD = '#c9a84c';
const GROUPED = getGroupedTopics();

interface Props {
  value: string;
  onChange: (key: string) => void;
  /** Visual style override for the trigger button */
  inputStyle?: React.CSSProperties;
}

export default function TopicPicker({ value, onChange, inputStyle }: Props) {
  const [open, setOpen]           = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const selected = value ? TOPIC_LABELS[value] : null;

  // Auto-expand the group that contains the currently selected topic on open
  useEffect(() => {
    if (open && value) {
      for (const { subject, topics } of GROUPED) {
        if (topics.some(t => t.key === value)) {
          setExpandedGroup(subject);
          break;
        }
      }
    }
    if (!open) setExpandedGroup(null);
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

  const baseInputStyle: React.CSSProperties = {
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

  return (
    <div ref={dropRef} style={{ position: 'relative', width: '100%' }}>
      {/* ── Trigger ── */}
      <button type="button" onClick={() => setOpen(o => !o)} style={baseInputStyle}>
        <span style={{ color: selected ? '#f5f3ee' : 'rgba(255,255,255,0.28)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? `${selected.emoji} ${selected.title}` : '— Choose a topic —'}
        </span>
        <ChevronDown
          size={13}
          color="rgba(255,255,255,0.3)"
          style={{ flexShrink: 0, marginLeft: 8, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          zIndex: 40,
          background: 'rgba(10,9,24,0.98)',
          backdropFilter: 'blur(18px)',
          border: '1.5px solid rgba(201,168,76,0.18)',
          borderRadius: 14,
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          maxHeight: 420,
          overflowY: 'auto',
        }}>
          {GROUPED.map(({ subject, topics }, gi) => {
            const isExpanded = expandedGroup === subject;
            const hasSelected = topics.some(t => t.key === value);

            return (
              <div key={subject} style={{ borderTop: gi > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                {/* ── Group Header (Level 1) ── */}
                <button
                  type="button"
                  onClick={() => setExpandedGroup(isExpanded ? null : subject)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    background: isExpanded ? 'rgba(201,168,76,0.08)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'none'; }}
                >
                  <ChevronRight
                    size={12}
                    color={isExpanded ? GOLD : 'rgba(255,255,255,0.35)'}
                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s', flexShrink: 0 }}
                  />
                  <span style={{
                    flex: 1,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: hasSelected ? GOLD : isExpanded ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)',
                  }}>
                    {subject}
                  </span>
                  <span style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 6,
                    padding: '1px 6px',
                  }}>
                    {topics.length}
                  </span>
                  {hasSelected && !isExpanded && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: GOLD, flexShrink: 0,
                    }} />
                  )}
                </button>

                {/* ── Chapter list (Level 2) ── */}
                {isExpanded && (
                  <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    {topics.map(t => {
                      const isActive = t.key === value;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => pick(t.key)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '8px 14px 8px 30px',
                            background: isActive ? 'rgba(201,168,76,0.13)' : 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: isActive ? GOLD : 'rgba(255,255,255,0.65)',
                            fontSize: 13,
                            textAlign: 'left',
                            transition: 'background 0.12s, color 0.12s',
                          }}
                          onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)'; } }}
                          onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'; } }}
                        >
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{t.emoji}</span>
                          <span style={{ flex: 1, lineHeight: 1.35 }}>{t.title}</span>
                          {isActive && <Check size={11} color={GOLD} style={{ flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
