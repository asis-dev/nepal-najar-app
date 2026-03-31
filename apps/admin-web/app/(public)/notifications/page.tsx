'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  BellRing,
  Mail,
  Smartphone,
  Shield,
  Loader2,
  Check,
  MapPin,
  CheckCheck,
  AlertTriangle,
  FileText,
  Megaphone,
  MessageSquare,
  TrendingUp,
  Info,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';
import { usePushNotifications } from '@/lib/hooks/use-push-notifications';

const PROVINCES = [
  { id: 'koshi', label: 'Koshi', labelNe: 'कोशी' },
  { id: 'madhesh', label: 'Madhesh', labelNe: 'मधेश' },
  { id: 'bagmati', label: 'Bagmati', labelNe: 'बागमती' },
  { id: 'gandaki', label: 'Gandaki', labelNe: 'गण्डकी' },
  { id: 'lumbini', label: 'Lumbini', labelNe: 'लुम्बिनी' },
  { id: 'karnali', label: 'Karnali', labelNe: 'कर्णाली' },
  { id: 'sudurpashchim', label: 'Sudurpashchim', labelNe: 'सुदूरपश्चिम' },
];

interface NotificationPrefs {
  email_alerts: boolean;
  push_enabled: boolean;
  digest_frequency: 'none' | 'weekly' | 'monthly';
  watched_provinces: string[];
}

interface Notification {
  id: string;
  type: string;
  title: string;
  title_ne: string | null;
  body: string | null;
  body_ne: string | null;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

const DEFAULT_PREFS: NotificationPrefs = {
  email_alerts: false,
  push_enabled: false,
  digest_frequency: 'none',
  watched_provinces: [],
};

const notificationTypeIcons: Record<string, React.ElementType> = {
  promise_update: AlertTriangle,
  evidence_added: FileText,
  official_statement: Megaphone,
  proposal_accepted: Check,
  proposal_comment: MessageSquare,
  area_trending: TrendingUp,
  weekly_digest: Mail,
  system: Info,
};

const notificationTypeColors: Record<string, string> = {
  promise_update: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  evidence_added: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  official_statement: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  proposal_accepted: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  proposal_comment: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  area_trending: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  weekly_digest: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
  system: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function NotificationsPage() {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const push = usePushNotifications();

  const [tab, setTab] = useState<'notifications' | 'settings'>('notifications');
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Fetch preferences and notifications on mount
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsFetching(false);
      return;
    }

    (async () => {
      try {
        const [prefsRes, notifRes] = await Promise.all([
          fetch('/api/notifications/preferences'),
          fetch('/api/notifications?limit=50'),
        ]);

        if (prefsRes.ok) {
          const data = await prefsRes.json();
          setPrefs({
            email_alerts: data.email_alerts ?? false,
            push_enabled: data.push_enabled ?? false,
            digest_frequency: data.digest_frequency ?? 'none',
            watched_provinces: data.watched_provinces ?? [],
          });
        }

        if (notifRes.ok) {
          const data = await notifRes.json();
          setNotifications(data.notifications ?? []);
          setUnreadCount(data.unread_count ?? 0);
        }
      } catch {
        // use defaults
      } finally {
        setIsFetching(false);
      }
    })();
  }, [isAuthenticated, user]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // silently fail
    } finally {
      setIsSaving(false);
    }
  }, [prefs]);

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAllRead(true);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent fail
    } finally {
      setMarkingAllRead(false);
    }
  }, []);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent fail
    }
  }, []);

  const toggleProvince = (id: string) => {
    setPrefs((prev) => ({
      ...prev,
      watched_provinces: prev.watched_provinces.includes(id)
        ? prev.watched_provinces.filter((p) => p !== id)
        : [...prev.watched_provinces, id],
    }));
  };

  // Auth loading skeleton
  if (authLoading || isFetching) {
    return (
      <div className="min-h-screen bg-np-base">
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <div className="max-w-2xl mx-auto">
            <div className="h-6 w-20 bg-white/5 rounded animate-pulse mb-8" />
            <div className="h-10 w-64 bg-white/5 rounded animate-pulse mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card p-6 animate-pulse">
                  <div className="h-4 bg-white/5 rounded w-1/2 mb-3" />
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-np-base">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/[0.05] rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-6">
          <div className="max-w-2xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('notificationsPage.home')}
            </Link>

            <div className="glass-card p-12 sm:p-16 text-center mt-8">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-300 mb-2">
                {t('notificationsPage.loginRequired')}
              </h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                {t('notificationsPage.loginRequiredDesc')}
              </p>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all duration-200"
              >
                {t('notificationsPage.explore')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-np-base">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Breadcrumb */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <div className="max-w-2xl mx-auto">
            <nav className="flex items-center gap-2 text-sm text-gray-400">
              <Link
                href="/"
                className="hover:text-primary-400 transition-colors"
              >
                {t('notificationsPage.home')}
              </Link>
              <span className="text-gray-600">/</span>
              <span className="text-gray-300">
                {t('notificationsPage.notifications')}
              </span>
            </nav>
          </div>
        </div>

        {/* Header */}
        <section className="px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
              <Bell className="w-7 h-7 sm:w-8 sm:h-8 text-primary-400" />
              {t('notificationsPage.notifications')}
              {unreadCount > 0 && (
                <span className="text-sm px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 font-medium">
                  {unreadCount} {t('notificationsPage.unread')}
                </span>
              )}
            </h1>
          </div>
        </section>

        {/* Tabs */}
        <section className="px-4 sm:px-6 lg:px-8 pb-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <button
                onClick={() => setTab('notifications')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'notifications'
                    ? 'bg-white/[0.08] text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Bell className="w-4 h-4" />
                {t('notificationsPage.notifications')}
              </button>
              <button
                onClick={() => setTab('settings')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'settings'
                    ? 'bg-white/[0.08] text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <BellRing className="w-4 h-4" />
                {t('notificationsPage.preferences')}
              </button>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-2xl mx-auto space-y-4">
            {tab === 'notifications' ? (
              <>
                {/* Mark all read */}
                {unreadCount > 0 && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleMarkAllRead}
                      disabled={markingAllRead}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-400 hover:bg-primary-500/10 transition-colors disabled:opacity-50"
                    >
                      {markingAllRead ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCheck className="w-3.5 h-3.5" />
                      )}
                      {t('notificationsPage.markAllRead')}
                    </button>
                  </div>
                )}

                {notifications.length > 0 ? (
                  <div className="space-y-2">
                    {notifications.map((notif) => {
                      const Icon = notificationTypeIcons[notif.type] ?? Info;
                      const colorClass = notificationTypeColors[notif.type] ?? notificationTypeColors.system;
                      const title = isNe && notif.title_ne ? notif.title_ne : notif.title;
                      const body = isNe && notif.body_ne ? notif.body_ne : notif.body;

                      const content = (
                        <div
                          className={`glass-card p-4 transition-all duration-200 hover:bg-white/[0.04] ${
                            !notif.is_read ? 'border-l-2 border-l-primary-500' : ''
                          }`}
                          onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg border ${colorClass} flex-shrink-0`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm font-medium ${notif.is_read ? 'text-gray-400' : 'text-white'}`}>
                                  {title}
                                </p>
                                <span className="text-[10px] text-gray-600 flex-shrink-0">
                                  {relativeTime(notif.created_at)}
                                </span>
                              </div>
                              {body && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{body}</p>
                              )}
                              {!notif.is_read && (
                                <span className="inline-block w-2 h-2 rounded-full bg-primary-400 mt-2" />
                              )}
                            </div>
                          </div>
                        </div>
                      );

                      return notif.link ? (
                        <Link key={notif.id} href={notif.link}>
                          {content}
                        </Link>
                      ) : (
                        <div key={notif.id}>{content}</div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="glass-card p-12 text-center">
                    <Bell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <h3 className="text-base font-medium text-gray-400 mb-1">
                      {t('notificationsPage.noNotifications')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('notificationsPage.noNotificationsDesc')}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Push Notifications */}
                <div className="glass-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-primary-500/10 border border-primary-500/20">
                      <Smartphone className="w-5 h-5 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-white">
                            {t('notificationsPage.pushNotifications')}
                          </h3>
                          <p className="text-sm text-gray-400 mt-0.5">
                            {t('notificationsPage.pushNotificationsDesc')}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (push.isSubscribed) {
                              await push.unsubscribe();
                              setPrefs((p) => ({ ...p, push_enabled: false }));
                            } else {
                              const ok = await push.subscribe();
                              if (ok) setPrefs((p) => ({ ...p, push_enabled: true }));
                            }
                          }}
                          disabled={push.isLoading || !push.isSupported}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0 ${
                            push.isSubscribed ? 'bg-primary-500' : 'bg-white/10'
                          } ${(!push.isSupported || push.isLoading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                              push.isSubscribed ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {!push.isSupported && (
                        <p className="text-xs text-amber-400/80 mt-2">
                          {t('notificationsPage.pushNotSupported')}
                        </p>
                      )}
                      {push.isSupported && push.permission === 'denied' && (
                        <p className="text-xs text-red-400/80 mt-2">
                          {t('notificationsPage.pushBlocked')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email Alerts */}
                <div className="glass-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                      <Mail className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-white">
                            {t('notificationsPage.emailAlerts')}
                          </h3>
                          <p className="text-sm text-gray-400 mt-0.5">
                            {t('notificationsPage.emailAlertsDesc')}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setPrefs((p) => ({
                              ...p,
                              email_alerts: !p.email_alerts,
                            }))
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0 cursor-pointer ${
                            prefs.email_alerts ? 'bg-primary-500' : 'bg-white/10'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                              prefs.email_alerts ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Digest */}
                <div className="glass-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                      <BellRing className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white">
                        {t('notificationsPage.emailDigest')}
                      </h3>
                      <p className="text-sm text-gray-400 mt-0.5 mb-4">
                        {t('notificationsPage.emailDigestDesc')}
                      </p>

                      <div className="flex flex-wrap gap-3">
                        {(
                          [
                            { value: 'none' as const, label: t('notificationsPage.none') },
                            { value: 'weekly' as const, label: t('notificationsPage.weekly') },
                            { value: 'monthly' as const, label: t('notificationsPage.monthly') },
                          ] as const
                        ).map((option) => (
                          <button
                            key={option.value}
                            onClick={() =>
                              setPrefs((p) => ({ ...p, digest_frequency: option.value }))
                            }
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                              prefs.digest_frequency === option.value
                                ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                                : 'bg-white/[0.04] border-white/[0.08] text-gray-400 hover:bg-white/[0.08] hover:text-gray-300'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Province Alerts */}
                <div className="glass-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <MapPin className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white">
                        {t('notificationsPage.provinceAlerts')}
                      </h3>
                      <p className="text-sm text-gray-400 mt-0.5 mb-4">
                        {t('notificationsPage.provinceAlertsDesc')}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {PROVINCES.map((province) => {
                          const isChecked = prefs.watched_provinces.includes(province.id);
                          return (
                            <button
                              key={province.id}
                              onClick={() => toggleProvince(province.id)}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border transition-all duration-200 text-left ${
                                isChecked
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                  : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:bg-white/[0.06] hover:text-gray-300'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 text-white" />}
                              </span>
                              <span>
                                {isNe ? province.labelNe : province.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      saved
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-primary-500/20 border border-primary-500/40 text-white hover:bg-primary-500/30'
                    } ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('notificationsPage.saving')}
                      </>
                    ) : saved ? (
                      <>
                        <Check className="w-4 h-4" />
                        {t('notificationsPage.saved')}
                      </>
                    ) : (
                      t('notificationsPage.savePreferences')
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
