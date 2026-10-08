# WOW Sir — Assessment Platform

> A production-quality quiz & assessment platform built for DPS International Ghana — Grade 7 Computer Science.

**Live demo flow:** Students join via session code on any device → teacher hosts a live quiz → real-time leaderboard → results exported to CSV.

---

## Features

| Mode | Description |
|---|---|
| **Live Quiz** | Teacher-hosted, class joins by 6-char code, real-time scoring |
| **Hot Seat** | Solo challenge — 10 questions, 15s timer, streak multiplier |
| **Battle** | 1v1 vs a classmate or AI opponent (easy / medium / hard) |
| **Question Bank** | 899 built-in questions across 10 CS topics, import via CSV |

**Anti-cheat:** Tab-switch detection, reported live to teacher dashboard.  
**Zero-friction classroom:** Share a `?fb=<base64>` link — Firebase connects automatically on every device.

---

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Firebase RTDB** — live session bus (<100ms latency)
- **Firestore** — question bank, quizzes, results
- **Firebase Auth** — email/password for teachers, anonymous for students
- **Tailwind CSS v4** — CSS-based config, custom design system
- **Cloudinary** — image uploads in question builder (optional)

---

## Setup

### 1. Clone & install

```bash
git clone <your-repo>
cd wow-platform
npm install
```

### 2. Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a project (or use an existing one)
3. Enable **Authentication** → Email/Password
4. Enable **Realtime Database** — start in test mode, then apply `database.rules.json`
5. Enable **Firestore** — start in test mode, then apply `firestore.rules`
6. Add a **Web app** — copy the config

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with your Firebase config:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 4. Seed questions (optional)

If you have the `questions_seed.json` file:

```bash
npm install -D firebase-admin
# Set FIREBASE_SERVICE_ACCOUNT_PATH to your service account JSON, then:
npx tsx src/seed/seed.ts
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Set the same environment variables in **Vercel → Project → Settings → Environment Variables**.

### Firebase security rules

After deploying, apply security rules:

**Firestore** — `firestore.rules`:
```bash
firebase deploy --only firestore:rules
```

**Realtime Database** — `database.rules.json`:
```bash
firebase deploy --only database
```

---

## Admin Panel

Access hidden admin panel by:
- Tapping the logo **5 times quickly** on the home screen, OR
- Adding `?admin=1` to the URL

Default password: `wowadmin2024`

From admin panel you can:
- Enter / change Firebase config
- Generate a shareable classroom link (`?fb=<base64>`)
- Change the admin password

---

## Classroom Quick Start

1. Teacher opens `/teacher`, logs in (or registers)
2. Teacher selects a quiz → **Host**
3. Students open the link on their phones → **Join Game** → enter 6-char code
4. Teacher clicks **Start** when everyone has joined
5. Live leaderboard updates after each question
6. Session ends → teacher can **Export Results** to CSV

---

## Topics Covered

| Key | Topic |
|---|---|
| `hardware` | Computer Hardware |
| `software` | Software & OS |
| `networks` | Networking & Internet |
| `programming` | Programming Basics |
| `data` | Data & Databases |
| `security` | Cybersecurity |
| `html-basics` | HTML Fundamentals |
| `css-styling` | CSS Styling |
| `web-dev` | Web Development |
| `digital-literacy` | Digital Literacy |

---

## Project Structure

```
src/
  app/                   # Next.js App Router pages
    page.tsx             # Landing (Join / Teacher / Battle / Hot Seat)
    join/page.tsx        # Student join flow
    play/[code]/         # Student play view
    teacher/             # Teacher dashboard & tools
      page.tsx           # Auth + dashboard
      host/[id]/         # Live host view
      quiz/new/          # Quiz builder
      library/           # Question bank
      import/            # CSV import
      results/           # Results list + detail
    battle/page.tsx      # 1v1 battle mode
    hotseat/page.tsx     # Solo hot seat mode
  components/
    admin/AdminPanel.tsx # Hidden admin config panel
    quiz/                # QuestionCard, TimerRing, Leaderboard, ScoreBar
    ui/                  # Avatar, Button, Card, Modal, Toast
  lib/
    firebase/            # config, auth, sessions, questions, quizzes
    import/csv-parser.ts # CSV → Question pipeline
    utils.ts             # cn(), uid(), calcTimeBonus()
  types/                 # TypeScript interfaces
  seed/seed.ts           # Firestore seed script
```

---

## License

Built for DPSI Ghana · Grade 7 Computer Science · 2024
