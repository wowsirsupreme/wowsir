'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFirebase } from '@/hooks/useFirebase';
import { getFirebaseInstances } from '@/lib/firebase/config';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';

export default function SeedPage() {
  const { user, loading } = useAuth();
  useFirebase(); // ensure Firebase is initialised
  const [log, setLog] = useState<{ msg: string; type: 'ok' | 'err' | 'info' }[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  function addLog(msg: string, type: 'ok' | 'err' | 'info' = 'info') {
    setLog(prev => [...prev, { msg, type }]);
  }

  async function seedAll() {
    if (!user) return;
    setRunning(true);
    setLog([]);

    const { fs: db } = getFirebaseInstances();
    if (!db) { addLog('Firestore not initialised', 'err'); setRunning(false); return; }

    const now = Date.now();
    const uid = user.uid;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quizzes: any[] = [
      {
        title: 'IGCSE CS — Binary & Hex',
        description: 'Number systems: binary, denary and hexadecimal conversions.',
        subject: 'Computer Science',
        grade: '10',
        teacherId: uid,
        isPublished: true,
        status: 'published',
        createdAt: now - 86400000 * 2,
        updatedAt: now - 86400000,
        questionCount: 3,
        questions: [
          { id: 'q1', text: 'Convert 1011₂ to denary.', type: 'mcq', options: ['9','11','13','15'], correct: 1, points: 1 },
          { id: 'q2', text: 'What is 0xFF in denary?', type: 'mcq', options: ['127','200','255','256'], correct: 2, points: 1 },
          { id: 'q3', text: 'Convert 42 to binary.', type: 'mcq', options: ['00101000','00101010','00110100','00101100'], correct: 1, points: 1 },
        ],
      },
      {
        title: 'ICT — Input & Output Devices',
        description: 'Identifying and classifying input and output devices.',
        subject: 'ICT',
        grade: '9',
        teacherId: uid,
        isPublished: true,
        status: 'published',
        createdAt: now - 86400000 * 5,
        updatedAt: now - 86400000 * 3,
        questionCount: 3,
        questions: [
          { id: 'q1', text: 'Which of these is an INPUT device?', type: 'mcq', options: ['Monitor','Printer','Scanner','Speaker'], correct: 2, points: 1 },
          { id: 'q2', text: 'A microphone converts sound into:', type: 'mcq', options: ['Light signals','Electrical signals','Radio waves','Binary directly'], correct: 1, points: 1 },
          { id: 'q3', text: 'Which is BOTH input and output?', type: 'mcq', options: ['Keyboard','Touchscreen','Webcam','Headphones'], correct: 1, points: 1 },
        ],
      },
      {
        title: 'Algorithms — Sorting & Searching',
        description: 'Bubble sort and binary search concepts.',
        subject: 'Computer Science',
        grade: '11',
        teacherId: uid,
        isPublished: false,
        status: 'draft',
        createdAt: now - 3600000,
        updatedAt: now - 3600000,
        questionCount: 2,
        questions: [
          { id: 'q1', text: 'Worst-case time complexity of Bubble Sort?', type: 'mcq', options: ['O(n)','O(n log n)','O(n²)','O(log n)'], correct: 2, points: 1 },
          { id: 'q2', text: 'Binary search requires the list to be:', type: 'mcq', options: ['Reversed','Sorted','Unsorted','Numbered'], correct: 1, points: 1 },
        ],
      },
    ];

    // Ensure teacher profile exists and is approved
    addLog('Checking teacher profile…');
    try {
      const profileRef = doc(db, 'users', uid);
      const profileSnap = await getDoc(profileRef);
      const existing = profileSnap.exists() ? profileSnap.data() : {};
      await setDoc(profileRef, {
        uid,
        email: user.email,
        role: 'teacher',
        status: 'approved',
        displayName: existing.displayName || user.displayName || 'WOW Sir',
        school: existing.school || 'WOW Sir School',
        createdAt: existing.createdAt || now,
        updatedAt: now,
      }, { merge: true });
      addLog(`✓ Profile status set to approved`, 'ok');
    } catch (e: unknown) {
      addLog(`✗ Profile update failed: ${e instanceof Error ? e.message : String(e)}`, 'err');
    }

    // Question-type showcase quiz
    const typeQuiz = {
      title: 'Question Types Showcase',
      description: 'Demo quiz testing all question types: MCQ, True/False, Short Answer, Fill-in-Blank, Ordering, and Matching.',
      subject: 'Computer Science',
      grade: '9',
      teacherId: uid,
      isPublished: true,
      status: 'published',
      createdAt: now - 3600000,
      updatedAt: now,
      questionCount: 6,
      questions: [
        {
          id: 'qt1', type: 'mcq',
          text: 'Which layer of the OSI model handles IP addressing?',
          options: ['Data Link', 'Network', 'Transport', 'Application'],
          answer: '1', // Network = index 1
          explanation: 'The Network layer (Layer 3) handles IP addressing and routing.',
          points: 100,
        },
        {
          id: 'qt2', type: 'truefalse',
          text: 'RAM is non-volatile storage — its contents survive a power-off.',
          options: [], answer: 'false',
          explanation: 'RAM is volatile; it loses its contents when power is removed.',
          points: 100,
        },
        {
          id: 'qt3', type: 'shortanswer',
          text: 'What is the full form of "CPU"?',
          options: [], answer: 'Central Processing Unit',
          explanation: 'CPU stands for Central Processing Unit, the brain of the computer.',
          points: 100,
        },
        {
          id: 'qt4', type: 'fillinblank',
          text: 'The default port number for HTTP (unencrypted web traffic) is ___.',
          options: [], answer: '80',
          explanation: 'HTTP runs on port 80; HTTPS (secure) runs on port 443.',
          points: 100,
        },
        {
          id: 'qt5', type: 'ordering',
          // options[0..3] in scrambled order; correct sequence = indices 3,0,1,2 (Boot → POST → OS Load → Desktop)
          // answer = "3,0,1,2" means options[3] first, then options[0], options[1], options[2]
          text: 'Put the computer boot sequence in the correct order (first → last):',
          options: ['Operating system loads from disk', 'User desktop appears', 'Power button pressed', 'POST (Power-On Self-Test) runs'],
          answer: '2,3,0,1',
          // correct: Power button pressed → POST → OS loads → Desktop appears
          explanation: 'Boot sequence: Power button → POST → OS loads → Desktop appears.',
          points: 100,
        },
        {
          id: 'qt6', type: 'matching',
          text: 'Match each storage type to its correct description:',
          // Each option is "Term|Definition" — correct pair = same index on both sides
          options: [
            'HDD|Uses spinning magnetic platters to store data',
            'SSD|Uses NAND flash chips with no moving parts',
            'ROM|Read-only memory that holds firmware permanently',
            'Cache|Ultra-fast memory built directly into the CPU',
          ],
          answer: '0,1,2,3',
          explanation: 'HDD = spinning platters, SSD = flash chips, ROM = firmware, Cache = CPU-side fast memory.',
          points: 100,
        },
      ],
    };
    quizzes.push(typeQuiz);

    addLog('Seeding quizzes to Firestore…');
    const quizIds = ['seed_quiz_binary_hex', 'seed_quiz_io_devices', 'seed_quiz_algorithms', 'seed_quiz_type_showcase'];
    for (let i = 0; i < quizzes.length; i++) {
      const q = quizzes[i];
      const qId = quizIds[i] ?? `seed_quiz_${i}`;
      try {
        const ref = doc(db, 'quizzes', qId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          addLog(`↷ "${q.title}" already exists — skipped`, 'info');
        } else {
          await setDoc(ref, { ...q, id: qId });
          addLog(`✓ "${q.title}" → ${qId}`, 'ok');
        }
      } catch (e: unknown) {
        addLog(`✗ "${q.title}": ${e instanceof Error ? e.message : String(e)}`, 'err');
      }
    }

    addLog('Seeding papers to localStorage…');
    const papers = [
      {
        id: 'paper_sample_1',
        title: 'End of Term Test — CS Y10',
        status: 'draft',
        createdAt: now - 86400000 * 3,
        updatedAt: now - 86400000,
        sections: [
          { title: 'Section A: Short Answer', questions: [
            { text: 'State the difference between RAM and ROM.', marks: 2, space: 4 },
            { text: 'Give two examples of secondary storage devices.', marks: 2, space: 3 },
          ]},
          { title: 'Section B: Structured', questions: [
            { text: 'Explain why a hard disk drive would be more suitable than a USB flash drive for storing coursework.', marks: 4, space: 6 },
          ]},
        ],
        totalMarks: 8,
      },
      {
        id: 'paper_sample_2',
        title: 'ICT Class Test — Devices & Networks',
        status: 'published',
        createdAt: now - 86400000 * 7,
        updatedAt: now - 86400000 * 6,
        sections: [
          { title: 'Section A: Short Answer', questions: [
            { text: 'Which device converts digital signals to analogue for telephone transmission?', marks: 1, space: 2 },
            { text: 'Name the type of network that covers a small area like a school.', marks: 1, space: 2 },
          ]},
        ],
        totalMarks: 2,
      },
    ];

    try {
      const idx: string[] = JSON.parse(localStorage.getItem('assessments_index') || '[]');
      for (const p of papers) {
        localStorage.setItem(`assessment_${p.id}`, JSON.stringify(p));
        if (!idx.includes(p.id)) idx.unshift(p.id);
        addLog(`✓ Paper "${p.title}" → localStorage`, 'ok');
      }
      localStorage.setItem('assessments_index', JSON.stringify(idx));
      addLog(`✓ assessments_index updated`, 'ok');
    } catch (e: unknown) {
      addLog(`✗ localStorage: ${e instanceof Error ? e.message : String(e)}`, 'err');
    }

    addLog('Done! Go to your teacher dashboard.', 'ok');
    setRunning(false);
    setDone(true);
  }

  if (loading) return (
    <div style={styles.page}>
      <p style={{ color: '#94a3b8' }}>Loading…</p>
    </div>
  );

  if (!user) return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Seeder</h1>
      <p style={{ color: '#f87171' }}>You must be signed in to use this page.</p>
      <a href="/teacher" style={styles.link}>← Go sign in via the teacher page</a>
    </div>
  );

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Data Seeder</h1>
      <p style={styles.sub}>Signed in as <strong>{user.email}</strong></p>
      <p style={styles.sub}>Writes 3 sample quizzes to Firestore + 2 papers to localStorage.</p>

      {!done ? (
        <button
          style={{ ...styles.btn, opacity: running ? 0.6 : 1 }}
          onClick={seedAll}
          disabled={running}
        >
          {running ? 'Seeding…' : 'Seed sample data'}
        </button>
      ) : (
        <a href="/teacher" style={styles.btn}>← Back to teacher dashboard</a>
      )}

      {log.length > 0 && (
        <div style={styles.logBox}>
          {log.map((l, i) => (
            <div key={i} style={{ color: l.type === 'ok' ? '#4ade80' : l.type === 'err' ? '#f87171' : '#94a3b8', fontSize: 13, lineHeight: 1.8 }}>
              {l.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 520, margin: '60px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif', color: '#e2e8f0' },
  h1:   { color: '#e6c84a', fontSize: '1.5rem', marginBottom: 6 },
  sub:  { color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 6px' },
  btn:  { display: 'inline-block', marginTop: 20, padding: '11px 26px', background: '#e6c84a', color: '#111',
          borderRadius: 8, border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', textDecoration: 'none' },
  logBox: { marginTop: 24, background: '#1a1d2e', borderRadius: 10, padding: '16px 20px',
            border: '1px solid #2a2d3e' },
  link: { color: '#e6c84a', fontSize: '0.9rem' },
};
