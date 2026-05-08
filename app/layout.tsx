import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getAssetPath } from '@/../src/utils/assetPath';

const iconPath = getAssetPath('/icon.svg');

export const metadata: Metadata = {
  title: 'Garb Football',
  description: 'Garb Football',
  icons: {
    icon: iconPath,
    apple: iconPath,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Garb Football',
  },
  formatDetection: {
    telephone: false,
  },
};

/** Full-screen safe-area correct framing on phones / notches (viewport-fit=cover). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b1220',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
