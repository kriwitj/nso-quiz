'use client';
import { useState } from 'react';
import { DashboardSidebar } from './dashboard-sidebar';
import { DashboardHeader } from './dashboard-header';

interface Props {
  user: {
    name: string;
    email: string;
    image?: string;
    role: string;
  };
  children: React.ReactNode;
}

export function AuthShell({ user, children }: Props) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <DashboardHeader
          user={user}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
