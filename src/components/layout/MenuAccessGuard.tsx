'use client';

import { Suspense, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useMe } from '@/lib/hooks/useAuth';
import { menuKey, navItems, useRegistrationCategoryItems } from './AdminSidebar';

const REDIRECT_DELAY_MS = 2500;

interface MenuRoute {
  path: string;
  query: [string, string][];
  // Any of these keys opens the page; "<Section>::*" = any menu of the section.
  keys: string[];
}

function toRoute(url: string, keys: string[]): MenuRoute {
  const [path, search = ''] = url.split('?');
  return { path, query: [...new URLSearchParams(search).entries()], keys };
}

const underPath = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

function allows(allowed: Set<string>, keys: string[]) {
  return keys.some((key) => (key.endsWith('::*') ? [...allowed].some((a) => a.startsWith(key.slice(0, -1))) : allowed.has(key)));
}

// Admin Section → Menu Access also covers typed-in URLs: a page that belongs
// to a menu the user wasn't given shows a "no access" message and sends them
// back to the dashboard. Pages that aren't under any menu stay reachable.
function Guard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: me } = useMe();
  const registrationItems = useRegistrationCategoryItems();

  const allowed = me && me.role !== 'SUPER_ADMIN' && Array.isArray(me.menuAccess) ? new Set(me.menuAccess) : null;

  let blocked = false;
  if (allowed && pathname !== '/dashboard') {
    const routes: MenuRoute[] = [];
    for (const group of navItems) {
      const items = group.group === 'Registration Section' ? [...group.items, ...registrationItems] : group.items;
      for (const item of items) {
        if (item.alwaysVisible) continue;
        const keys = [menuKey(group.group, item.title)];
        if (item.url) routes.push(toRoute(item.url, keys));
        item.children?.forEach((child) =>
          routes.push(toRoute(child.url, item.childAccess ? [menuKey(group.group, child.title)] : keys))
        );
      }
    }
    // Registration detail / edit pages belong to the whole section.
    routes.push(toRoute('/dashboard/registrations', ['Registration Section::*']));

    // Most specific match: longest path, then the one matching more query params
    // (e.g. Beauty Services = /catalog/services?vertical=BEAUTY vs. Services).
    const owner = routes
      .filter((r) => underPath(pathname, r.path) && r.query.every(([k, v]) => searchParams.get(k) === v))
      .sort((a, b) => b.path.length - a.path.length || b.query.length - a.query.length)[0];
    blocked = !!owner && !allows(allowed, owner.keys);
  }

  useEffect(() => {
    if (!blocked) return;
    const timer = setTimeout(() => router.replace('/dashboard'), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [blocked, router]);

  if (!blocked) return <>{children}</>;
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md border-2 border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <Lock className="h-7 w-7 text-red-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">You don&apos;t have access to this page</h2>
        <p className="mt-2 text-sm text-gray-500">This menu isn&apos;t enabled for your account. Taking you back to the dashboard…</p>
        <Link href="/dashboard" className="mt-5 inline-flex bg-[#3e8914] px-5 py-2 text-sm font-bold text-white hover:bg-[#347311]">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

export function MenuAccessGuard({ children }: { children: ReactNode }) {
  return (
    // useSearchParams needs a Suspense boundary; show the page meanwhile so
    // statically rendered HTML isn't blank.
    <Suspense fallback={children}>
      <Guard>{children}</Guard>
    </Suspense>
  );
}
