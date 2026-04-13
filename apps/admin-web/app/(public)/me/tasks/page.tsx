'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function TasksRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/me/cases'); }, [router]);
  return <div className="max-w-4xl mx-auto px-4 py-10 text-zinc-400">Redirecting…</div>;
}
