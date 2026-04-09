import { ProfileEditor } from '@/components/public/profile/profile-editor';

export const metadata = {
  title: 'My Identity Profile — Nepal Republic',
  description: 'Save your identity details once. Autofill every government form.',
};

export default function ProfilePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-3">
        🔒 PRIVATE · STORED ENCRYPTED
      </div>
      <h1 className="text-3xl md:text-4xl font-black mb-2">My Identity Profile</h1>
      <p className="text-zinc-400 mb-6 text-sm">
        Fill this once. We'll autofill every government form, printable PDF, and service workflow.
        Only you can see this data.
      </p>
      <ProfileEditor />
    </div>
  );
}
