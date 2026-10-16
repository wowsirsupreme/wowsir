import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { MusicProvider } from '@/contexts/MusicContext';

export const metadata: Metadata = {
  title: 'WOW Sir — DPS International Ghana',
  description: 'Grades 4–11 Computer Science Assessment Platform',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/wowsir-logo.svg', type: 'image/svg+xml' },
    ],
    apple: '/wowsir-logo-512.png',
  },
  openGraph: {
    title: 'WOW Sir',
    description: 'Grades 4–11 Computer Science Assessment Platform',
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
    title: 'WOW Sir',
    description: 'Grades 4–11 Computer Science Assessment Platform',
    images: ['/wowsir-logo-512.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MusicProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </MusicProvider>
      </body>
    </html>
  );
}
