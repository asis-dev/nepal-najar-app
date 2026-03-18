'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface Notification {
  id: string;
  type: 'alert' | 'info' | 'digest' | 'escalation' | 'verification' | 'blocker';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  link?: string;
  project_id?: string;
  project_name?: string;
}

export interface NotificationPreferences {
  email_alerts: boolean;
  email_digests: boolean;
  sms_alerts: boolean;
  blocker_notifications: boolean;
  escalation_notifications: boolean;
  verification_notifications: boolean;
  budget_notifications: boolean;
  digest_frequency: 'daily' | 'weekly' | 'monthly';
}

export function useNotifications(params?: { type?: string; read?: boolean }) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const { data } = await api.get('/api/notifications', { params });
      return data as { data: Notification[]; total: number; unread: number };
    },
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await api.post('/api/notifications/mark-read', { ids });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/notifications/mark-all-read');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data } = await api.get('/api/notifications/preferences');
      return data as NotificationPreferences;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: Partial<NotificationPreferences>) => {
      const { data } = await api.patch('/api/notifications/preferences', prefs);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}
