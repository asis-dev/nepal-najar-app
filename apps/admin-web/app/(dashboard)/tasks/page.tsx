'use client';

import { useState } from 'react';
import {
  ClipboardList, Plus, Filter, List, LayoutGrid,
  Calendar, User, Flag, ChevronRight, GripVertical
} from 'lucide-react';

// --- Mock data ---
type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'completed';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface Task {
  id: string;
  title: string;
  project_name: string;
  assignee_name: string;
  assignee_initials: string;
  priority: Priority;
  status: TaskStatus;
  due_date: string;
}

const mockTasks: Task[] = [
  { id: '1', title: 'Complete soil testing report', project_name: 'Kathmandu Expressway Phase 2', assignee_name: 'Ram Shrestha', assignee_initials: 'RS', priority: 'high', status: 'todo', due_date: '2026-03-20' },
  { id: '2', title: 'Review bridge design specifications', project_name: 'Koshi Bridge Rehabilitation', assignee_name: 'Deepak Rai', assignee_initials: 'DR', priority: 'urgent', status: 'todo', due_date: '2026-03-18' },
  { id: '3', title: 'Upload geo-tagged inspection photos', project_name: 'Melamchi Water Supply', assignee_name: 'Sita Gurung', assignee_initials: 'SG', priority: 'medium', status: 'todo', due_date: '2026-03-22' },
  { id: '4', title: 'Procure transformer equipment', project_name: 'Rural Electrification Karnali', assignee_name: 'Hari Thapa', assignee_initials: 'HT', priority: 'high', status: 'in_progress', due_date: '2026-03-25' },
  { id: '5', title: 'Conduct community consultation', project_name: 'Hydropower Tamakoshi', assignee_name: 'Sarita Lama', assignee_initials: 'SL', priority: 'medium', status: 'in_progress', due_date: '2026-03-28' },
  { id: '6', title: 'Submit environmental clearance docs', project_name: 'Hydropower Tamakoshi', assignee_name: 'Bikash Poudel', assignee_initials: 'BP', priority: 'urgent', status: 'in_progress', due_date: '2026-03-17' },
  { id: '7', title: 'Resolve land acquisition dispute', project_name: 'Kathmandu Expressway Phase 2', assignee_name: 'Anita Maharjan', assignee_initials: 'AM', priority: 'urgent', status: 'blocked', due_date: '2026-03-15' },
  { id: '8', title: 'Waiting for budget release approval', project_name: 'Pokhara Airport Extension', assignee_name: 'Binod KC', assignee_initials: 'BK', priority: 'high', status: 'blocked', due_date: '2026-03-19' },
  { id: '9', title: 'Foundation inspection completed', project_name: 'School Reconstruction Batch 12', assignee_name: 'Binod KC', assignee_initials: 'BK', priority: 'medium', status: 'completed', due_date: '2026-03-10' },
  { id: '10', title: 'Solar panel installation - Phase 1', project_name: 'Solar Farm Bardiya', assignee_name: 'Bikash Poudel', assignee_initials: 'BP', priority: 'low', status: 'completed', due_date: '2026-03-08' },
  { id: '11', title: 'QA report submitted', project_name: 'Digital Health Records', assignee_name: 'Sita Gurung', assignee_initials: 'SG', priority: 'medium', status: 'completed', due_date: '2026-03-12' },
];

const columns: { key: TaskStatus; label: string; color: string; bgColor: string }[] = [
  { key: 'todo', label: 'To Do', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  { key: 'in_progress', label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { key: 'blocked', label: 'Blocked', color: 'text-red-600', bgColor: 'bg-red-50' },
  { key: 'completed', label: 'Complete', color: 'text-green-600', bgColor: 'bg-green-50' },
];

const priorityConfig: Record<Priority, { color: string; label: string }> = {
  low: { color: 'bg-gray-100 text-gray-600', label: 'Low' },
  medium: { color: 'bg-blue-100 text-blue-700', label: 'Medium' },
  high: { color: 'bg-orange-100 text-orange-700', label: 'High' },
  urgent: { color: 'bg-red-100 text-red-700', label: 'Urgent' },
};

export default function TasksPage() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [tasks, setTasks] = useState(mockTasks);
  const [projectFilter, setProjectFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  const filtered = tasks.filter((t) => {
    if (projectFilter !== 'all' && t.project_name !== projectFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (assigneeFilter !== 'all' && t.assignee_name !== assigneeFilter) return false;
    return true;
  });

  const moveTask = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  const projects = [...new Set(mockTasks.map((t) => t.project_name))];
  const assignees = [...new Set(mockTasks.map((t) => t.assignee_name))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">Manage project tasks and assignments</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <select className="input w-auto text-sm" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="all">All Projects</option>
          {projects.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="input w-auto text-sm" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="all">All Assignees</option>
          {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="input w-auto text-sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div className="ml-auto flex items-center border border-gray-300 rounded-lg overflow-hidden">
          <button
            className={`p-2 ${view === 'kanban' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setView('kanban')}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            className={`p-2 ${view === 'list' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setView('list')}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="space-y-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${col.bgColor}`}>
                  <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                  <span className="text-xs bg-white/80 px-1.5 py-0.5 rounded-full text-gray-600 font-medium">{colTasks.length}</span>
                </div>
                <div className="space-y-3">
                  {colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onMove={moveTask} currentStatus={col.key} />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 font-medium text-gray-500">Task</th>
                <th className="px-6 py-3 font-medium text-gray-500">Project</th>
                <th className="px-6 py-3 font-medium text-gray-500">Assignee</th>
                <th className="px-6 py-3 font-medium text-gray-500">Priority</th>
                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 font-medium text-gray-500">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{task.title}</td>
                  <td className="px-6 py-3 text-gray-600">{task.project_name}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-700">
                        {task.assignee_initials}
                      </div>
                      <span className="text-gray-600">{task.assignee_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig[task.priority].color}`}>
                      {priorityConfig[task.priority].label}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <select
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                      value={task.status}
                      onChange={(e) => moveTask(task.id, e.target.value as TaskStatus)}
                    >
                      {columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{task.due_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onMove,
  currentStatus,
}: {
  task: Task;
  onMove: (id: string, status: TaskStatus) => void;
  currentStatus: TaskStatus;
}) {
  const nextStatus: Record<TaskStatus, TaskStatus | null> = {
    todo: 'in_progress',
    in_progress: 'completed',
    blocked: 'in_progress',
    completed: null,
  };

  const next = nextStatus[currentStatus];

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <p className="text-sm font-medium text-gray-900 mb-2">{task.title}</p>
      <p className="text-xs text-gray-500 mb-3">{task.project_name}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-700">
            {task.assignee_initials}
          </div>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityConfig[task.priority].color}`}>
            {priorityConfig[task.priority].label}
          </span>
        </div>
        <span className="text-xs text-gray-400">{task.due_date}</span>
      </div>

      {next && (
        <button
          onClick={() => onMove(task.id, next)}
          className="mt-3 w-full text-xs text-center py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          Move to {columns.find((c) => c.key === next)?.label}
        </button>
      )}
    </div>
  );
}
