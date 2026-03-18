'use client';

import React, { useState, useRef } from 'react';
import {
  FileText, Image, Video, File, Search, Grid3X3, List,
  CheckCircle, XCircle, Clock, Eye, Download, X, Trash2,
  MapPin, Calendar, User, Upload, Loader2,
} from 'lucide-react';
import { useProjects } from '@/lib/hooks/use-projects';
import {
  useEvidence,
  useEvidenceStats,
  useUploadEvidence,
  useDeleteEvidence,
  fetchDownloadUrl,
  type EvidenceAttachment,
  type FileType,
} from '@/lib/hooks/use-evidence';

// ── Constants ───────────────────────────────────────────────────────────────

type ReviewStatus = 'pending' | 'approved' | 'rejected';

const fileTypeIcons: Record<FileType, React.ComponentType<{ className?: string }>> = {
  image: Image,
  video: Video,
  document: FileText,
  pdf: File,
};

const statusConfig: Record<ReviewStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pending', color: 'badge-yellow', icon: Clock },
  approved: { label: 'Approved', color: 'badge-green', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'badge-red', icon: XCircle },
};

// ── Page ────────────────────────────────────────────────────────────────────

export default function EvidencePage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceAttachment | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  // ── Data fetching ───────────────────────────────────────────────────────
  const { data: projectsData } = useProjects({ limit: 100 });
  const projects = projectsData?.data ?? [];

  const {
    data: evidenceData,
    isLoading,
    isError,
  } = useEvidence(selectedProjectId, page, 20);

  const { data: stats } = useEvidenceStats(selectedProjectId);

  const deleteMutation = useDeleteEvidence();

  // ── Derived ─────────────────────────────────────────────────────────────
  const items = evidenceData?.data ?? [];
  const meta = evidenceData?.meta;

  const filtered = items.filter((e) => {
    if (typeFilter !== 'all' && e.file_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchesFile = e.file_url?.toLowerCase().includes(q);
      const matchesCaption = e.caption?.toLowerCase().includes(q);
      if (!matchesFile && !matchesCaption) return false;
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownload = async (id: string) => {
    try {
      const url = await fetchDownloadUrl(id);
      window.open(url, '_blank');
    } catch {
      alert('Failed to get download link');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this evidence?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      setSelectedEvidence(null);
    } catch {
      alert('Failed to delete evidence');
    }
  };

  const getDisplayName = (e: EvidenceAttachment) => {
    const parts = e.file_url?.split('/');
    return parts?.[parts.length - 1] ?? 'Untitled';
  };

  const getProjectName = (e: EvidenceAttachment) => {
    return e.project?.title ?? projects.find((p) => p.id === e.project_id)?.title ?? '—';
  };

  const getUploaderName = (e: EvidenceAttachment) => {
    return e.uploader?.name ?? '—';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evidence</h1>
          <p className="text-gray-500 mt-1">Review submitted evidence and documentation</p>
        </div>
        <button className="btn-primary" onClick={() => setShowUploadForm(true)}>
          + Upload Evidence
        </button>
      </div>

      {/* Stats Summary */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.fileType} className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{s.count}</p>
              <p className="text-sm text-gray-500 capitalize">{s.fileType}s</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Selector */}
          <select
            className="input w-auto"
            value={selectedProjectId}
            onChange={(e) => { setSelectedProjectId(e.target.value); setPage(1); }}
          >
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              className="bg-transparent outline-none text-sm flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="input w-auto"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
            <option value="pdf">PDFs</option>
          </select>

          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              className={`p-2 ${view === 'grid' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-50'}`}
              onClick={() => setView('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              className={`p-2 ${view === 'list' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-50'}`}
              onClick={() => setView('list')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="mt-3 flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-800">{selectedIds.size} selected</span>
            <button className="text-sm font-medium text-red-700 hover:underline">Delete Selected</button>
            <button className="text-sm font-medium text-gray-600 hover:underline" onClick={() => setSelectedIds(new Set())}>
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Empty / Loading States */}
      {!selectedProjectId && (
        <div className="card p-12 text-center text-gray-500">
          <p>Select a project above to view its evidence.</p>
        </div>
      )}

      {selectedProjectId && isLoading && (
        <div className="card p-12 text-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p>Loading evidence...</p>
        </div>
      )}

      {selectedProjectId && isError && (
        <div className="card p-12 text-center text-red-500">
          <p>Failed to load evidence. Please try again.</p>
        </div>
      )}

      {selectedProjectId && !isLoading && !isError && filtered.length === 0 && (
        <div className="card p-12 text-center text-gray-500">
          <p>No evidence found for this project.</p>
        </div>
      )}

      {/* Grid View */}
      {selectedProjectId && !isLoading && filtered.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((evidence) => {
            const ft = (evidence.file_type || 'document') as FileType;
            const FileIcon = fileTypeIcons[ft] || File;
            return (
              <div
                key={evidence.id}
                className="card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedEvidence(evidence)}
              >
                <div className="relative">
                  <div className="h-36 bg-gray-100 flex items-center justify-center">
                    <FileIcon className="w-12 h-12 text-gray-300" />
                  </div>
                  <input
                    type="checkbox"
                    className="absolute top-2 left-2 w-4 h-4 accent-primary-600"
                    checked={selectedIds.has(evidence.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(evidence.id); }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="absolute top-2 right-2 badge-gray capitalize text-xs">
                    {ft}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{getDisplayName(evidence)}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{evidence.caption || getProjectName(evidence)}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <span>{new Date(evidence.created_at).toLocaleDateString()}</span>
                    <span className="capitalize">{ft}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {selectedProjectId && !isLoading && filtered.length > 0 && view === 'list' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" className="w-4 h-4 accent-primary-600" />
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">File</th>
                <th className="px-4 py-3 font-medium text-gray-500">Project</th>
                <th className="px-4 py-3 font-medium text-gray-500">Uploader</th>
                <th className="px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((evidence) => {
                const ft = (evidence.file_type || 'document') as FileType;
                const FileIcon = fileTypeIcons[ft] || File;
                return (
                  <tr
                    key={evidence.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedEvidence(evidence)}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary-600"
                        checked={selectedIds.has(evidence.id)}
                        onChange={() => toggleSelect(evidence.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{getDisplayName(evidence)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{getProjectName(evidence)}</td>
                    <td className="px-4 py-3 text-gray-600">{getUploaderName(evidence)}</td>
                    <td className="px-4 py-3">
                      <span className="badge-gray capitalize">{ft}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(evidence.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="p-1.5 hover:bg-gray-100 rounded"
                          title="Download"
                          onClick={() => handleDownload(evidence.id)}
                        >
                          <Download className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-red-50 rounded"
                          title="Delete"
                          onClick={() => handleDelete(evidence.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Evidence Detail</h3>
              <button onClick={() => setSelectedEvidence(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview */}
            <div className="h-48 bg-gray-100 flex items-center justify-center">
              {React.createElement(
                fileTypeIcons[(selectedEvidence.file_type || 'document') as FileType] || File,
                { className: 'w-16 h-16 text-gray-300' },
              )}
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900">{getDisplayName(selectedEvidence)}</h4>
                <p className="text-sm text-gray-500">{selectedEvidence.caption || 'No description'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <FileText className="w-4 h-4" />
                  <span>{getProjectName(selectedEvidence)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{getUploaderName(selectedEvidence)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(selectedEvidence.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <File className="w-4 h-4" />
                  <span className="capitalize">{selectedEvidence.file_type} ({selectedEvidence.mime_type})</span>
                </div>
                {selectedEvidence.geo_lat != null && selectedEvidence.geo_lng != null && (
                  <div className="flex items-center gap-2 text-gray-600 col-span-2">
                    <MapPin className="w-4 h-4" />
                    <span>{Number(selectedEvidence.geo_lat).toFixed(4)}, {Number(selectedEvidence.geo_lng).toFixed(4)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  onClick={() => handleDownload(selectedEvidence.id)}
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                  onClick={() => handleDelete(selectedEvidence.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadForm && (
        <UploadModal
          projects={projects}
          defaultProjectId={selectedProjectId}
          onClose={() => setShowUploadForm(false)}
        />
      )}
    </div>
  );
}

// ── Upload Modal ────────────────────────────────────────────────────────────

function UploadModal({
  projects,
  defaultProjectId,
  onClose,
}: {
  projects: { id: string; title: string }[];
  defaultProjectId: string;
  onClose: () => void;
}) {
  const uploadMutation = useUploadEvidence();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projectId, setProjectId] = useState(defaultProjectId);
  const [sourceType, setSourceType] = useState('official');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !projectId) return;

    try {
      await uploadMutation.mutateAsync({
        file: selectedFile,
        projectId,
        sourceType,
        caption: caption || undefined,
        visibility,
      });
      onClose();
    } catch {
      alert('Upload failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Upload Evidence</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* File Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <p className="text-sm text-gray-900 font-medium">{selectedFile.name}</p>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-500">Click to select file (max 25 MB)</p>
                  <p className="text-xs text-gray-400">JPEG, PNG, WebP, MP4, PDF, DOC, DOCX</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf,.doc,.docx"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              className="input w-full"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
            >
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* Source Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
            <select
              className="input w-full"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
            >
              <option value="official">Official</option>
              <option value="citizen">Citizen</option>
              <option value="ngo">NGO</option>
              <option value="media">Media</option>
              <option value="satellite">Satellite</option>
            </select>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
            <input
              type="text"
              className="input w-full"
              placeholder="Brief description..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
            <select
              className="input w-full"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="public">Public</option>
              <option value="internal">Internal</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={!selectedFile || !projectId || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload
                </>
              )}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
