'use client';

import { useState, useEffect, useRef } from 'react';
import { Flame, Link, Clipboard, Lock, Save, X, CheckCircle, XCircle, Upload, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  getFirebaseConfig,
  initFirebase,
  saveFirebaseConfig,
  buildShareLink,
  type FirebaseConfig,
} from '@/lib/firebase/config';
import {
  seedStudyQuestions,
  getStudyChapterStats,
  seedGradeBank,
  getGradeBankStats,
  getTotalGradeBankCount,
} from '@/lib/firebase/studySync';
import { seedPresetQuizCatalog } from '@/lib/firebase/presetQuizzes';

const DEFAULT_PW = 'wowadmin2024';
const TAP_TARGET = 5;

interface AdminPanelProps {
  onClose: () => void;
}

function getAdminPw(): string {
  try { return localStorage.getItem('adminPw') || DEFAULT_PW; } catch { return DEFAULT_PW; }
}

export function useAdminTap() {
  const taps = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);

  function handleTap() {
    taps.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { taps.current = 0; }, 2000);
    if (taps.current >= TAP_TARGET) {
      taps.current = 0;
      setOpen(true);
    }
  }

  return { open, setOpen, handleTap };
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const { toast } = useToast();
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [cfg, setCfg] = useState<FirebaseConfig>({
    apiKey: '', authDomain: '', databaseURL: '', projectId: '',
    storageBucket: '', messagingSenderId: '', appId: '',
  });
  const [status, setStatus] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [newPw, setNewPw] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedingGrade, setSeedingGrade] = useState<string | null>(null);
  const [seedingAll, setSeedingAll] = useState(false);
  const [seedingPresets, setSeedingPresets] = useState(false);
  const chapterStats = getStudyChapterStats();
  const totalStudyQ  = chapterStats.reduce((s, c) => s + c.count, 0);
  const gradeBankStats = getGradeBankStats();
  const totalGradeQ = getTotalGradeBankCount();

  async function handleSeedQuestions() {
    setSeeding(true);
    try {
      const result = await seedStudyQuestions();
      toast(`Seeded ${result.written} study questions to Firestore`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Seed failed', 'error');
    } finally {
      setSeeding(false);
    }
  }

  async function handleSeedGrade(grade: string) {
    setSeedingGrade(grade);
    try {
      const g = grade === '9dt' ? '9dt' : (Number(grade) as 4|5|6|7|8|9|10|11);
      const result = await seedGradeBank(g as Parameters<typeof seedGradeBank>[0]);
      toast(`Grade ${grade}: ${result.written} written, ${result.protected} protected`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Seed failed', 'error');
    } finally {
      setSeedingGrade(null);
    }
  }

  async function handleSeedAllGrades() {
    setSeedingAll(true);
    try {
      const result = await seedGradeBank(undefined);
      toast(`All grades: ${result.written} written, ${result.protected} protected`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Seed all failed', 'error');
    } finally {
      setSeedingAll(false);
    }
  }

  async function handleSeedPresets() {
    setSeedingPresets(true);
    try {
      const result = await seedPresetQuizCatalog();
      toast(`Preset quiz catalog: ${result.written} quizzes seeded`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Preset seed failed', 'error');
    } finally {
      setSeedingPresets(false);
    }
  }

  useEffect(() => {
    const saved = getFirebaseConfig();
    if (saved) setCfg(saved);
    // Check ?admin=1 URL param
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') setUnlocked(true);
  }, []);

  function checkPw() {
    if (pw === getAdminPw()) {
      setUnlocked(true);
      setPwErr('');
    } else {
      setPwErr('Incorrect password');
    }
  }

  function saveAndConnect() {
    if (!cfg.apiKey || !cfg.authDomain || !cfg.databaseURL || !cfg.projectId) {
      setStatus('❌ Fill in all required fields');
      return;
    }
    saveFirebaseConfig(cfg);
    const result = initFirebase(cfg);
    if (result) {
      setStatus('✅ Connected! Firebase is live.');
      setShareLink(buildShareLink(cfg));
      toast('Firebase connected!', 'success');
    } else {
      setStatus('❌ Connection failed — check your config.');
    }
  }

  function changePw() {
    if (!newPw || newPw.length < 6) { toast('Password must be 6+ characters', 'error'); return; }
    try { localStorage.setItem('adminPw', newPw); } catch {}
    toast('Admin password updated', 'success');
    setNewPw('');
  }

  function copyLink() {
    navigator.clipboard.writeText(shareLink).then(() => toast('Link copied!', 'success'));
  }

  if (!unlocked) {
    return (
      <div className="p-8">
        <h2 className="font-display text-gold text-2xl mb-6">Admin Panel</h2>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Password</label>
        <input
          type="password"
          className="wow-input mb-2"
          placeholder="wowadmin2024"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && checkPw()}
          autoFocus
        />
        {pwErr && <p className="text-red-400 text-sm mb-3">{pwErr}</p>}
        <div className="flex gap-3">
          <Button variant="gold" onClick={checkPw} full>Unlock →</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-gold text-2xl">Admin Panel</h2>
        <Button variant="ghost" size="sm" onClick={onClose}><X size={18} /></Button>
      </div>

      {/* Firebase Config */}
      <div className="admin-section mb-5">
        <h4 className="section-label mb-4 flex items-center gap-2"><Flame size={14} /> Firebase Configuration</h4>
        <div className="space-y-3">
          {[
            { label: 'API Key *', key: 'apiKey', ph: 'AIzaSy...' },
            { label: 'Auth Domain *', key: 'authDomain', ph: 'yourapp.firebaseapp.com' },
            { label: 'Database URL *', key: 'databaseURL', ph: 'https://yourapp-default-rtdb.firebaseio.com' },
            { label: 'Project ID *', key: 'projectId', ph: 'yourapp' },
            { label: 'Storage Bucket', key: 'storageBucket', ph: 'yourapp.appspot.com' },
            { label: 'Messaging Sender ID', key: 'messagingSenderId', ph: '123456789' },
            { label: 'App ID', key: 'appId', ph: '1:123:web:abc' },
          ].map(({ label, key, ph }) => (
            <div key={key}>
              <label className="block text-xs text-muted font-semibold uppercase tracking-wider mb-1">{label}</label>
              <input
                className="wow-input"
                placeholder={ph}
                value={(cfg as unknown as Record<string, string>)[key] || ''}
                onChange={e => setCfg(prev => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button variant="primary" onClick={saveAndConnect} full className="mt-4">
          <Save size={15} className="inline mr-1.5" /> Save &amp; Connect
        </Button>
        {status && (
          <p className={`mt-3 text-sm flex items-center gap-1.5 ${status.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
            {status.startsWith('✅') ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {status.replace('✅ ', '').replace('❌ ', '')}
          </p>
        )}
      </div>

      {/* Shareable Link */}
      {shareLink && (
        <div className="admin-section mb-5">
          <h4 className="section-label mb-2 flex items-center gap-2"><Link size={14} /> Shareable Link</h4>
          <p className="text-muted text-xs mb-3">Share this link — Firebase connects automatically on all devices</p>
          <div className="bg-paper rounded-lg p-3 font-mono text-xs break-all text-muted mb-3 border border-border">
            {shareLink}
          </div>
          <Button variant="outline" size="sm" onClick={copyLink}><Clipboard size={13} className="inline mr-1.5" /> Copy Link</Button>
        </div>
      )}

      {/* Study Content Seed */}
      <div className="admin-section mb-5">
        <h4 className="section-label mb-2 flex items-center gap-2"><BookOpen size={14} /> Study Questions</h4>
        <p className="text-muted text-xs mb-3">
          Push Grade 7 study questions into Firestore so they appear in the quiz builder.
          {totalStudyQ > 0 ? ` ${totalStudyQ} question${totalStudyQ !== 1 ? 's' : ''} ready to seed.` : ' No questions added yet — edit studyContent.ts first.'}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {chapterStats.map(ch => (
            <span
              key={ch.key}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.05)', color: ch.count > 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {ch.title}: <strong style={{ color: ch.count > 0 ? '#6ee7b7' : undefined }}>{ch.count}</strong>
            </span>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeedQuestions}
          loading={seeding}
          disabled={totalStudyQ === 0}
        >
          <Upload size={13} className="inline mr-1.5" />
          Seed to Firestore
        </Button>
      </div>

      {/* Grade Question Banks */}
      <div className="admin-section mb-5">
        <h4 className="section-label mb-2 flex items-center gap-2"><BookOpen size={14} /> Grade Question Banks</h4>
        <p className="text-muted text-xs mb-3">
          Seed pre-set questions for each grade into Firestore. Teacher-modified questions are never overwritten.
          {totalGradeQ > 0 ? ` ${totalGradeQ} questions available across all grades.` : ''}
        </p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {gradeBankStats.map(gs => (
            <button
              key={gs.grade}
              onClick={() => handleSeedGrade(gs.grade)}
              disabled={seedingGrade === gs.grade || seedingAll}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
            >
              <span className="font-medium truncate">{gs.subject}</span>
              <span style={{ color: '#6ee7b7', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {seedingGrade === gs.grade ? '…' : `${gs.count}q`}
              </span>
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeedAllGrades}
          loading={seedingAll}
          disabled={seedingAll || seedingGrade !== null}
          full
        >
          <Upload size={13} className="inline mr-1.5" />
          Seed ALL Grades ({totalGradeQ} questions)
        </Button>
      </div>

      {/* Preset Quiz Catalog */}
      <div className="admin-section mb-5">
        <h4 className="section-label mb-2 flex items-center gap-2"><BookOpen size={14} /> Preset Quiz Catalog</h4>
        <p className="text-muted text-xs mb-3">
          Seed the initial preset quiz catalog (curated quizzes for student practice) into Firestore. Safe to re-run.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeedPresets}
          loading={seedingPresets}
          disabled={seedingPresets}
        >
          <Upload size={13} className="inline mr-1.5" />
          Seed Preset Quiz Catalog
        </Button>
      </div>

      {/* Change Password */}
      <div className="admin-section">
        <h4 className="section-label mb-3 flex items-center gap-2"><Lock size={14} /> Change Password</h4>
        <div className="flex gap-2">
          <input
            type="password"
            className="wow-input mb-0 flex-1"
            placeholder="New password (min 6 chars)"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={changePw}>Save</Button>
        </div>
      </div>
    </div>
  );
}
