'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';

interface NotificationsResponse {
  notifications: unknown[];
  unread_count: number;
}

export function NotificationBell() {
  const { isAuthenticated } = useAuth();

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=1');
      if (!res.ok) return { notifications: [], unread_count: 0 };
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 60000, // Poll every minute
  });

  const unreadCount = data?.unread_count ?? 0;

  if (!isAuthenticated) return null;

  return (
    <Link
      href="/notifications"
      className="relative flex items-center justify-center rounded-xl border border-white/[0.08] p-2 text-gray-400 transition-colors hover:border-white/[0.15] hover:text-gray-200"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
