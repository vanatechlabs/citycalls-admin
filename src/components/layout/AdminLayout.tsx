'use client';

import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { AdminNavbar } from './AdminNavbar';
import { MenuAccessGuard } from './MenuAccessGuard';
import { RegistrationNotifier } from '@/components/registrations/notifications/RegistrationNotifier';
import { ServerExpiryNotifier } from '@/components/server-assets/ServerExpiryNotifier';
import { BeautyModeContext, useBeautyModeState } from '@/lib/hooks/useBeautyMode';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const beautyMode = useBeautyModeState();

  return (
    <BeautyModeContext.Provider value={beautyMode}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AdminSidebar />

          {/* min-w-0: without it this flex column grows to fit its widest child,
              so a wide table pushed the whole page sideways instead of
              scrolling inside its own box. */}
          <div className="flex-1 flex flex-col min-h-screen min-w-0 bg-gray-100">
            <AdminNavbar />
            <main className="flex-1 p-6 overflow-auto">
              {/* Pages behind menus hidden by Menu Access can't be opened by URL either */}
              <MenuAccessGuard>{children}</MenuAccessGuard>
            </main>
          </div>
        </div>
        {/* New-registration popup + chime, on every admin page */}
        <RegistrationNotifier />
        {/* Domain / hosting renewal reminders */}
        <ServerExpiryNotifier />
      </SidebarProvider>
    </BeautyModeContext.Provider>
  );
}
