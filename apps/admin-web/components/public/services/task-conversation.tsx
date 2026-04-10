'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquareText, Send } from 'lucide-react';
import { useState } from 'react';

type TaskMessage = {
  id: string;
  actor_type: 'citizen' | 'department' | 'admin' | 'system' | 'provider';
  message_type: string;
  body: string;
  created_at: string;
};

export function TaskConversation({ taskId }: { taskId: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  const { data, isLoading } = useQuery<{ messages: TaskMessage[] }>({
    queryKey: ['task-conversation', taskId],
    queryFn: async () => {
      const res = await fetch(`/api/me/service-tasks/${taskId}/messages`);
      if (!res.ok) throw new Error('Failed to load conversation');
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/me/service-tasks/${taskId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(data.error || 'Failed to send message');
      }
      return res.json();
    },
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['task-conversation', taskId] });
    },
  });

  const messages = data?.messages || [];

  return (
    <div className="mt-4 rounded-xl bg-zinc-800/60 p-3">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
        <MessageSquareText className="h-4 w-4" />
        Case conversation
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-zinc-400">
          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/70 p-3 text-sm text-zinc-400">
          No public updates yet. When a department responds, it will show up here. You can also send a clarification below.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.slice().reverse().map((message) => (
            <div key={message.id} className="rounded-xl border border-zinc-700/70 bg-zinc-900/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {message.actor_type}
                </div>
                <div className="text-[11px] text-zinc-500">
                  {new Date(message.created_at).toLocaleString()}
                </div>
              </div>
              <div className="mt-2 text-sm text-zinc-200">{message.body}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Reply with clarification, missing detail, or follow-up note"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-red-500/40"
        />
        <button
          onClick={() => sendMutation.mutate()}
          disabled={sendMutation.isPending || !draft.trim()}
          className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send reply
        </button>
        {sendMutation.error ? (
          <div className="text-sm text-red-400">{(sendMutation.error as Error).message}</div>
        ) : null}
      </div>
    </div>
  );
}
