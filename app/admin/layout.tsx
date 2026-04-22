import type { ReactNode } from 'react';

export const metadata = {
  title: 'SnapShoot Admin',
  description: 'Difficulty preview admin tool'
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-auto h-screen touch-auto select-auto">
      {children}
    </div>
  );
}
