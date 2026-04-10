'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { I18nProvider } from '@/lib/i18n';
import { PersistHydrator } from '@/components/public/persist-hydrator';
import { useAuth } from '@/lib/hooks/use-auth';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mergeOnLogin } from '@/lib/services/preferences-sync';
import { useWatchlistStore, useUserPreferencesStore } from '@/lib/stores/preferences';
import { CompareFab } from '@/components/public/compare-fab';
import { OnboardingGate } from '@/components/public/onboarding/onboarding-gate';
import { OnboardingChecklist } from '@/components/public/onboarding/onboarding-checklist';
import { OfflineIndicator } from '@/components/public/services/offline-indicator';

/** Initialize Supabase auth session on app load + merge preferences on sign-in */
function AuthInitializer() {
  const initialize = useAuth((s) => s.initialize);
  const subscribed = useRef(false);

  const defer = (task: () => Promise<void> | void) => {
    setTimeout(() => {
      void Promise.resolve(task()).catch(() => {});
    }, 0);
  };

  useEffect(() => {
    initialize().then(() => {
      // If user is already logged in on page load, sync from server
      const { isAuthenticated } = useAuth.getState();
      if (isAuthenticated) {
        defer(async () => {
          await Promise.allSettled([
            useWatchlistStore.getState().syncFromServer(),
            useUserPreferencesStore.getState().syncFromServer(),
          ]);
        });
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
          defer(async () => {
            await Promise.allSettled([
              mergeOnLogin(session.user.id),
              useWatchlistStore.getState().syncFromServer(),
              useUserPreferencesStore.getState().syncFromServer(),
            ]);
          });
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
        <PersistHydrator />
        {children}
        <OnboardingGate />
        <OnboardingChecklist />
        <CompareFab />
        <OfflineIndicator />
      </I18nProvider>
    </QueryClientProvider>
  );
}
