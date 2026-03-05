'use client';

import { ReactNode } from 'react';

import { ActionMenu } from '@/components/ActionMenu';
import { AiAssistant } from '@/components/AiAssistant';
import { SidebarNav } from '@/components/SidebarNav';
import { TopHeader } from '@/components/TopHeader';

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="appShell">
      <SidebarNav />
      <main className="mainArea">
        <TopHeader />
        {children}
      </main>
      <ActionMenu />
      <AiAssistant />
    </div>
  );
}
