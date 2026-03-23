'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { I18nProvider } from '@/lib/i18n';
import { CivicSkyBackground } from '@/components/ui/civic-sky-background';
import { PersistHydrator } from '@/components/public/persist-hydrator';
import { useAuth } from '@/lib/hooks/use-auth';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mergeOnLogin } from '@/lib/services/preferences-sync';
import { useWatchlistStore } from '@/lib/stores/preferences';
import { CompareFab } from '@/components/public/compare-fab';

/** Initialize Supabase auth session on app load + merge preferences on sign-in */
function AuthInitializer() {
  const initialize = useAuth((s) => s.initialize);
  const subscribed = useRef(false);

  useEffect(() => {
    initialize().then(() => {
      // If user is already logged in on page load, sync watchlist from server
      const { isAuthenticated } = useAuth.getState();
      if (isAuthenticated) {
        useWatchlistStore.getState().syncFromServer();
      }
    });

    // Subscribe to auth state changes for cloud preference merge
    if (subscribed.current) return;
    subscribed.current = true;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Merge local preferences with cloud on sign-in
          await mergeOnLogin(session.user.id);
          // Sync watchlist from dedicated user_watchlist table
          useWatchlistStore.getState().syncFromServer();
        }
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [initialize]);

  return null;
}

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
        <AuthInitializer />
        <CivicSkyBackground />
        <PersistHydrator />
        {children}
        <CompareFab />
      </I18nProvider>
    </QueryClientProvider>
  );
}
