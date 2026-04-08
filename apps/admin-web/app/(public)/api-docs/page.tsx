import Link from 'next/link';

export const metadata = {
  title: 'Public API — Nepal Republic',
  description: 'Free, open JSON API for Nepal government accountability data.',
};

const endpoints = [
  {
    path: '/api/public/v1/commitments',
    desc: 'All 109 tracked government commitments with status and progress.',
    params: 'status, category, limit',
  },
  {
    path: '/api/public/v1/parties',
    desc: 'Per-party rollup with grade and status breakdown.',
    params: '—',
  },
  {
    path: '/api/public/v1/ministries',
    desc: 'Per-ministry rollup — which ministry is failing?',
    params: '—',
  },
  {
    path: '/api/public/v1/inbox',
    desc: 'Open party action items (stalled, overdue, silent commitments + complaints).',
    params: 'kind, limit',
  },
];

export default function ApiDocsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
        FREE · OPEN DATA
      </div>
      <h1 className="text-3xl md:text-4xl font-black mb-2">Public API</h1>
      <p className="text-zinc-400 mb-8">
        Nepal Republic data is free for journalists, researchers, and citizens. No API key
        needed. CORS is open. Please be considerate — cached responses at 2–10 min. If you build
        something with this, <Link href="/" className="text-red-400 hover:underline">let us know</Link>.
      </p>

      <ul className="space-y-4">
        {endpoints.map((e) => (
          <li key={e.path} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
            <div className="font-mono text-sm text-emerald-400 mb-2 break-all">GET {e.path}</div>
            <div className="text-sm text-zinc-300 mb-2">{e.desc}</div>
            <div className="text-xs text-zinc-500">Query params: {e.params}</div>
            <a
              href={e.path}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs text-red-400 hover:underline"
            >
              Try it →
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
        <h2 className="text-sm font-bold text-zinc-200 mb-2">Example</h2>
        <pre className="text-xs text-zinc-400 overflow-x-auto"><code>{`curl https://nepalrepublic.org/api/public/v1/commitments?status=stalled`}</code></pre>
      </div>

      <div className="mt-6 text-xs text-zinc-500">
        License: data is public-interest journalism. Attribution to Nepal Republic appreciated.
      </div>
    </div>
  );
}
