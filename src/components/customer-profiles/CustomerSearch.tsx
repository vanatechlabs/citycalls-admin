'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight, Loader2, PhoneIncoming, Search, UserPlus, X } from 'lucide-react';

import { usePermission } from '@/lib/hooks/useAuth';
import {
  CUSTOMER_KIND_META, CustomerSearchResult, customerProfilePath, useCustomerSearch, useDebouncedValue,
} from '@/lib/hooks/useCustomerProfiles';

// Admin top bar: find a customer by mobile, name, email, CityCalls ID or a
// Service Call / Call Enquiry number, and open their profile. Waits for
// typing to pause (300 ms) before searching and cancels the previous
// request. Nothing found → offers to note them as a new Call Enquiry.

// Avatar colour by customer type.
const AVATAR_TONE = {
  NEW: 'border-slate-200 bg-slate-50 text-slate-500',
  FIRST_TIME: 'border-blue-200 bg-blue-50 text-blue-700',
  REPEAT: 'border-green-200 bg-green-50 text-[#2f6b0f]',
  LOYAL: 'border-amber-200 bg-amber-50 text-amber-700',
} as const;

// "vansh chaudhary" → "VC"
const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('') || '?';

// What the "new customer" link can pre-fill from the search text.
function prefillFor(text: string): Record<string, string> {
  const digits = text.replace(/\D/g, '');
  const mobile = digits.length >= 10 ? digits.slice(-10) : '';
  if (/^[6-9]\d{9}$/.test(mobile) && digits.length <= 12) return { phone: mobile };
  if (/^[a-z][a-z .'-]{1,}$/i.test(text.trim())) return { name: text.trim() };
  return {};
}

export function CustomerSearch() {
  const router = useRouter();
  const canView = usePermission('customers', 'view');
  const canCreate = usePermission('customers', 'create');
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debounced = useDebouncedValue(text, 300);
  const query = debounced.trim();
  const { data: results = [], isFetching, isError } = useCustomerSearch(query, canView);
  const typing = text.trim() !== query;
  const searching = query.length >= 2 && (typing || isFetching);
  const showResults = query.length >= 2 && text.trim().length >= 2;

  // Ctrl / ⌘ + K jumps to the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMobileOpen(true);
        setOpen(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Click outside closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!canView) return null;

  const close = () => {
    setOpen(false);
    setMobileOpen(false);
    inputRef.current?.blur();
  };
  const go = (href: string) => {
    close();
    setText('');
    router.push(href);
  };
  const openCustomer = (c: CustomerSearchResult) => go(customerProfilePath(c.customerCode));

  const prefill = new URLSearchParams(prefillFor(query)).toString();
  const newEnquiryHref = `/dashboard/call-enquiries/add${prefill ? `?${prefill}` : ''}`;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') return close();
    if (!showResults) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active] && !typing) openCustomer(results[active]);
      else if (!searching && results.length === 0 && canCreate) go(newEnquiryHref);
    }
  };

  return (
    // Same look as the Arogya admin's top-bar search — a pill that widens
    // while in use — in CityCalls green.
    <div ref={boxRef} className={`relative transition-[width] duration-300 ease-out ${open ? 'md:w-[420px]' : 'md:w-[340px]'} md:max-w-full`}>
      {/* Phones: an icon that opens the box over the top bar */}
      <button
        type="button"
        onClick={() => { setMobileOpen(true); setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="rounded-lg p-2 text-slate-700 transition hover:bg-[#3e8914]/10 md:hidden"
        aria-label="Search customer"
      >
        <Search size={18} />
      </button>

      <div
        className={`${mobileOpen ? 'fixed inset-x-3 top-3 z-50 flex shadow-lg' : 'hidden'} items-center gap-2 rounded-full border-2 bg-white pl-3 pr-2 shadow-sm transition-all duration-300 md:static md:flex ${
          open ? 'border-[#3e8914] ring-4 ring-[#3e8914]/10' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {searching ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#3e8914]" /> : <Search className={`h-4 w-4 shrink-0 transition-colors ${open ? 'text-[#3e8914]' : 'text-slate-500'}`} />}
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value.slice(0, 100)); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search mobile, name, CC ID, Reg No…"
          aria-label="Search customer"
          aria-expanded={open && showResults}
          aria-controls="customer-search-results"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          className="h-8 min-w-0 flex-1 bg-transparent text-[13px] font-medium text-slate-700 outline-none placeholder:text-slate-400"
        />
        {text ? (
          <button type="button" onClick={() => { setText(''); inputRef.current?.focus(); }} className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Clear search">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[9px] font-bold text-slate-400 lg:block">Ctrl K</kbd>
        )}
      </div>

      {open && (
        <div
          id="customer-search-results"
          role="listbox"
          className={`absolute z-50 mt-1.5 overflow-hidden border border-slate-200 bg-white shadow-[0_16px_40px_-12px_rgba(15,23,42,0.28)] animate-in fade-in slide-in-from-top-1 duration-200 ${
            mobileOpen ? 'fixed inset-x-3 top-[60px] md:absolute md:inset-x-auto md:top-auto' : ''
          } md:left-0 md:w-[min(460px,90vw)]`}
        >
          {!showResults ? (
            <p className="px-4 py-3 text-[11.5px] font-medium text-slate-500">
              Type at least 2 characters — mobile number, name, email, CityCalls ID (CC-000123) or Reg No.
            </p>
          ) : isError ? (
            <p className="px-4 py-3 text-[11.5px] font-semibold text-red-600">Could not search right now — please try again.</p>
          ) : results.length === 0 ? (
            searching ? (
              <p className="flex items-center gap-2 px-4 py-3 text-[11.5px] font-medium text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…</p>
            ) : (
              <div className="px-4 py-4">
                <p className="text-[12px] font-bold text-slate-800">No customer found for “{query}”</p>
                <p className="mt-0.5 text-[11px] text-slate-500">This looks like a new customer — note their call to start their profile.</p>
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => go(newEnquiryHref)}
                    className="mt-2.5 inline-flex items-center gap-1.5 bg-[#3e8914] px-2.5 py-1 text-[10.5px] font-semibold text-white shadow-sm transition hover:bg-[#347311]"
                  >
                    <UserPlus className="h-3 w-3" /> Add as New Call Enquiry
                  </button>
                )}
              </div>
            )
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5">
                <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Customers</span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                  {searching && <Loader2 className="h-3 w-3 animate-spin" />}
                  {results.length} found
                </span>
              </div>
              <ul className={`max-h-[min(60vh,380px)] overflow-y-auto py-1 transition-opacity ${typing ? 'opacity-60' : ''}`}>
                {results.map((c, index) => {
                  const kind = CUSTOMER_KIND_META[c.kind];
                  const isActive = index === active;
                  const enquiries = c.stats.enquiries + c.stats.webEnquiries;
                  // Only worth showing when it wasn't the name / mobile they typed.
                  const viaNumber = /^(Reg No|Enquiry) /.test(c.matchedOn) ? c.matchedOn : '';
                  return (
                    <li key={c.customerCode} role="option" aria-selected={isActive}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(index)}
                        onClick={() => openCustomer(c)}
                        title={`${kind.label} customer · matched on ${c.matchedOn}`}
                        className={`relative flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${isActive ? 'bg-slate-50' : ''}`}
                      >
                        <span className={`absolute inset-y-1 left-0 w-[2px] rounded-full bg-[#3e8914] transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center border text-[10.5px] font-bold uppercase ${AVATAR_TONE[c.kind]}`}>
                          {initialsOf(c.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-baseline gap-1.5">
                            <span className="max-w-[60%] shrink-0 truncate text-[12px] font-semibold capitalize text-slate-900">{c.name}</span>
                            <span className="shrink-0 font-mono text-[9.5px] font-bold text-[#3e8914]">{c.customerCode}</span>
                            {viaNumber && <span className="min-w-0 truncate text-[9.5px] font-medium text-slate-400">· {viaNumber}</span>}
                          </span>
                          <span className="block truncate text-[10.5px] text-slate-500">
                            {c.phone}{c.email ? ` · ${c.email}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 text-right leading-tight">
                          <span className="block text-[11px] font-semibold text-slate-800">
                            {c.stats.services} <span className="font-normal text-slate-500">service{c.stats.services === 1 ? '' : 's'}</span>
                          </span>
                          <span className="block text-[9.5px] text-slate-400">
                            {c.stats.reopens > 0 && <span className="font-semibold text-red-600">{c.stats.reopens} reopen{c.stats.reopens === 1 ? '' : 's'}</span>}
                            {c.stats.reopens > 0 && enquiries > 0 && ' · '}
                            {enquiries > 0 && `${enquiries} enq.`}
                            {c.stats.reopens === 0 && enquiries === 0 && kind.label}
                          </span>
                        </span>
                        <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-slate-300 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/70 px-3 py-1.5">
                <span className="hidden items-center gap-1 text-[9.5px] text-slate-400 sm:flex">
                  <kbd className="rounded border border-slate-200 bg-white px-1 font-sans text-[9px]">↑↓</kbd> move
                  <kbd className="ml-1 rounded border border-slate-200 bg-white px-1 font-sans text-[9px]">↵</kbd> open
                  <kbd className="ml-1 rounded border border-slate-200 bg-white px-1 font-sans text-[9px]">esc</kbd> close
                </span>
                <Link
                  href={`/dashboard/customer-profiles?q=${encodeURIComponent(query)}`}
                  onClick={close}
                  className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#2f6b0f] hover:underline"
                >
                  All results <ArrowRight className="h-3 w-3" />
                </Link>
                {canCreate && (
                  <Link href={newEnquiryHref} onClick={close} className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-600 hover:underline">
                    <PhoneIncoming className="h-3 w-3" /> New enquiry
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
