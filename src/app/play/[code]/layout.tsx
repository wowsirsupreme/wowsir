import type { Metadata } from 'next';

const RTDB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

interface Props {
  params: Promise<{ code: string }>;
}

async function getSessionTitle(code: string): Promise<string | null> {
  if (!RTDB_URL) return null;
  try {
    // Look up sessionId by code
    const codeRes = await fetch(
      `${RTDB_URL}/session_codes/${code.toUpperCase()}.json`,
      { next: { revalidate: 30 } }
    );
    const sessionId: string | null = await codeRes.json();
    if (!sessionId) return null;

    // Fetch session meta for quiz title
    const metaRes = await fetch(
      `${RTDB_URL}/sessions/${sessionId}/meta/quizTitle.json`,
      { next: { revalidate: 30 } }
    );
    const title: string | null = await metaRes.json();
    return title;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const quizTitle = await getSessionTitle(code);

  const title = quizTitle
    ? `${quizTitle} — Join on WOW Sir`
    : `Join Room ${code} — WOW Sir`;

  const description = quizTitle
    ? `You've been invited to play "${quizTitle}" on WOW Sir. Enter your name to join!`
    : `You've been invited to join a live quiz on WOW Sir. Enter your name to start!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'WOW Sir',
      images: [
        {
          url: '/wowsir-logo-512.png',
          width: 512,
          height: 512,
          alt: 'WOW Sir',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: ['/wowsir-logo-512.png'],
    },
  };
}

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
