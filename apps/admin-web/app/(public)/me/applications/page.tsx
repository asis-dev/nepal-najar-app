import { ApplicationsDashboard } from '@/components/public/profile/applications-dashboard';

export const metadata = {
  title: 'My Applications — Nepal Republic',
  description: 'Track every government service you have applied for.',
};

export default function ApplicationsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
        📋 MY APPLICATIONS
      </div>
      <h1 className="text-3xl md:text-4xl font-black mb-2">My Applications</h1>
      <p className="text-zinc-400 mb-6 text-sm">
        Every service you're waiting on — with reference numbers, due dates, and reminders.
      </p>
      <ApplicationsDashboard />
    </div>
  );
}
