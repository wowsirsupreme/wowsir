import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join a Quiz — WOW Sir',
  description: 'Enter your room code to join a live quiz session.',
  openGraph: {
    title: 'Join a WOW Sir Quiz',
    description: 'Enter your room code to join a live quiz session.',
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
    title: 'Join a WOW Sir Quiz',
    description: 'Enter your room code to join a live quiz session.',
    images: ['/wowsir-logo-512.png'],
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
