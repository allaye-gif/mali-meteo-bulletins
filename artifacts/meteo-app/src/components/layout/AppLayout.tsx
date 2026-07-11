import React from 'react';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar className="w-64 flex-shrink-0 no-print" />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}
