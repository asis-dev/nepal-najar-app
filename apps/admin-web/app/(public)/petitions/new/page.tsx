import { NewPetitionForm } from '@/components/public/petitions/new-form';

export const metadata = {
  title: 'Start a petition — Nepal Republic',
};

export default function NewPetitionPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2">Start a petition</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Target a specific minister or ministry. Be clear about what you want. Petitions are public and cannot be edited after posting.
      </p>
      <NewPetitionForm />
    </div>
  );
}
