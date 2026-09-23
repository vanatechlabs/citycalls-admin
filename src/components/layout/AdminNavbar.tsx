'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LogOut, UserCircle, Sparkles, ChevronDown, HelpCircle, BellRing, Bell, CheckCheck } from 'lucide-react';
import { clearSession, useMe } from '@/lib/hooks/useAuth';
import { useBeautyMode } from '@/lib/hooks/useBeautyMode';
import { useNotifications, useUnreadCount, useMarkNotificationRead } from '@/lib/hooks/useNotifications';

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AdminNavbar() {
  const router = useRouter();
  const { data: me } = useMe();
  const { isBeautyMode, toggleBeautyMode } = useBeautyMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);

  const { data: unreadCount } = useUnreadCount();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const displayName = me?.name || me?.email?.split('@')[0] || 'Admin';
  const displayRole = me?.role
    ? me.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Admin';

  const iconBtnClass = isBeautyMode
    ? 'p-2 rounded-lg hover:bg-pink-50 transition-all duration-200 hover:scale-105'
    : 'p-2 rounded-lg hover:bg-[#3e8914]/10 transition-all duration-200 hover:scale-105';
  const iconColorClass = isBeautyMode ? 'text-pink-500' : 'text-black';
  const bellBadgeCount = unreadCount && unreadCount > 0 ? unreadCount : 3;

  return (
    <header
      className={`relative z-30 flex h-[62px] shrink-0 items-center gap-4 px-4 sm:px-6 border-b transition-colors ${
        isBeautyMode
          ? 'bg-white border-pink-200 text-pink-950'
          : 'bg-white/90 backdrop-blur-xl border-slate-200/80 text-slate-800 shadow-xs'
      }`}
    >
      <SidebarTrigger className={isBeautyMode ? 'text-pink-950 hover:bg-pink-50' : 'text-slate-600 hover:bg-slate-900/5'} />

      <button
        onClick={toggleBeautyMode}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          isBeautyMode ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-[#EFF6FF] text-[#0F2854] hover:bg-[#DBEAFE]'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Beauty Mode {isBeautyMode ? 'ON' : 'OFF'}
      </button>

      <div className="ml-auto flex items-center gap-2 sm:gap-3 relative">
        {/* Help & Support */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveTitle(activeTitle === 'help' ? null : 'help')}
            className={iconBtnClass}
            title="Help & Support"
          >
            <HelpCircle size={18} className={iconColorClass} />
          </button>
          {activeTitle === 'help' && (
            <div className="whitespace-nowrap absolute top-12 right-0 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg z-50">
              Help &amp; Support
              <div className="absolute -top-1 right-2 w-2 h-2 bg-slate-900 rotate-45" />
            </div>
          )}
        </div>

        {/* Reminder List */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveTitle(activeTitle === 'reminder' ? null : 'reminder')}
            className={iconBtnClass}
            title="Reminder List"
          >
            <BellRing size={18} className={iconColorClass} />
          </button>
          {activeTitle === 'reminder' && (
            <div className="whitespace-nowrap absolute top-12 right-0 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg z-50">
              Reminder List
              <div className="absolute -top-1 right-2 w-2 h-2 bg-slate-900 rotate-45" />
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setActiveTitle(null);
              setNotifOpen((v) => !v);
            }}
            className={`relative ${iconBtnClass}`}
            title="Notifications"
          >
            <Bell size={18} className={iconColorClass} />
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-semibold shadow-lg">
              {bellBadgeCount > 9 ? '9+' : bellBadgeCount}
            </span>
          </button>

          {notifOpen && (
            <>
              <button
                type="button"
                aria-label="Close notifications"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setNotifOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-900">Notifications</p>
                  {!!unreadCount && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#3e8914]">
                      <CheckCheck className="h-3 w-3" />
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div className="max-h-[24rem] overflow-y-auto">
                  {!notifications || notifications.length === 0 ? (
                    <p className="px-3 py-4 text-xs font-medium text-slate-500">Nothing new right now.</p>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <button
                        type="button"
                        key={n._id}
                        onClick={() => {
                          if (!n.readAt) markRead.mutate(n._id);
                        }}
                        className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-xs transition-colors hover:bg-slate-900/5 ${!n.readAt ? 'bg-[#3e8914]/5' : ''}`}
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3e8914]/10 text-[#3e8914]">
                          <Bell className="h-3 w-3" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-slate-900 truncate">{n.subject || n.triggerKey.replace(/_/g, ' ')}</span>
                          <span className="block truncate text-[11px] font-medium text-slate-500">{n.body}</span>
                          <span className="mt-0.5 block text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
                        </span>
                        {!n.readAt && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3e8914]" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* PROFILE */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`relative flex items-center gap-2 p-1 sm:pr-3 rounded-full transition-all duration-200 ${
              isBeautyMode
                ? 'bg-white border-2 border-pink-200 hover:bg-pink-50'
                : 'bg-white border-2 border-slate-300 shadow-xs hover:bg-slate-50'
            }`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 flex-shrink-0 flex items-center justify-center shadow-xs bg-white ${
                  isBeautyMode ? 'border-pink-200' : 'border-slate-200'
                }`}
              >
                {isBeautyMode ? (
                  <UserCircle className="w-6 h-6 text-pink-400" />
                ) : (
                  <DotLottieReact
                    src="https://lottie.host/b43fbb7e-5f4c-420a-b516-1e9cd26810ec/gf22SDhjCv.lottie"
                    loop
                    autoplay
                    style={{ width: '100%', height: '100%', transform: 'scale(1.3)' }}
                  />
                )}
              </div>
              {/* Online status dot */}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-white rounded-full z-10 flex items-center justify-center">
                <div className="absolute inset-0 w-full h-full bg-green-500 rounded-full animate-ping opacity-75" />
              </div>
            </div>

            {/* Name / role */}
            <div className="hidden sm:flex flex-col text-left leading-none ml-1">
              <span className={`text-[12px] font-bold ${isBeautyMode ? 'text-pink-950' : 'text-slate-800'}`}>{displayName}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${isBeautyMode ? 'text-pink-500' : 'text-[#4B1426]'}`}>
                {displayRole}
              </span>
            </div>

            <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close profile menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div className="whitespace-nowrap absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden z-50">
                <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                  <p className="text-[10px] text-slate-500 font-medium">Admin Panel</p>
                  <p className="text-[12px] font-bold text-slate-800 truncate">{displayName}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{me?.email || me?.mobile}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors duration-150"
                >
                  <LogOut size={14} />
                  <span className="font-semibold">Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
