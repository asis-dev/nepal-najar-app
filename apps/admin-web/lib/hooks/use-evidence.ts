'use client';

/**
 * Evidence hooks — STUBBED. No evidence/file upload backend exists.
 */
import { useQuery } from '@tanstack/react-query';

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

export function useEvidence(_projectId: string, _page = 1, _limit = 20) {
  return useQuery({
    queryKey: ['evidence', _projectId, _page, _limit],
    queryFn: async (): Promise<EvidenceListResponse> => ({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    }),
    enabled: !!_projectId,
  });
}

export function useEvidenceStats(_projectId: string) {
  return useQuery({
    queryKey: ['evidence', _projectId, 'stats'],
    queryFn: async (): Promise<EvidenceStat[]> => [],
    enabled: !!_projectId,
  });
}

export function useUploadEvidence() {
  return {
    mutate: (_payload?: UploadEvidencePayload) => console.warn('[useUploadEvidence] No backend available'),
    mutateAsync: async (_payload?: UploadEvidencePayload) => { throw new Error('No backend available'); },
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
  };
}

export function useDeleteEvidence() {
  return {
    mutate: (_id?: string) => console.warn('[useDeleteEvidence] No backend available'),
    mutateAsync: async (_id?: string) => { throw new Error('No backend available'); },
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
  };
}

export async function fetchDownloadUrl(_id: string): Promise<string> {
  throw new Error('Evidence download not available — no backend');
}
