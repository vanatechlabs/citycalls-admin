'use client';

import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { AdminNavbar } from './AdminNavbar';
import { BeautyModeContext, useBeautyModeState } from '@/lib/hooks/useBeautyMode';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const beautyMode = useBeautyModeState();

  return (
    <BeautyModeContext.Provider value={beautyMode}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AdminSidebar />

          <div className="flex-1 flex flex-col min-h-screen bg-gray-50/50">
            <AdminNavbar />
            <main className="flex-1 p-6 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </BeautyModeContext.Provider>
  );
}
