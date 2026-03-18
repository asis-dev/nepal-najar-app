'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, ChevronRight, ChevronDown, Loader2, Users, FolderKanban, MapPin
} from 'lucide-react';
import { api } from '@/lib/api';

interface GovUnit {
  id: string;
  name: string;
  type: string;
  children?: GovUnit[];
  parent_id?: string;
  region?: { id: string; name: string };
  projects_count?: number;
  members_count?: number;
}

export default function OrganizationsPage() {
  const { data: tree, isLoading, isError } = useQuery({
    queryKey: ['government-units', 'tree'],
    queryFn: async () => {
      const { data } = await api.get('/government-units/tree');
      return data as GovUnit[];
    },
  });

  const [selectedUnit, setSelectedUnit] = useState<GovUnit | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Government Organizations</h1>
        <p className="text-gray-500 mt-1">Ministries, departments, and agencies hierarchy</p>
      </div>

      {isLoading ? (
        <div className="card p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : isError ? (
        <div className="card p-12 text-center text-red-500">
          Failed to load organizations. Check your connection and try again.
        </div>
      ) : !tree || tree.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          No organizations found
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tree View */}
          <div className="lg:col-span-2 card p-4 overflow-auto max-h-[calc(100vh-220px)]">
            <div className="space-y-0.5">
              {tree.map((unit) => (
                <TreeNode
                  key={unit.id}
                  unit={unit}
                  level={0}
                  selectedId={selectedUnit?.id}
                  onSelect={setSelectedUnit}
                />
              ))}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="card p-6">
            {selectedUnit ? (
              <UnitDetail unit={selectedUnit} />
            ) : (
              <div className="text-center text-gray-400 py-12">
                <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Select an organization to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TreeNode({
  unit,
  level,
  selectedId,
  onSelect,
}: {
  unit: GovUnit;
  level: number;
  selectedId?: string;
  onSelect: (unit: GovUnit) => void;
}) {
  const [expanded, setExpanded] = useState(level < 1);
  const hasChildren = unit.children && unit.children.length > 0;
  const isSelected = unit.id === selectedId;

  const typeColorMap: Record<string, string> = {
    ministry: 'text-blue-600 bg-blue-50',
    department: 'text-green-600 bg-green-50',
    agency: 'text-purple-600 bg-purple-50',
    division: 'text-orange-600 bg-orange-50',
    office: 'text-gray-600 bg-gray-100',
  };

  const typeColor = typeColorMap[unit.type?.toLowerCase()] ?? 'text-gray-600 bg-gray-100';

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
          isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => onSelect(unit)}
      >
        {/* Expand/collapse toggle */}
        <button
          className="w-5 h-5 flex items-center justify-center flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded(!expanded);
          }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          )}
        </button>

        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />

        <span className="text-sm font-medium text-gray-900 truncate flex-1">
          {unit.name}
        </span>

        <span className={`text-xs px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${typeColor}`}>
          {unit.type}
        </span>
      </div>

      {expanded && hasChildren && (
        <div>
          {unit.children!.map((child) => (
            <TreeNode
              key={child.id}
              unit={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UnitDetail({ unit }: { unit: GovUnit }) {
  // Fetch unit details including projects
  const { data: detail, isLoading } = useQuery({
    queryKey: ['government-units', unit.id],
    queryFn: async () => {
      const { data } = await api.get(`/government-units/${unit.id}`);
      return data;
    },
    enabled: !!unit.id,
  });

  const displayData = detail ?? unit;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{displayData.name}</h2>
        <span className="text-sm text-gray-500 capitalize">{displayData.type}</span>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading details...
        </div>
      )}

      <div className="space-y-3 text-sm">
        {displayData.region && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{displayData.region.name}</span>
          </div>
        )}

        {displayData.projects_count != null && (
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{displayData.projects_count} projects</span>
          </div>
        )}

        {displayData.members_count != null && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{displayData.members_count} members</span>
          </div>
        )}
      </div>

      {unit.children && unit.children.length > 0 && (
        <div className="border-t pt-3 mt-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Sub-units ({unit.children.length})
          </p>
          <div className="space-y-1">
            {unit.children.map((child) => (
              <div key={child.id} className="flex items-center gap-2 text-sm text-gray-600 py-1">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                {child.name}
                <span className="text-xs text-gray-400 capitalize">({child.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show projects if available from detail fetch */}
      {detail?.projects && detail.projects.length > 0 && (
        <div className="border-t pt-3 mt-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Projects ({detail.projects.length})
          </p>
          <div className="space-y-1.5">
            {detail.projects.slice(0, 10).map((p: any) => (
              <div key={p.id} className="text-sm text-gray-600 py-1 flex items-center justify-between">
                <span className="truncate">{p.title}</span>
                <span className="text-xs text-gray-400">{p.progress ?? 0}%</span>
              </div>
            ))}
            {detail.projects.length > 10 && (
              <p className="text-xs text-gray-400">
                +{detail.projects.length - 10} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
