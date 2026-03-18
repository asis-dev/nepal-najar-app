'use client';

import { useState } from 'react';
import {
  Bell, AlertTriangle, FileText, Shield, TrendingUp,
  CheckCircle, Clock, Mail, MessageSquare, Settings,
  ChevronRight, Eye, EyeOff
} from 'lucide-react';

// --- Mock data ---
type NotificationType = 'alert' | 'info' | 'digest' | 'escalation' | 'verification' | 'blocker';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  project_name?: string;
}

const mockNotifications: Notification[] = [
  { id: '1', type: 'escalation', title: 'Blocker Escalated to Secretary Level', body: 'Land acquisition dispute for Kathmandu Expressway Phase 2 has been escalated to Ministry Secretary for intervention.', read: false, created_at: '12 min ago', project_name: 'Kathmandu Expressway Phase 2' },
  { id: '2', type: 'alert', title: 'Budget Anomaly Detected', body: 'Spending on Rural Electrification Karnali has exceeded released funds. Current utilization at 113%.', read: false, created_at: '45 min ago', project_name: 'Rural Electrification Karnali' },
  { id: '3', type: 'verification', title: 'Verification Response Received', body: 'Ram Shrestha has responded to the progress verification request for School Reconstruction Batch 12.', read: false, created_at: '2 hrs ago', project_name: 'School Reconstruction Batch 12' },
  { id: '4', type: 'info', title: 'New Evidence Uploaded', body: '3 new geo-tagged photos uploaded for Melamchi Water Supply project. Pending review.', read: true, created_at: '3 hrs ago', project_name: 'Melamchi Water Supply' },
  { id: '5', type: 'blocker', title: 'New Blocker Reported', body: 'Environmental clearance delay reported for Hydropower Tamakoshi. Severity: High.', read: true, created_at: '5 hrs ago', project_name: 'Hydropower Tamakoshi' },
  { id: '6', type: 'digest', title: 'Weekly Progress Digest', body: 'Summary: 8 milestones completed, 3 new blockers, overall progress +2.3% this week.', read: true, created_at: '1 day ago' },
  { id: '7', type: 'alert', title: 'Milestone Overdue', body: 'Bridge completion milestone for Koshi Corridor project is now 14 days overdue.', read: true, created_at: '1 day ago', project_name: 'Koshi Corridor' },
  { id: '8', type: 'info', title: 'User Role Updated', body: 'Binod KC has been assigned the role of District Project Manager for Sindhupalchok.', read: true, created_at: '2 days ago' },
  { id: '9', type: 'digest', title: 'Monthly Budget Report Ready', body: 'The monthly budget utilization report for FY 2082/83 Q3 is ready for review.', read: true, created_at: '3 days ago' },
  { id: '10', type: 'escalation', title: 'Critical Blocker Unresolved', body: 'Procurement freeze on Pokhara Airport Extension has been unresolved for 30+ days.', read: true, created_at: '4 days ago', project_name: 'Pokhara Airport Extension' },
];

const typeConfig: Record<NotificationType, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  alert: { icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
  info: { icon: FileText, color: 'bg-blue-100 text-blue-600' },
  digest: { icon: Mail, color: 'bg-purple-100 text-purple-600' },
  escalation: { icon: TrendingUp, color: 'bg-orange-100 text-orange-600' },
  verification: { icon: Shield, color: 'bg-cyan-100 text-cyan-600' },
  blocker: { icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-600' },
};

type Tab = 'all' | 'unread' | 'alerts' | 'digests';

interface NotifPref {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

const defaultPrefs: NotifPref[] = [
  { key: 'email_alerts', label: 'Email Alerts', description: 'Receive urgent alerts via email', enabled: true },
  { key: 'email_digests', label: 'Weekly Digest', description: 'Weekly summary of all activity', enabled: true },
  { key: 'sms_alerts', label: 'SMS Alerts', description: 'Critical alerts via SMS', enabled: false },
  { key: 'blocker_notifications', label: 'Blocker Notifications', description: 'New blockers and escalations', enabled: true },
  { key: 'budget_notifications', label: 'Budget Alerts', description: 'Budget anomalies and releases', enabled: true },
  { key: 'verification_notifications', label: 'Verification Updates', description: 'Verification request responses', enabled: true },
];

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('all');
  const [notifications, setNotifications] = useState(mockNotifications);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState(defaultPrefs);

  const filtered = notifications.filter((n) => {
    if (tab === 'unread') return !n.read;
    if (tab === 'alerts') return n.type === 'alert' || n.type === 'escalation' || n.type === 'blocker';
    if (tab === 'digests') return n.type === 'digest';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const togglePref = (key: string) => {
    setPrefs((prev) =>
      prev.map((p) => (p.key === key ? { ...p, enabled: !p.enabled } : p))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPrefs(!showPrefs)} className="btn-secondary flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Preferences
          </button>
          <button onClick={markAllRead} className="btn-secondary">Mark All Read</button>
        </div>
      </div>

      {/* Preferences Panel */}
      {showPrefs && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Notification Preferences</h3>
          <div className="space-y-4">
            {prefs.map((pref) => (
              <div key={pref.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{pref.label}</p>
                  <p className="text-xs text-gray-500">{pref.description}</p>
                </div>
                <button
                  onClick={() => togglePref(pref.key)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    pref.enabled ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                      pref.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { key: 'all', label: 'All' },
          { key: 'unread', label: 'Unread' },
          { key: 'alerts', label: 'Alerts' },
          { key: 'digests', label: 'Digests' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="card overflow-hidden divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          filtered.map((notif) => {
            const config = typeConfig[notif.type];
            const Icon = config.icon;
            return (
              <div
                key={notif.id}
                className={`px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors ${
                  !notif.read ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${!notif.read ? 'text-gray-900' : 'text-gray-700'}`}>
                      {notif.title}
                    </p>
                    {!notif.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{notif.body}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{notif.created_at}</span>
                    {notif.project_name && <span>-- {notif.project_name}</span>}
                  </div>
                </div>
                <button
                  onClick={() => toggleRead(notif.id)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex-shrink-0"
                  title={notif.read ? 'Mark as unread' : 'Mark as read'}
                >
                  {notif.read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
