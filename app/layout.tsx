import type { Metadata } from 'next';
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
