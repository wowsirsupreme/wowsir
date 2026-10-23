'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, RefreshCw, ArrowRight, AlertTriangle, CheckCircle2, SkipForward } from 'lucide-react';
import { getAllQuestionsForExport } from '@/lib/firebase/questions';
import { getFirebaseInstances } from '@/lib/firebase/config';
import { doc, writeBatch } from 'firebase/firestore';
import { useFirebase } from '@/hooks/useFirebase';

const ADMIN_PASSWORD = 'wowadmin2024';

/* ─── canonical mapping ──────────────────────────────────────────────── */
/** Keys that have a definitive canonical target. */
const CANONICAL_MAP: Record<string, string> = {
  // Grade 5 Ch 1 — all granular lesson keys → chapter-level evolution key
  'gr5-ch1-history':           'gr5-ch1-evolution',
  'gr5-ch1-early-counting':    'gr5-ch1-evolution',
  'gr5-ch1-abacus':            'gr5-ch1-evolution',
  'gr5-ch1-napier':            'gr5-ch1-evolution',
  'gr5-ch1-pascaline':         'gr5-ch1-evolution',
  'gr5-ch1-leibniz':           'gr5-ch1-evolution',
  'gr5-ch1-jacquard':          'gr5-ch1-evolution',
  'gr5-ch1-babbage-lovelace':  'gr5-ch1-evolution',
  'gr5-ch1-hollerith':         'gr5-ch1-evolution',
  'gr5-ch1-mark1':             'gr5-ch1-evolution',
  'gr5-ch1-gen1':              'gr5-ch1-evolution',
  'gr5-ch1-gen2':              'gr5-ch1-evolution',
  'gr5-ch1-gen3':              'gr5-ch1-evolution',
  'gr5-ch1-gen4':              'gr5-ch1-evolution',
  'gr5-ch1-gen5':              'gr5-ch1-evolution',
  'gr5-ch1-mainframe-super':   'gr5-ch1-evolution',
  'gr5-ch1-smartphone':        'gr5-ch1-evolution',
  'gr5-ch1-ai-nlp-ar-vr':      'gr5-ch1-evolution',
  // Grade 5 Ch 2 — all granular lesson keys → chapter-level storage key
  'gr5-ch2-binary':            'gr5-ch2-storage',
  'gr5-ch2-units':             'gr5-ch2-storage',
  'gr5-ch2-ram-rom':           'gr5-ch2-storage',
  'gr5-ch2-secondary-overview':'gr5-ch2-storage',
  'gr5-ch2-harddisk':          'gr5-ch2-storage',
  'gr5-ch2-cd':                'gr5-ch2-storage',
  'gr5-ch2-dvd':               'gr5-ch2-storage',
  'gr5-ch2-bluray':            'gr5-ch2-storage',
  'gr5-ch2-rw-vs-r':           'gr5-ch2-storage',
  'gr5-ch2-pendrive-memorycard':'gr5-ch2-storage',
  'gr5-ch2-cloud':             'gr5-ch2-storage',
  'gr5-ch2-magnetictape':      'gr5-ch2-storage',
  'gr5-ch2-review':            'gr5-ch2-storage',
  // Grade 9 — CSV-import aliases → granular data-* keys
  'gr9-number-systems':        'gr9-data-binary',
  'gr9-text-sound-images':     'gr9-data-text',
  'gr9-compression':           'gr9-data-compression',
  'gr9-networking':            'gr9-packet-switching',
  'gr9-networks':              'gr9-packet-switching',
  'gr9-programming':           'gr9-prog-concepts',
  // Grade 10 — duplicate / alias keys
  'gr10-algorithms-adv':       'gr10-algorithms',
  'gr10-python-adv':           'gr10-programming',
  'gr10-encryption':           'gr10-cybersecurity',
  // Grade 11 — duplicate keys
  'gr11-system-software':      'gr11-os',
  'gr11-logic':                'gr11-hardware',
  // Grade 9 DT — alias keys → canonical design-process keys
  'gr9dt-design1':             'gr9dt-design-brief',
  'gr9dt-design2':             'gr9dt-developing',
  'gr9dt-design3':             'gr9dt-plan',
};

/** Keys that are legacy but have no unambiguous canonical target — require manual review. */
const REVIEW_KEYS = new Set([
  'gr9-algorithms', // no dedicated gr9 algorithms canonical key
  'gr9-cybersec',   // no dedicated gr9 cybersecurity canonical key
]);

type MigrateResult = {
  updated: number;
  skipped: number;
  reviewNeeded: { id: string; text: string; topicKey: string }[];
  errors: string[];
};

/* ─── page ─────────────────────────────────────────────────────────── */
export default function MigrateTopicsPage() {
  useFirebase();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');

  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<{
    legacy: Record<string, { ids: string[]; texts: string[]; canonical: string | null }>;
    total: number;
  } | null>(null);

  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<MigrateResult | null>(null);

  function login() {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(''); }
    else setPwError('Incorrect password.');
  }

  const scan = useCallback(async () => {
    setScanning(true);
    setScanResults(null);
    setResult(null);
    try {
      const all = await getAllQuestionsForExport();
      const allLegacyKeys = new Set([...Object.keys(CANONICAL_MAP), ...Array.from(REVIEW_KEYS)]);
      const legacy: Record<string, { ids: string[]; texts: string[]; canonical: string | null }> = {};
      let total = 0;
      for (const q of all) {
        if (!q.topicKey || !allLegacyKeys.has(q.topicKey)) continue;
        if (!legacy[q.topicKey]) {
          legacy[q.topicKey] = {
            ids: [],
            texts: [],
            canonical: CANONICAL_MAP[q.topicKey] ?? null,
          };
        }
        legacy[q.topicKey].ids.push(q.id!);
        legacy[q.topicKey].texts.push((q.text ?? '').slice(0, 80));
        total++;
      }
      setScanResults({ legacy, total });
    } catch (e) {
      alert('Scan failed: ' + String(e));
    } finally {
      setScanning(false);
    }
  }, []);

  const runMigration = useCallback(async () => {
    if (!scanResults) return;
    setMigrating(true);
    setResult(null);
    const { fs } = getFirebaseInstances();
    if (!fs) { alert('Firebase not configured.'); setMigrating(false); return; }

    let updated = 0;
    let skipped = 0;
    const reviewNeeded: MigrateResult['reviewNeeded'] = [];
    const errors: string[] = [];

    // Collect all questions to update
    const toUpdate: { id: string; topicKey: string }[] = [];
    for (const [legacyKey, info] of Object.entries(scanResults.legacy)) {
      if (!info.canonical) {
        // Review needed — no auto-migrate
        info.ids.forEach((id, i) => {
          reviewNeeded.push({ id, text: info.texts[i] ?? '', topicKey: legacyKey });
        });
        skipped += info.ids.length;
        continue;
      }
      info.ids.forEach(id => toUpdate.push({ id, topicKey: info.canonical! }));
    }

    // Batch write — 400 per batch (Firestore limit 500, stay safe)
    const BATCH_SIZE = 400;
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const chunk = toUpdate.slice(i, i + BATCH_SIZE);
      try {
        const batch = writeBatch(fs);
        for (const { id, topicKey } of chunk) {
          batch.update(doc(fs, 'questions', id), { topicKey });
        }
        await batch.commit();
        updated += chunk.length;
      } catch (e) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${String(e)}`);
      }
    }

    setResult({ updated, skipped, reviewNeeded, errors });
    setMigrating(false);
  }, [scanResults]);

  /* ── auth gate ── */
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: 360 }}>
          <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>Admin — Topic Migration</h1>
          <input
            type="password" placeholder="Admin password" value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }}
          />
          {pwError && <p style={{ color: '#f87171', fontSize: 12, margin: '0 0 8px' }}>{pwError}</p>}
          <button onClick={login} style={{ width: '100%', padding: '10px', borderRadius: 8, background: '#b8942a', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const CARD: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, marginBottom: 16 };
  const BTN = (color: string, disabled = false): React.CSSProperties => ({
    padding: '10px 20px', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 13, cursor: disabled ? 'default' : 'pointer',
    background: disabled ? 'rgba(255,255,255,0.06)' : color,
    color: disabled ? 'rgba(255,255,255,0.3)' : '#fff',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e8f0', padding: '32px 24px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>

        {/* Back button */}
        <button onClick={() => router.push('/admin')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, marginBottom: 24 }}>
          <ChevronLeft size={16} /> Back to Admin
        </button>

        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Topic Key Migration</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '0 0 28px' }}>
          Remaps questions using legacy/alias topic keys to their official canonical keys. Questions with ambiguous targets are flagged for manual review and never auto-modified.
        </p>

        {/* Mapping reference */}
        <div style={CARD}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px', color: 'rgba(255,255,255,0.7)' }}>Canonical Mapping Reference</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '4px 12px', fontSize: 11 }}>
            {Object.entries(CANONICAL_MAP).map(([from, to]) => (
              <React.Fragment key={from}>
                <span style={{ color: 'rgba(248,113,113,0.8)', fontFamily: 'monospace', padding: '2px 0' }}>{from}</span>
                <ArrowRight size={10} style={{ color: 'rgba(255,255,255,0.25)', alignSelf: 'center' }} />
                <span style={{ color: 'rgba(74,222,128,0.8)', fontFamily: 'monospace', padding: '2px 0' }}>{to}</span>
              </React.Fragment>
            ))}
            {Array.from(REVIEW_KEYS).map(k => (
              <React.Fragment key={k}>
                <span style={{ color: 'rgba(251,191,36,0.8)', fontFamily: 'monospace', padding: '2px 0' }}>{k}</span>
                <SkipForward size={10} style={{ color: 'rgba(255,255,255,0.25)', alignSelf: 'center' }} />
                <span style={{ color: 'rgba(251,191,36,0.5)', padding: '2px 0' }}>⚠ review needed — no auto-migrate</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1: Scan */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'rgba(255,255,255,0.7)' }}>Step 1 — Scan Database</h2>
            <button onClick={scan} disabled={scanning} style={BTN('rgba(99,102,241,0.85)', scanning)}>
              {scanning ? <><RefreshCw size={13} style={{ display: 'inline', marginRight: 6, animation: 'spin 1s linear infinite' }} />Scanning…</> : 'Scan Now'}
            </button>
          </div>

          {scanResults && (
            <>
              <p style={{ fontSize: 13, color: Object.keys(scanResults.legacy).length === 0 ? 'rgba(74,222,128,0.8)' : 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>
                {Object.keys(scanResults.legacy).length === 0
                  ? '✅ No legacy-key questions found. Database is clean.'
                  : `Found ${scanResults.total} question${scanResults.total !== 1 ? 's' : ''} across ${Object.keys(scanResults.legacy).length} legacy key${Object.keys(scanResults.legacy).length !== 1 ? 's' : ''}.`}
              </p>
              {Object.entries(scanResults.legacy).map(([legacyKey, info]) => (
                <div key={legacyKey} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, padding: '10px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(248,113,113,0.85)' }}>{legacyKey}</span>
                    {info.canonical
                      ? <><ArrowRight size={11} style={{ color: 'rgba(255,255,255,0.3)' }} /><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(74,222,128,0.85)' }}>{info.canonical}</span></>
                      : <span style={{ fontSize: 11, color: 'rgba(251,191,36,0.8)', marginLeft: 4 }}>⚠ manual review</span>
                    }
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{info.ids.length} question{info.ids.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                    {info.texts.slice(0, 3).map((t, i) => <div key={i}>• {t}{t.length >= 80 ? '…' : ''}</div>)}
                    {info.ids.length > 3 && <div style={{ color: 'rgba(255,255,255,0.2)' }}>…and {info.ids.length - 3} more</div>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Step 2: Migrate */}
        {scanResults && Object.keys(scanResults.legacy).length > 0 && !result && (
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px', color: 'rgba(255,255,255,0.7)' }}>Step 2 — Run Migration</h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                  Updates <code>topicKey</code> in Firestore via batch writes (400/batch). Review-needed keys are skipped.
                </p>
              </div>
              <button onClick={runMigration} disabled={migrating} style={{ ...BTN('#b8942a', migrating), display: 'flex', alignItems: 'center', gap: 6 }}>
                {migrating ? <><RefreshCw size={13} style={{ display: 'inline', animation: 'spin 1s linear infinite' }} /> Migrating…</> : '▶ Run Migration'}
              </button>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', fontSize: 12, color: 'rgba(251,191,36,0.8)' }}>
              <AlertTriangle size={12} style={{ display: 'inline', marginRight: 5 }} />
              This operation writes directly to production Firestore. Firestore documents cannot be automatically restored. Verify the scan results above before proceeding.
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={CARD}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px', color: 'rgba(255,255,255,0.7)' }}>Migration Results</h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 9, padding: '10px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'rgba(74,222,128,0.9)' }}>{result.updated}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Updated</div>
              </div>
              <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 9, padding: '10px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'rgba(251,191,36,0.9)' }}>{result.skipped}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Skipped (review)</div>
              </div>
              {result.errors.length > 0 && (
                <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 9, padding: '10px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'rgba(248,113,113,0.9)' }}>{result.errors.length}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Batch Errors</div>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(248,113,113,0.8)', margin: '0 0 6px' }}>Errors</h3>
                {result.errors.map((e, i) => <div key={i} style={{ fontSize: 11, color: 'rgba(248,113,113,0.6)', fontFamily: 'monospace', marginBottom: 3 }}>{e}</div>)}
              </div>
            )}

            {result.reviewNeeded.length > 0 && (
              <div>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(251,191,36,0.8)', margin: '0 0 8px' }}>
                  Manual Review Required ({result.reviewNeeded.length} questions)
                </h3>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 10px' }}>
                  These questions use ambiguous legacy keys with no definitive canonical target. Edit each question in the Question Library to assign the correct topic.
                </p>
                {result.reviewNeeded.slice(0, 20).map(q => (
                  <div key={q.id} style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>
                    [{q.topicKey}] {q.id}: {q.text.slice(0, 60)}{q.text.length > 60 ? '…' : ''}
                  </div>
                ))}
                {result.reviewNeeded.length > 20 && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>…and {result.reviewNeeded.length - 20} more</div>
                )}
              </div>
            )}

            {result.errors.length === 0 && result.updated > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: 'rgba(74,222,128,0.8)', fontSize: 13 }}>
                <CheckCircle2 size={16} /> Migration completed successfully. Re-scan to confirm.
              </div>
            )}

            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <button onClick={scan} style={BTN('rgba(99,102,241,0.7)')}>Re-scan</button>
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
