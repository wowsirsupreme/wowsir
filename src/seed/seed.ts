/**
 * Seed script — uploads the 899 questions from questions_seed.json to Firestore.
 * Run with:  npx tsx src/seed/seed.ts
 * Requires GOOGLE_APPLICATION_CREDENTIALS or .env.local with Firebase config.
 *
 * NOTE: This uses the Firebase Admin SDK, not the client SDK.
 * Install with:  npm install -D firebase-admin
 */

import * as fs from 'fs';
import * as path from 'path';

// Load env vars from .env.local if present
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && !key.startsWith('#')) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

loadEnv();

async function main() {
  // Lazy import so TS doesn't complain if firebase-admin isn't installed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const admin = require('firebase-admin');

  if (!admin.apps.length) {
    // Use GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON,
    // OR pass serviceAccount config directly:
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require(path.resolve(serviceAccountPath));
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      // Fall back to Application Default Credentials
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
  }

  const db = admin.firestore();

  const seedPath = path.join(process.cwd(), '..', 'questions_seed.json');
  if (!fs.existsSync(seedPath)) {
    console.error('questions_seed.json not found at', seedPath);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  // questions_seed.json is an array of Question objects
  const questions: Record<string, unknown>[] = Array.isArray(raw) ? raw : raw.questions || [];

  console.log(`Seeding ${questions.length} questions…`);

  let count = 0;
  const BATCH_SIZE = 400;

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = questions.slice(i, i + BATCH_SIZE);
    for (const q of chunk) {
      const ref = db.collection('questions').doc(q.id as string || undefined);
      batch.set(ref, {
        ...q,
        approvalStatus: 'approved',
        source: 'builtin',
        createdAt: Date.now(),
      });
    }
    await batch.commit();
    count += chunk.length;
    console.log(`  Uploaded ${count}/${questions.length}`);
  }

  console.log(`✅ Seed complete — ${count} questions uploaded.`);
}

main().catch(e => { console.error(e); process.exit(1); });
