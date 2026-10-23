'use client';

import React, { useState, useCallback } from 'react';
import { getAllQuestionsForExport } from '@/lib/firebase/questions';
import { TOPIC_LABELS } from '@/types/question';
import type { Question, QuestionType } from '@/types/question';

const PASSWORD = 'wowadmin2024';

// ── Validation ────────────────────────────────────────────────────────────────

const VALID_TYPES = new Set<QuestionType>([
  'mcq', 'truefalse', 'shortanswer', 'fillinblank', 'matching', 'ordering',
]);

const VALID_STATUSES = new Set(['approved', 'pending', 'rejected']);

interface Issue {
  severity: 'error' | 'warn';
  message: string;
}

function validateQuestion(q: Question): Issue[] {
  const issues: Issue[] = [];

  // Required fields
  if (!q.id)                issues.push({ severity: 'error', message: 'Missing id' });
  if (!q.text?.trim())      issues.push({ severity: 'error', message: 'Empty text' });
  if (!q.topicKey)          issues.push({ severity: 'error', message: 'Missing topicKey' });
  if (q.points == null)     issues.push({ severity: 'warn',  message: 'Missing points' });
  if (!q.type)              issues.push({ severity: 'error', message: 'Missing type' });

  // Valid type
  if (q.type && !VALID_TYPES.has(q.type)) {
    issues.push({ severity: 'error', message: `Unknown type: "${q.type}"` });
  }

  // Topic key must be in TOPIC_LABELS
  if (q.topicKey && !(q.topicKey in TOPIC_LABELS)) {
    issues.push({ severity: 'error', message: `Unknown topicKey: "${q.topicKey}"` });
  }

  // Approval status
  if (q.approvalStatus && !VALID_STATUSES.has(q.approvalStatus)) {
    issues.push({ severity: 'warn', message: `Invalid approvalStatus: "${q.approvalStatus}"` });
  }
  if (!q.approvalStatus) {
    issues.push({ severity: 'warn', message: 'No approvalStatus (treated as approved)' });
  }

  // Options must be array
  if (!Array.isArray(q.options)) {
    issues.push({ severity: 'error', message: 'options is not an array' });
  }

  // Type-specific checks
  if (q.type === 'mcq' && Array.isArray(q.options)) {
    if (q.options.length < 2) {
      issues.push({ severity: 'error', message: `MCQ has only ${q.options.length} option(s)` });
    }
    const answerIdx = Number(q.answer);
    if (isNaN(answerIdx) || answerIdx < 0 || answerIdx >= q.options.length) {
      issues.push({ severity: 'error', message: `MCQ answer "${q.answer}" is not a valid option index (0–${q.options.length - 1})` });
    }
    q.options.forEach((opt, i) => {
      if (!opt?.trim()) issues.push({ severity: 'warn', message: `Option ${i} is empty` });
    });
  }

  if (q.type === 'truefalse') {
    if (q.answer !== 'true' && q.answer !== 'false') {
      issues.push({ severity: 'error', message: `true/false answer must be "true" or "false", got: "${q.answer}"` });
    }
  }

  if (q.type === 'shortanswer' && !q.answer?.trim()) {
    issues.push({ severity: 'warn', message: 'shortanswer has no answer text' });
  }

  // Points sanity
  if (q.points != null && (isNaN(Number(q.points)) || Number(q.points) <= 0)) {
    issues.push({ severity: 'warn', message: `Unusual points value: ${q.points}` });
  }

  return issues;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface AuditRow {
  question: Question;
  issues: Issue[];
}

function buildTopicSummary(rows: AuditRow[]) {
  const map = new Map<string, { count: number; errors: number; warns: number }>();
  for (const { question: q, issues } of rows) {
    const key = q.topicKey || '(missing)';
    const existing = map.get(key) ?? { count: 0, errors: 0, warns: 0 };
    existing.count++;
    existing.errors += issues.filter(i => i.severity === 'error').length;
    existing.warns  += issues.filter(i => i.severity === 'warn').length;
    map.set(key, existing);
  }
  return Array.from(map.entries())
    .map(([key, stats]) => ({ key, ...stats }))
    .sort((a, b) => b.errors - a.errors || b.warns - a.warns || a.key.localeCompare(b.key));
}

function buildTypeSummary(rows: AuditRow[]) {
  const map = new Map<string, number>();
  for (const { question: q } of rows) {
    const key = q.type || '(missing)';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

// ── Component ─────────────────────────────────────────────────────────────────

const BG = [
  'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(239,68,68,0.08) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 20%, rgba(99,102,241,0.08) 0%, transparent 50%)',
  '#050814',
].join(',');

type FilterMode = 'all' | 'errors' | 'warns' | 'clean';

export default function DbAuditPage() {
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [pwError, setPwError] = useState('');

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [topicFilter, setTopicFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const questions = await getAllQuestionsForExport();
      const audited = questions.map(q => ({ question: q, issues: validateQuestion(q) }));
      setRows(audited);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    }
    setLoading(false);
  }, []);

  // ── Auth gate ──
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div style={{
          width: '100%', maxWidth: 380, padding: '40px 32px', borderRadius: 20,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
        }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8 }}>ADMIN</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 24 }}>DB Audit</h1>
          <input
            type="password"
            placeholder="Admin password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (pw === PASSWORD) { setAuthed(true); }
                else { setPwError('Wrong password'); }
              }
            }}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.07)', border: pwError ? '1.5px solid rgba(239,68,68,0.6)' : '1.5px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box',
            }}
            autoFocus
          />
          {pwError && <p style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>{pwError}</p>}
          <button
            onClick={() => {
              if (pw === PASSWORD) setAuthed(true);
              else setPwError('Wrong password');
            }}
            style={{
              marginTop: 16, width: '100%', padding: '12px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(99,102,241,0.3))',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  // ── Derive display data ──
  const totalErrors    = rows ? rows.reduce((n, r) => n + r.issues.filter(i => i.severity === 'error').length, 0) : 0;
  const totalWarns     = rows ? rows.reduce((n, r) => n + r.issues.filter(i => i.severity === 'warn').length, 0) : 0;
  const cleanCount     = rows ? rows.filter(r => r.issues.length === 0).length : 0;

  const topicSummary   = rows ? buildTopicSummary(rows) : [];
  const typeSummary    = rows ? buildTypeSummary(rows) : [];
  const allTopicKeys   = topicSummary.map(t => t.key);
  const allTypes       = typeSummary.map(t => t[0]);

  const filteredRows = rows
    ? rows.filter(r => {
        if (filter === 'errors') return r.issues.some(i => i.severity === 'error');
        if (filter === 'warns')  return r.issues.some(i => i.severity === 'warn');
        if (filter === 'clean')  return r.issues.length === 0;
        return true;
      }).filter(r => {
        if (topicFilter && r.question.topicKey !== topicFilter) return false;
        if (typeFilter  && r.question.type !== typeFilter) return false;
        return true;
      })
    : [];

  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(5,8,20,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/admin" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>← Admin</a>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>DB Audit</span>
          </div>
          {!loading && !rows && (
            <button
              onClick={runAudit}
              style={{
                padding: '9px 20px', borderRadius: 10,
                background: 'rgba(239,68,68,0.18)', border: '1.5px solid rgba(239,68,68,0.4)',
                color: '#fca5a5', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              Run Audit
            </button>
          )}
          {rows && (
            <button
              onClick={() => { setRows(null); setFilter('all'); setTopicFilter(''); setTypeFilter(''); }}
              style={{
                padding: '9px 20px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer',
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Entry state */}
        {!loading && !rows && !error && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>🔬</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Question Database Audit</h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
              Fetches every question from Firestore and checks each one for missing fields,
              invalid answer indices, unknown topic keys, and type inconsistencies.
            </p>
            <button
              onClick={runAudit}
              style={{
                padding: '14px 32px', borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(99,102,241,0.25))',
                border: '1.5px solid rgba(239,68,68,0.4)',
                color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
              }}
            >
              Run Audit
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.3)', fontSize: 15 }}>
            <div style={{ fontSize: 40, marginBottom: 16, animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>⚙️</div>
            <p>Fetching all questions…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ borderRadius: 16, padding: '20px 24px', background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.3)', marginBottom: 24 }}>
            <p style={{ color: '#fca5a5', fontSize: 14 }}>⚠️ {error}</p>
          </div>
        )}

        {/* Results */}
        {rows && (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'Total Questions', value: rows.length, color: '#7dd3fc', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.2)' },
                { label: 'Errors',          value: totalErrors,  color: '#fca5a5', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
                { label: 'Warnings',        value: totalWarns,   color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
                { label: 'Clean',           value: cleanCount,   color: '#6ee7b7', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
                { label: 'Topics',          value: allTopicKeys.length, color: '#c4b5fd', bg: 'rgba(196,181,253,0.08)', border: 'rgba(196,181,253,0.2)' },
              ].map(card => (
                <div key={card.label} style={{ borderRadius: 14, padding: '16px 18px', background: card.bg, border: `1.5px solid ${card.border}` }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 6 }}>{card.label}</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: card.color, margin: 0, fontFamily: 'var(--font-mono)' }}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Type distribution */}
            <div style={{ borderRadius: 16, padding: '18px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 12 }}>TYPE BREAKDOWN</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {typeSummary.map(([type, count]) => (
                  <span key={type} style={{
                    padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: 'rgba(196,181,253,0.1)', border: '1px solid rgba(196,181,253,0.2)',
                    color: '#c4b5fd',
                  }}>
                    {type} <span style={{ opacity: 0.6 }}>({count})</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Topic summary */}
            {topicSummary.some(t => t.errors > 0 || t.warns > 0) && (
              <div style={{ borderRadius: 16, padding: '18px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 12 }}>TOPICS WITH ISSUES</p>
                <div style={{ display: 'grid', gap: 6 }}>
                  {topicSummary.filter(t => t.errors > 0 || t.warns > 0).map(t => (
                    <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                      <button
                        onClick={() => setTopicFilter(prev => prev === t.key ? '' : t.key)}
                        style={{
                          padding: '3px 10px', borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)',
                          background: topicFilter === t.key ? 'rgba(196,181,253,0.2)' : 'rgba(255,255,255,0.06)',
                          border: topicFilter === t.key ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.1)',
                          color: topicFilter === t.key ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                          cursor: 'pointer',
                        }}
                      >{t.key}</button>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{t.count}q</span>
                      {t.errors > 0 && <span style={{ fontSize: 12, color: '#fca5a5', fontWeight: 600 }}>✖ {t.errors} error{t.errors !== 1 ? 's' : ''}</span>}
                      {t.warns > 0  && <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>⚠ {t.warns} warning{t.warns !== 1 ? 's' : ''}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' }}>
              {(['all', 'errors', 'warns', 'clean'] as FilterMode[]).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: filter === f ? 'rgba(196,181,253,0.18)' : 'rgba(255,255,255,0.05)',
                  border: filter === f ? '1.5px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  color: filter === f ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                }}>
                  {f === 'all' ? `All (${rows.length})` : f === 'errors' ? `Errors (${rows.filter(r => r.issues.some(i => i.severity === 'error')).length})` : f === 'warns' ? `Warnings only (${rows.filter(r => r.issues.some(i => i.severity === 'warn') && !r.issues.some(i => i.severity === 'error')).length})` : `Clean (${cleanCount})`}
                </button>
              ))}
              {(topicFilter || typeFilter) && (
                <button onClick={() => { setTopicFilter(''); setTypeFilter(''); }} style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#fca5a5',
                }}>
                  ✕ Clear filters
                </button>
              )}
              {topicFilter && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Topic: <span style={{ color: '#c4b5fd' }}>{topicFilter}</span></span>}
              {typeFilter  && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Type: <span style={{ color: '#c4b5fd' }}>{typeFilter}</span></span>}
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>Showing {filteredRows.length} of {rows.length}</span>
            </div>

            {/* Question list */}
            <div style={{ display: 'grid', gap: 8 }}>
              {filteredRows.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                  No questions match this filter.
                </div>
              )}
              {filteredRows.map(({ question: q, issues }) => {
                const hasError = issues.some(i => i.severity === 'error');
                const hasWarn  = issues.some(i => i.severity === 'warn');
                const isExpanded = expandedId === q.id;
                const borderColor = hasError ? 'rgba(239,68,68,0.35)' : hasWarn ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.25)';
                const bgColor     = hasError ? 'rgba(239,68,68,0.05)' : hasWarn ? 'rgba(245,158,11,0.04)' : 'rgba(16,185,129,0.04)';

                return (
                  <div key={q.id} style={{ borderRadius: 14, border: `1.5px solid ${borderColor}`, background: bgColor, overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      style={{
                        width: '100%', padding: '13px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {/* Status dot */}
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                        background: hasError ? '#f87171' : hasWarn ? '#fbbf24' : '#34d399',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Top line */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
                            {q.id?.slice(0, 10)}…
                          </span>
                          <span style={{
                            fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 700,
                            background: 'rgba(196,181,253,0.12)', border: '1px solid rgba(196,181,253,0.2)',
                            color: '#c4b5fd',
                          }}>{q.type || '?'}</span>
                          <button
                            onClick={e => { e.stopPropagation(); setTopicFilter(prev => prev === q.topicKey ? '' : (q.topicKey || '')); }}
                            style={{
                              fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 600,
                              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                              color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
                            }}
                          >{q.topicKey || '(none)'}</button>
                          <span style={{
                            fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 600,
                            background: q.approvalStatus === 'approved' ? 'rgba(16,185,129,0.12)' : q.approvalStatus === 'pending' ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.06)',
                            border: `1px solid ${q.approvalStatus === 'approved' ? 'rgba(16,185,129,0.25)' : q.approvalStatus === 'pending' ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.1)'}`,
                            color: q.approvalStatus === 'approved' ? '#6ee7b7' : q.approvalStatus === 'pending' ? '#7dd3fc' : 'rgba(255,255,255,0.35)',
                          }}>{q.approvalStatus || 'no status'}</span>
                        </div>
                        {/* Question text */}
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isExpanded ? 'normal' : 'nowrap' }}>
                          {q.text || <span style={{ color: '#f87171' }}>(no text)</span>}
                        </p>
                        {/* Issues */}
                        {issues.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {issues.map((iss, idx) => (
                              <span key={idx} style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 6,
                                background: iss.severity === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)',
                                color: iss.severity === 'error' ? '#fca5a5' : '#fbbf24',
                              }}>
                                {iss.severity === 'error' ? '✖' : '⚠'} {iss.message}
                              </span>
                            ))}
                          </div>
                        )}
                        {issues.length === 0 && (
                          <span style={{ fontSize: 11, color: '#6ee7b7' }}>✔ passes all checks</span>
                        )}
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{
                        margin: '0 12px 12px', borderRadius: 10,
                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
                        padding: '14px 16px',
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 12 }}>
                          {([
                            ['id', q.id],
                            ['topicKey', q.topicKey],
                            ['type', q.type],
                            ['answer', q.answer],
                            ['points', String(q.points)],
                            ['approvalStatus', q.approvalStatus],
                            ['source', q.source ?? '—'],
                            ['difficulty', q.difficulty ?? '—'],
                            ['createdAt', q.createdAt ? new Date(q.createdAt).toISOString().slice(0, 10) : '—'],
                          ] as [string, string][]).map(([key, val]) => (
                            <div key={key}>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>{key}: </span>
                              <span style={{ color: 'rgba(255,255,255,0.75)' }}>{val ?? '—'}</span>
                            </div>
                          ))}
                        </div>
                        {Array.isArray(q.options) && q.options.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>OPTIONS:</p>
                            <ol start={0} style={{ margin: 0, paddingLeft: 20 }}>
                              {q.options.map((opt, i) => (
                                <li key={i} style={{
                                  fontSize: 12, color: String(i) === String(q.answer) ? '#6ee7b7' : 'rgba(255,255,255,0.55)',
                                  marginBottom: 3,
                                  fontWeight: String(i) === String(q.answer) ? 700 : 400,
                                }}>
                                  {opt || <span style={{ color: '#f87171' }}>(empty)</span>}
                                  {String(i) === String(q.answer) && ' ← answer'}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                        {q.explanation && (
                          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>EXPLANATION:</p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
