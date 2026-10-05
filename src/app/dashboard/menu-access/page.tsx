'use client';

import { useMemo, useState } from 'react';
import { CheckSquare, Info, ListChecks, Save, Search, ShieldCheck, Square, UserRound } from 'lucide-react';
import Swal from 'sweetalert2';

import { menuKey, navItems, useRegistrationCategoryItems } from '@/components/layout/AdminSidebar';
import { useMe } from '@/lib/hooks/useAuth';
import { User, useUpdateMenuAccess, useUsers } from '@/lib/hooks/useUsers';

const LABEL = 'mb-1 block text-xs font-bold uppercase text-gray-500';
const INPUT = 'w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]';
const CARD_TITLE = 'mb-4 flex items-center gap-2 text-lg font-bold text-[#DE802B]';

// SUPER_ADMIN → "Super Admin"
const formatRole = (role: string) => role.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function showToast(icon: 'success' | 'error' | 'warning', title: string) {
  void Swal.fire({ toast: true, position: 'top-end', icon, title, timer: 2200, showConfirmButton: false });
}

type Mode = 'ALL' | 'SELECTED';

// Menu picker for one user; keyed by user id + their saved list, so picking
// another user (or saving) starts from that user's saved state.
function MenuPicker({ user, sections }: { user: User; sections: { group: string; items: { key: string; title: string; locked: boolean }[] }[] }) {
  const saved = user.menuAccess;
  const [mode, setMode] = useState<Mode>(Array.isArray(saved) ? 'SELECTED' : 'ALL');
  const [selected, setSelected] = useState<Set<string>>(new Set(saved ?? sections.flatMap((s) => s.items.map((i) => i.key))));
  const updateAccess = useUpdateMenuAccess();
  const allKeys = sections.flatMap((s) => s.items.filter((i) => !i.locked).map((i) => i.key));
  const chosenCount = allKeys.filter((k) => selected.has(k)).length;

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setMany(keys: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
      return next;
    });
  }

  async function save() {
    try {
      await updateAccess.mutateAsync({ id: user._id, menuAccess: mode === 'ALL' ? null : allKeys.filter((k) => selected.has(k)) });
      showToast('success', `Menu access saved for ${user.name}`);
    } catch {
      showToast('error', 'Could not save menu access');
    }
  }

  return (
    <div className="border-2 border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b bg-[#233D4D] px-6 py-4 md:flex-row md:items-center md:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <ListChecks className="h-5 w-5 text-[#DE802B]" /> Menus for {user.name}
          <span className="rounded bg-white/15 px-2 py-0.5 text-[11px] font-bold uppercase text-white/80">{formatRole(user.role)}</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'SELECTED'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${mode === m ? 'bg-[#DE802B] text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {m === 'ALL' ? 'All Menus (no limit)' : 'Only Selected Menus'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {mode === 'ALL' ? (
          <div className="flex gap-3 border border-blue-100 bg-blue-50 p-4">
            <Info className="h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-[11px] font-bold uppercase leading-relaxed text-blue-700">
              {user.name} sees every menu their role ({formatRole(user.role)}) allows. Switch to &quot;Only Selected Menus&quot; to pick menus.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-gray-600">
                <span className="text-[#3e8914]">{chosenCount}</span> of {allKeys.length} menus selected
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMany(allKeys, true)} className="border-2 border-[#3e8914]/40 px-3 py-1 text-[11px] font-bold text-[#3e8914] hover:bg-[#3e8914]/5">
                  Select All
                </button>
                <button type="button" onClick={() => setMany(allKeys, false)} className="border-2 border-gray-300 px-3 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-50">
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sections.map((section) => {
                const keys = section.items.filter((i) => !i.locked).map((i) => i.key);
                const onCount = keys.filter((k) => selected.has(k)).length;
                const allOn = keys.length > 0 && onCount === keys.length;
                return (
                  <div key={section.group} className="border-2 border-[#233D4D]/20 bg-[#F7F9FB]">
                    <button
                      type="button"
                      onClick={() => setMany(keys, !allOn)}
                      disabled={keys.length === 0}
                      className="flex w-full items-center justify-between gap-2 border-b-2 border-[#DE802B] bg-[#233D4D] px-3 py-2 text-left"
                    >
                      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-white">
                        {allOn ? <CheckSquare className="h-4 w-4 text-[#DE802B]" /> : <Square className={`h-4 w-4 ${onCount ? 'text-[#DE802B]' : 'text-white/50'}`} />}
                        {section.group}
                      </span>
                      <span className="rounded bg-[#DE802B] px-1.5 py-0.5 text-[10px] font-bold text-white">{onCount}/{keys.length}</span>
                    </button>
                    <ul className="space-y-1 p-3">
                      {section.items.map((item) => (
                        <li key={item.key}>
                          <label className={`flex items-center gap-2 text-[13px] font-semibold ${item.locked ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-800'}`}>
                            <input
                              type="checkbox"
                              checked={item.locked || selected.has(item.key)}
                              disabled={item.locked}
                              onChange={() => toggle(item.key)}
                              className="h-4 w-4 accent-[#3e8914]"
                            />
                            {item.title}
                            {item.locked && <span className="text-[10px] font-bold uppercase text-gray-400">(always shown)</span>}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => void save()}
          disabled={updateAccess.isPending}
          className="mt-6 flex w-full items-center justify-center gap-2 bg-[#4B1426] py-2.5 font-bold text-white transition-colors hover:bg-[#3a0f1d] disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {updateAccess.isPending ? 'Saving...' : 'Save Menu Access'}
        </button>
      </div>
    </div>
  );
}

export default function MenuAccessPage() {
  const { data: me } = useMe();
  const { data: users = [], isLoading } = useUsers();
  const registrationCategoryItems = useRegistrationCategoryItems();
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');

  // Every sidebar section and its menus (incl. the Registration categories
  // from Navbar List). "Always shown" menus can't be turned off.
  const sections = useMemo(
    () =>
      navItems.map((group) => ({
        group: group.group,
        // A dropdown like "Manage Admin User" lists each of its sub-menus separately.
        items: [...group.items, ...(group.group === 'Registration Section' ? registrationCategoryItems : [])].flatMap((item) =>
          item.childAccess
            ? (item.children ?? []).map((child) => ({ key: menuKey(group.group, child.title), title: child.title, locked: false }))
            : [{ key: menuKey(group.group, item.title), title: item.title, locked: !!item.alwaysVisible }]
        ),
      })),
    [registrationCategoryItems]
  );

  const filteredUsers = users.filter((u) => `${u.name} ${u.role} ${u.mobile}`.toLowerCase().includes(search.trim().toLowerCase()));
  const selectedUser = users.find((u) => u._id === selectedId);

  if (me && me.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm font-bold text-red-600">
        Only Super Admin can manage menu access.
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="min-h-screen bg-white p-6 shadow-md">
        <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
          <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">Menu Access</h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">
            Choose which sidebar sections and menus each user sees. Pages they can open still follow their role&apos;s permissions.
          </p>
        </div>

        <div style={{ zoom: 0.75 }}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Users */}
            <div className="lg:col-span-1">
              <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
                <h2 className={CARD_TITLE}><UserRound className="h-5 w-5" /> Select User</h2>
                <label className={LABEL}>Search</label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, role or mobile" className={`${INPUT} pl-9`} />
                </div>
                <ul className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto border-2 border-gray-200">
                  {isLoading ? (
                    <li className="p-4 text-center text-sm text-gray-400">Loading users...</li>
                  ) : filteredUsers.length === 0 ? (
                    <li className="p-4 text-center text-sm text-gray-400">No users found.</li>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSuper = u.role === 'SUPER_ADMIN';
                      return (
                        <li key={u._id}>
                          <button
                            type="button"
                            disabled={isSuper}
                            onClick={() => setSelectedId(u._id)}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors ${
                              selectedId === u._id ? 'bg-blue-50' : isSuper ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50'
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-bold text-[#4B1426]">{u.name}</span>
                              <span className="block text-[11px] font-bold uppercase text-[#6c7587]">{formatRole(u.role)}</span>
                            </span>
                            <span className={`shrink-0 border px-2 py-0.5 text-[10px] font-bold uppercase ${
                              isSuper
                                ? 'border-purple-200 bg-purple-50 text-purple-700'
                                : Array.isArray(u.menuAccess)
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-green-200 bg-green-50 text-green-700'
                            }`}>
                              {isSuper ? 'Full access' : Array.isArray(u.menuAccess) ? `${u.menuAccess.length} menus` : 'All menus'}
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
                <div className="mt-4 flex gap-3 border border-blue-100 bg-blue-50 p-4">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600" />
                  <p className="text-[10px] font-bold uppercase leading-relaxed text-blue-700">
                    Super Admin always sees every menu. Dashboard is always shown.
                  </p>
                </div>
              </div>
            </div>

            {/* Menus */}
            <div className="lg:col-span-2">
              {selectedUser ? (
                <MenuPicker key={`${selectedUser._id}-${(selectedUser.menuAccess ?? ['*']).join('|')}`} user={selectedUser} sections={sections} />
              ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm font-bold text-gray-400">
                  Select a user on the left to choose their menus.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
