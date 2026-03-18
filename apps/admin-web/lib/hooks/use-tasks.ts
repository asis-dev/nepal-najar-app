'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface Task {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string;
  assignee_name: string;
  assignee_avatar?: string;
  due_date: string;
  created_at: string;
  completed_at?: string;
}

export function useTasks(params?: { project_id?: string; status?: string; assignee_id?: string; priority?: string }) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const { data } = await api.get('/api/tasks', { params });
      return data as { data: Task[]; total: number };
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'created_at' | 'completed_at'>) => {
      const { data } = await api.post('/api/tasks', task);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data } = await api.patch(`/api/tasks/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
