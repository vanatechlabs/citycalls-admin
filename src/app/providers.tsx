'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { restoreSession } from '@/lib/hooks/useAuth';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // Call synchronously on the client so that apiClient gets the token
  // before the first useQuery triggers.
  if (typeof window !== 'undefined') {
    restoreSession();
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
