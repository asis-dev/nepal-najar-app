import { ApplicationsDashboard } from '@/components/public/profile/applications-dashboard';

export const metadata = {
  title: 'Application Editor — Nepal Republic',
  description: 'Edit manually tracked applications and references for your cases.',
};

export default function ApplicationsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
        📋 APPLICATION EDITOR
      </div>
      <h1 className="text-3xl md:text-4xl font-black mb-2">Application Editor</h1>
      <p className="text-zinc-400 mb-6 text-sm">
        Your main case view now lives in My Cases. Use this page to manually add or edit tracked applications, references, reminders, and receipts.
      </p>
      <ApplicationsDashboard />
    </div>
  );
}
