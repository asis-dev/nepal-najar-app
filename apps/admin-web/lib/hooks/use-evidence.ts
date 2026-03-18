'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

// ── Types ───────────────────────────────────────────────────────────────────

export type FileType = 'image' | 'video' | 'document' | 'pdf';

export interface EvidenceAttachment {
  id: string;
  project_id: string | null;
  milestone_id: string | null;
  task_id: string | null;
  uploaded_by: string;
  file_url: string;
  file_type: FileType;
  mime_type: string;
  caption: string | null;
  source_type: string;
  geo_lat: number | null;
  geo_lng: number | null;
  captured_at: string | null;
  visibility: string;
  created_at: string;
  uploader?: { id: string; name: string; email?: string };
  project?: { id: string; title: string } | null;
}

export interface EvidenceListResponse {
  data: EvidenceAttachment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface EvidenceStat {
  fileType: string;
  count: number;
}

export interface UploadEvidencePayload {
  file: File;
  projectId: string;
  sourceType: string;
  milestoneId?: string;
  taskId?: string;
  caption?: string;
  geoLat?: number;
  geoLng?: number;
  capturedAt?: string;
  visibility?: string;
}

// ── Hooks ───────────────────────────────────────────────────────────────────

export function useEvidence(projectId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['evidence', projectId, page, limit],
    queryFn: async () => {
      const { data } = await api.get<EvidenceListResponse>(
        `/projects/${projectId}/evidence`,
        { params: { page, limit } },
      );
      return data;
    },
    enabled: !!projectId,
  });
}

export function useEvidenceStats(projectId: string) {
  return useQuery({
    queryKey: ['evidence', projectId, 'stats'],
    queryFn: async () => {
      const { data } = await api.get<EvidenceStat[]>(
        `/projects/${projectId}/evidence/stats`,
      );
      return data;
    },
    enabled: !!projectId,
  });
}

export function useUploadEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UploadEvidencePayload) => {
      const formData = new FormData();
      formData.append('file', payload.file);
      formData.append('projectId', payload.projectId);
      formData.append('sourceType', payload.sourceType);
      if (payload.milestoneId) formData.append('milestoneId', payload.milestoneId);
      if (payload.taskId) formData.append('taskId', payload.taskId);
      if (payload.caption) formData.append('caption', payload.caption);
      if (payload.geoLat != null) formData.append('geoLat', String(payload.geoLat));
      if (payload.geoLng != null) formData.append('geoLng', String(payload.geoLng));
      if (payload.capturedAt) formData.append('capturedAt', payload.capturedAt);
      if (payload.visibility) formData.append('visibility', payload.visibility);

      const { data } = await api.post<EvidenceAttachment>('/evidence/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', variables.projectId] });
    },
  });
}

export function useDeleteEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/evidence/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

export async function fetchDownloadUrl(id: string): Promise<string> {
  const { data } = await api.get<{ url: string; expiresIn: number }>(
    `/evidence/${id}/download`,
  );
  return data.url;
}
