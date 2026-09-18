'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LogOut, UserCircle, Sparkles } from 'lucide-react';
import { clearSession, useMe } from '@/lib/hooks/useAuth';
import { useBeautyMode } from '@/lib/hooks/useBeautyMode';

export function AdminNavbar() {
  const router = useRouter();
  const { data: me } = useMe();
  const { isBeautyMode, toggleBeautyMode } = useBeautyMode();

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  return (
    <header
      className={`h-12 flex items-center gap-4 px-6 border-b sticky top-0 z-10 transition-colors ${
        isBeautyMode ? 'bg-white border-pink-200 text-pink-950' : 'bg-black border-white/10 text-white'
      }`}
    >
      <SidebarTrigger className={isBeautyMode ? 'text-pink-950 hover:bg-pink-50' : 'text-white hover:bg-gray-800'} />

      <button
        onClick={toggleBeautyMode}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          isBeautyMode ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-white/10 text-white hover:bg-white/20'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Beauty Mode {isBeautyMode ? 'ON' : 'OFF'}
      </button>

      <div className="ml-auto flex items-center">
        <div className="relative group">
          <button className={`flex items-center gap-2 p-1.5 transition-colors rounded-md ${isBeautyMode ? 'text-pink-950 hover:bg-pink-50' : 'text-white hover:bg-gray-800'}`}>
            <UserCircle className="w-6 h-6" />
            <span className="text-sm font-medium pr-1">{me?.name || me?.email?.split('@')[0] || 'Admin'}</span>
          </button>

          <div className="absolute top-full right-0 pt-1 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="bg-[#111] border border-white/10 rounded-md shadow-xl py-1">
              <div className="px-4 py-3 border-b border-white/10 mb-2">
                <p className="text-sm text-white font-medium truncate">{me?.name || 'Administrator'}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{me?.email || me?.mobile}</p>
              </div>
              <div className="px-2 pb-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  <span>Logout</span>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
