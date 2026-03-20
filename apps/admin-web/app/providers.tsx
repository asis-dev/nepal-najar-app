'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { I18nProvider } from '@/lib/i18n';
import { CivicSkyBackground } from '@/components/ui/civic-sky-background';
import { PersistHydrator } from '@/components/public/persist-hydrator';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <CivicSkyBackground />
        <PersistHydrator />
        {children}
      </I18nProvider>
    </QueryClientProvider>
  );
}
