'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useUserPreferencesStore } from '@/lib/stores/preferences';

/**
 * We intentionally do not auto-open the onboarding modal for signed-in users.
 * Returning users should land directly on the dashboard without interruption.
 */
export function OnboardingGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const { onboardingComplete, setOnboardingComplete } = useUserPreferencesStore();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (onboardingComplete === true) return;

    // Treat signed-in users as already onboarded to prevent forced walkthrough loops.
    setOnboardingComplete(true);
  }, [isAuthenticated, isLoading, onboardingComplete, setOnboardingComplete]);

  return null;
}
