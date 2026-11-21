import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  title: 'TourLedger — Transparent group trip accounts',
  description: 'Manage tour contributions, expenses and shared trip finances transparently.',
  applicationName: 'TourLedger',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'TourLedger' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#10243a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><PwaRegister />{children}</body></html>;
}
