'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

type Department = {
  key: string;
  name: string;
};

type Member = {
  department_key: string;
  user_id: string;
  member_role: string;
  can_assign: boolean;
  can_approve: boolean;
  can_escalate: boolean;
  is_active: boolean;
  profile?: {
    id: string;
    display_name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

export default function ServiceOpsTeamPage() {
  const queryClient = useQueryClient();
  const [departmentKey, setDepartmentKey] = useState('all');
  const [userId, setUserId] = useState('');
  const [memberRole, setMemberRole] = useState('case_worker');
  const [canAssign, setCanAssign] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [canEscalate, setCanEscalate] = useState(false);

  const { data: departmentsData } = useQuery<{ departments: Department[] }>({
    queryKey: ['service-ops-departments'],
    queryFn: async () => {
      const res = await fetch('/api/ops/service-tasks/departments');
      if (!res.ok) throw new Error('Failed to load departments');
      return res.json();
    },
  });

  const departments = departmentsData?.departments || [];
  const effectiveDepartmentKey = departmentKey !== 'all' ? departmentKey : departments[0]?.key || '';

  const { data: membersData, isLoading } = useQuery<{ members: Member[] }>({
    queryKey: ['service-ops-members', effectiveDepartmentKey],
    enabled: Boolean(effectiveDepartmentKey),
    queryFn: async () => {
      const res = await fetch(`/api/ops/service-tasks/members?department_key=${effectiveDepartmentKey}`);
      if (!res.ok) throw new Error('Failed to load department members');
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ops/service-tasks/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_key: effectiveDepartmentKey,
          user_id: userId,
          member_role: memberRole,
          can_assign: canAssign,
          can_approve: canApprove,
          can_escalate: canEscalate,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(data.error || 'Failed to add member');
      }
      return res.json();
    },
    onSuccess: () => {
      setUserId('');
      setMemberRole('case_worker');
      setCanAssign(false);
      setCanApprove(false);
      setCanEscalate(false);
      queryClient.invalidateQueries({ queryKey: ['service-ops-members', effectiveDepartmentKey] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await fetch(
        `/api/ops/service-tasks/members/${targetUserId}?department_key=${effectiveDepartmentKey}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(data.error || 'Failed to remove member');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-ops-members', effectiveDepartmentKey] });
    },
  });

  const members = membersData?.members || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          Service Ops Team
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage which staff members can work, assign, approve, and escalate service cases.
        </p>
      </div>

      <div className="glass-card p-4 flex flex-wrap gap-3">
        <select
          className="input w-auto text-sm"
          value={departmentKey}
          onChange={(e) => setDepartmentKey(e.target.value)}
        >
          <option value="all">Select department</option>
          {departments.map((department) => (
            <option key={department.key} value={department.key}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-card p-5 space-y-4">
          <h2 className="text-base font-semibold text-white">Add or update member</h2>

          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID"
            className="input text-sm"
          />

          <select className="input text-sm" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
            <option value="case_worker">Case worker</option>
            <option value="reviewer">Reviewer</option>
            <option value="approver">Approver</option>
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
            <option value="viewer">Viewer</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={canAssign} onChange={(e) => setCanAssign(e.target.checked)} />
            Can assign cases
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={canApprove} onChange={(e) => setCanApprove(e.target.checked)} />
            Can approve / reject
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={canEscalate} onChange={(e) => setCanEscalate(e.target.checked)} />
            Can escalate
          </label>

          <button
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending || !effectiveDepartmentKey || !userId.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save member
          </button>

          {addMutation.error ? (
            <div className="text-sm text-red-400">{(addMutation.error as Error).message}</div>
          ) : null}
        </div>

        <div className="glass-card overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="text-base font-semibold text-white">Department members</h2>
          </div>

          {!effectiveDepartmentKey ? (
            <div className="p-8 text-sm text-gray-400">Choose a department to manage its team.</div>
          ) : isLoading ? (
            <div className="p-8 text-center text-gray-400">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-sm text-gray-400">No team members added yet.</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {members.map((member) => (
                <div key={`${member.department_key}-${member.user_id}`} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-white">
                        {member.profile?.display_name || member.user_id}
                      </div>
                      <span className="rounded-full border border-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-300">
                        {member.member_role}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {member.profile?.email || member.user_id}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      {member.can_assign ? <span className="rounded-full border border-amber-500/20 px-2 py-0.5 text-amber-300">assign</span> : null}
                      {member.can_approve ? <span className="rounded-full border border-emerald-500/20 px-2 py-0.5 text-emerald-300">approve</span> : null}
                      {member.can_escalate ? <span className="rounded-full border border-fuchsia-500/20 px-2 py-0.5 text-fuchsia-300">escalate</span> : null}
                    </div>
                  </div>

                  <button
                    onClick={() => removeMutation.mutate(member.user_id)}
                    disabled={removeMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
