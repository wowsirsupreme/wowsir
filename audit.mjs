/**
 * WOW Quiz — Full Question Audit & Quiz Simulation
 * Uses Firestore REST API (plain HTTPS) so it works through the proxy.
 */

import https from 'https';

const PROJECT_ID = 'wow-quiz-1555d';
const API_KEY    = 'AIzaSyCmybq2SvzZijxLlsrSOgQpLe7J1w17pDI';

// ── Firestore REST helpers ────────────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`JSON parse error: ${body.slice(0,200)}`)); }
      });
    }).on('error', reject);
  });
}

/** Fetch all docs from a Firestore collection via REST (handles pagination) */
async function fetchCollection(colName) {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${colName}`;
  let docs = [];
  let pageToken = null;
  do {
    const url = base + `?key=${API_KEY}&pageSize=300` + (pageToken ? `&pageToken=${pageToken}` : '');
    const data = await httpsGet(url);
    if (data.error) throw new Error(`Firestore error: ${JSON.stringify(data.error)}`);
    for (const d of (data.documents || [])) {
      docs.push(firestoreDocToObject(d));
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return docs;
}

/** Convert Firestore REST document format to plain JS object */
function firestoreDocToObject(doc) {
  const id = doc.name.split('/').pop();
  const obj = { id };
  for (const [key, val] of Object.entries(doc.fields || {})) {
    obj[key] = decodeFirestoreValue(val);
  }
  return obj;
}

function decodeFirestoreValue(val) {
  if ('stringValue'  in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue'  in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue'    in val) return null;
  if ('arrayValue'   in val) return (val.arrayValue.values || []).map(decodeFirestoreValue);
  if ('mapValue'     in val) {
    const m = {};
    for (const [k,v] of Object.entries(val.mapValue.fields || {})) m[k] = decodeFirestoreValue(v);
    return m;
  }
  if ('timestampValue' in val) return val.timestampValue;
  return val;
}

// ── Grading helpers (mirrors play/[code]/page.tsx) ─────────────────────────
function getCorrectIndex(answer) {
  const lower = (answer || '').toLowerCase().trim();
  if (lower === 'true')  return 0;
  if (lower === 'false') return 1;
  return parseInt(answer, 10);
}

function simulateAnswer(q) {
  if (q.type === 'mcq') {
    const correctIdx = getCorrectIndex(q.answer);
    const optCount   = (q.options || []).length;
    if (isNaN(correctIdx) || correctIdx < 0 || correctIdx >= optCount) {
      return { pass: false, reason: `answer index "${q.answer}" out of range (${optCount} options)` };
    }
    return { pass: true, reason: null };   // player picks correctIdx → isCorrect = true
  }

  if (q.type === 'truefalse') {
    const idx = getCorrectIndex(q.answer);
    if (idx !== 0 && idx !== 1) {
      return { pass: false, reason: `truefalse answer "${q.answer}" resolves to index ${idx} — expected 0 or 1` };
    }
    return { pass: true, reason: null };
  }

  if (q.type === 'shortanswer' || q.type === 'fillinblank') {
    if (!q.answer?.trim()) {
      return { pass: false, reason: 'no answer text stored — player has nothing to match against' };
    }
    return { pass: true, reason: null };
  }

  if (q.type === 'matching' || q.type === 'ordering') {
    if (!q.answer?.trim()) {
      return { pass: false, reason: 'no answer stored' };
    }
    return { pass: true, reason: null };
  }

  return { pass: false, reason: `unknown type "${q.type}"` };
}

function explanationQuality(q) {
  const ex = (q.explanation || '').trim();
  if (!ex)            return { grade: 'MISSING',   len: 0 };
  if (ex.length < 20) return { grade: 'TOO_SHORT', len: ex.length };
  if (ex.length < 60) return { grade: 'BRIEF',     len: ex.length };
  return                     { grade: 'GOOD',      len: ex.length };
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('Fetching all questions via Firestore REST API…\n');
let questions;
try {
  questions = await fetchCollection('questions');
} catch (e) {
  console.error('FATAL:', e.message);
  process.exit(1);
}
console.log(`Total questions fetched: ${questions.length}\n`);

// ── Per-question analysis ─────────────────────────────────────────────────────
const results = questions.map(q => ({
  q,
  sim:  simulateAnswer(q),
  expl: explanationQuality(q),
}));

// ── Aggregates ────────────────────────────────────────────────────────────────
const simPass     = results.filter(r => r.sim.pass);
const simFail     = results.filter(r => !r.sim.pass);
const explMissing = results.filter(r => r.expl.grade === 'MISSING');
const explShort   = results.filter(r => r.expl.grade === 'TOO_SHORT');
const explBrief   = results.filter(r => r.expl.grade === 'BRIEF');
const explGood    = results.filter(r => r.expl.grade === 'GOOD');

const byType = {};
for (const r of results) {
  const t = r.q.type || 'unknown';
  byType[t] = byType[t] || { total: 0, simPass: 0, noExpl: 0 };
  byType[t].total++;
  if (r.sim.pass) byType[t].simPass++;
  if (r.expl.grade === 'MISSING' || r.expl.grade === 'TOO_SHORT') byType[t].noExpl++;
}

const semicolonRE = /\d;\d/;
const withSemicolon = results.filter(r =>
  semicolonRE.test(r.q.text || '') ||
  (r.q.options || []).some(o => semicolonRE.test(o || '')) ||
  semicolonRE.test(r.q.explanation || '')
);

// ── Print report ──────────────────────────────────────────────────────────────
const L = '─'.repeat(72);
const pct = (n,d) => d ? (n/d*100).toFixed(1)+'%' : 'n/a';

console.log(L);
console.log('QUIZ SIMULATION RESULTS');
console.log(L);
console.log(`  Total questions  : ${questions.length}`);
console.log(`  Simulation PASS  : ${simPass.length}  (${pct(simPass.length, questions.length)})`);
console.log(`  Simulation FAIL  : ${simFail.length}`);

console.log('');
console.log('EXPLANATION COVERAGE');
console.log(L);
console.log(`  Good  (≥60 chars): ${explGood.length.toString().padStart(4)}  (${pct(explGood.length, questions.length)})`);
console.log(`  Brief (20–59)    : ${explBrief.length.toString().padStart(4)}  (${pct(explBrief.length, questions.length)})`);
console.log(`  Too short (<20)  : ${explShort.length.toString().padStart(4)}  (${pct(explShort.length, questions.length)})`);
console.log(`  Missing entirely : ${explMissing.length.toString().padStart(4)}  (${pct(explMissing.length, questions.length)})`);

console.log('');
console.log('BY QUESTION TYPE');
console.log(L);
for (const [type, s] of Object.entries(byType).sort((a,b)=>b[1].total-a[1].total)) {
  const pr   = pct(s.simPass, s.total);
  const flag = s.noExpl > 0 ? `  ⚠ ${s.noExpl} missing/short expl` : '';
  console.log(`  ${type.padEnd(14)}: ${String(s.total).padStart(4)} questions  sim ${pr.padStart(6)} pass${flag}`);
}

if (simFail.length > 0) {
  console.log('');
  console.log(`SIMULATION FAILURES — ${simFail.length} questions where stored answer would grade WRONG`);
  console.log(L);
  for (const r of simFail) {
    const txt = (r.q.text || '').slice(0, 65).replace(/\n/g,' ');
    console.log(`  [${(r.q.type||'?').padEnd(12)}] ${r.q.topicKey || '(no topic)'}`);
    console.log(`    Q: "${txt}"`);
    console.log(`    answer="${r.q.answer}"  options=${r.q.options?.length ?? 0}`);
    console.log(`    ✖ ${r.sim.reason}`);
    console.log('');
  }
}

if (explMissing.length > 0) {
  console.log('');
  console.log(`MISSING EXPLANATIONS — ${explMissing.length} questions (grouped by topic)`);
  console.log(L);
  const byTopic = {};
  for (const r of explMissing) {
    const k = r.q.topicKey || '(none)';
    (byTopic[k] = byTopic[k] || []).push(r);
  }
  for (const [topic, rows] of Object.entries(byTopic).sort()) {
    console.log(`  ${topic} — ${rows.length} question${rows.length>1?'s':''}`);
    for (const r of rows.slice(0, 2)) {
      console.log(`    – "${(r.q.text||'').slice(0,65)}"`);
    }
    if (rows.length > 2) console.log(`    … and ${rows.length-2} more`);
  }
}

if (explShort.length > 0) {
  console.log('');
  console.log(`TOO-SHORT EXPLANATIONS — ${explShort.length} questions (under 20 chars)`);
  console.log(L);
  for (const r of explShort.slice(0, 15)) {
    console.log(`  [${r.q.topicKey}]`);
    console.log(`    Q: "${(r.q.text||'').slice(0,55)}"`);
    console.log(`    Expl: "${r.q.explanation}"`);
  }
  if (explShort.length > 15) console.log(`  … and ${explShort.length-15} more`);
}

if (withSemicolon.length > 0) {
  console.log('');
  console.log(`SEMICOLON NUMBERS STILL IN DB — ${withSemicolon.length} questions (visit /admin/db-audit to fix)`);
  console.log(L);
  for (const r of withSemicolon.slice(0, 10)) {
    console.log(`  [${r.q.topicKey}] "${(r.q.text||'').slice(0,60)}"`);
  }
  if (withSemicolon.length > 10) console.log(`  … and ${withSemicolon.length-10} more`);
}

console.log('');
console.log(L);
const overallHealth = simFail.length === 0
  ? (explMissing.length === 0 ? '✅ ALL CLEAR' : `⚠  Simulation 100% pass — ${explMissing.length} missing explanations`)
  : `❌  ${simFail.length} questions would grade incorrectly`;
console.log(`OVERALL: ${overallHealth}`);
console.log(L);
process.exit(0);
