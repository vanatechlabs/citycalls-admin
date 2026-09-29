// Where the login tokens live in the browser. "Remember me" logins use
// localStorage (survives a browser restart); unticked ones use sessionStorage
// (cleared when the browser closes). A refreshed pair is written back to
// whichever storage the session started in.

export const ACCESS_TOKEN_KEY = 'citycalls_access_token';
export const REFRESH_TOKEN_KEY = 'citycalls_refresh_token';

function browserStorages(): Storage[] {
  if (typeof window === 'undefined') return [];
  return [window.localStorage, window.sessionStorage];
}

function storageHoldingSession(): Storage | undefined {
  return browserStorages().find((s) => s.getItem(REFRESH_TOKEN_KEY) || s.getItem(ACCESS_TOKEN_KEY));
}

export function getStoredAccessToken(): string | null {
  const storage = storageHoldingSession();
  return storage?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function getStoredRefreshToken(): string | null {
  const storage = storageHoldingSession();
  return storage?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export function saveTokens(accessToken: string, refreshToken: string, storage?: Storage): void {
  const target = storage ?? storageHoldingSession() ?? browserStorages()[0];
  if (!target) return;
  target.setItem(ACCESS_TOKEN_KEY, accessToken);
  target.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearStoredTokens(): void {
  for (const storage of browserStorages()) {
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(REFRESH_TOKEN_KEY);
  }
}
