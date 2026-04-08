'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { trackServiceEvent } from './posthog-provider';

/**
 * Shown on a service detail page when the service has documents the user should have.
 * Nudges signed-in users to check / add the doc to their Vault; prompts sign-in otherwise.
 */
export default function SaveToVault({ serviceSlug, serviceTitle }: { serviceSlug: string; serviceTitle: string }) {
  const user = useAuth((s) => s.user);

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0">🗄</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-zinc-100">Keep your docs ready</div>
          <div className="text-xs text-zinc-400 mt-1 mb-3">
            Store your documents in your private Vault so you never search for them again.
            <br />
            आफ्ना कागजात Vault मा सुरक्षित राख्नुहोस्।
          </div>
          <Link
            href={user ? '/me/vault' : `/login?next=/me/vault`}
            onClick={() => trackServiceEvent('save_to_vault_click', { slug: serviceSlug })}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold"
          >
            {user ? 'Open My Vault →' : 'Sign in to use Vault →'}
          </Link>
        </div>
      </div>
    </div>
  );
}
