'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'citycalls_beauty_mode';

interface BeautyModeContextValue {
  isBeautyMode: boolean;
  toggleBeautyMode: () => void;
}

export const BeautyModeContext = createContext<BeautyModeContextValue | null>(null);

// Persisted the same way as the access token (localStorage) so the toggle
// survives a refresh — matches the pattern in useAuth.ts's restoreSession().
export function useBeautyModeState(): BeautyModeContextValue {
  const [isBeautyMode, setIsBeautyMode] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === 'true');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.documentElement.classList.toggle('beauty', isBeautyMode);
    window.localStorage.setItem(STORAGE_KEY, String(isBeautyMode));
  }, [isBeautyMode]);

  return { isBeautyMode, toggleBeautyMode: () => setIsBeautyMode((v) => !v) };
}

export function useBeautyMode(): BeautyModeContextValue {
  const ctx = useContext(BeautyModeContext);
  if (!ctx) throw new Error('useBeautyMode must be used within a BeautyModeProvider');
  return ctx;
}
