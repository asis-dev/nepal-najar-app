'use client';

import { useState, useEffect } from 'react';
import { User, Bell, Shield, Globe, Save, Phone, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';

interface ProfileForm {
  displayName: string;
  email: string;
  phone: string;
  language: string;
}

interface NotifPrefs {
  email_alerts: boolean;
  email_digests: boolean;
  sms_critical: boolean;
  blocker_alerts: boolean;
  budget_alerts: boolean;
  verification_alerts: boolean;
  escalation_alerts: boolean;
  digest_frequency: 'daily' | 'weekly' | 'monthly';
}

interface SystemConfig {
  maintenance_mode: boolean;
  auto_escalation_days: number;
  evidence_review_required: boolean;
  max_upload_size_mb: number;
  session_timeout_hours: number;
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'system'>('profile');

  const authUser = useAuth((s) => s.user);
  const authReady = useAuth((s) => s._initialized);
  const patchUserProfile = useAuth((s) => s.patchUserProfile);

  const [profile, setProfile] = useState<ProfileForm>({
    displayName: '',
    email: '',
    phone: '',
    language: 'en',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Populate form once auth is ready
  useEffect(() => {
    if (authReady && authUser) {
      setProfile((prev) => ({
        ...prev,
        displayName: authUser.displayName || '',
        email: authUser.email || '',
        phone: authUser.phone || '',
      }));
    }
  }, [authReady, authUser]);

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    email_alerts: true,
    email_digests: true,
    sms_critical: false,
    blocker_alerts: true,
    budget_alerts: true,
    verification_alerts: true,
    escalation_alerts: true,
    digest_frequency: 'weekly',
  });

  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    maintenance_mode: false,
    auto_escalation_days: 7,
    evidence_review_required: true,
    max_upload_size_mb: 50,
    session_timeout_hours: 24,
  });

  const handleSave = async () => {
    if (activeSection !== 'profile') return;

    if (!profile.displayName.trim()) {
      setSaveError('Display name is required.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profile.displayName.trim(),
          phone: profile.phone.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSaveError(data.error || 'Failed to save profile.');
        return;
      }

      // Sync updated values back to auth store
      if (data.profile) {
        patchUserProfile({
          displayName: data.profile.displayName,
          phone: data.profile.phone,
        });
      }

      setSaveSuccess('Profile saved successfully.');
      // Clear success message after 4s
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch {
      setSaveError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    { key: 'profile' as const, label: 'Profile', icon: User },
    { key: 'notifications' as const, label: 'Notifications', icon: Bell },
    { key: 'system' as const, label: 'System (Super Admin)', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure your account and platform preferences</p>
        </div>
        <div className="flex items-center gap-3">
          {saveError && (
            <span className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {saveError}
            </span>
          )}
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              {saveSuccess}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || activeSection !== 'profile'}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Section Nav */}
        <div className="w-56 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map((sec) => (
              <button
                key={sec.key}
                onClick={() => {
                  setActiveSection(sec.key);
                  setSaveError(null);
                  setSaveSuccess(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === sec.key
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <sec.icon className="w-5 h-5" />
                {sec.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeSection === 'profile' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>

              {!authReady ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading profile…
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {profile.displayName || 'Admin User'}
                      </p>
                      <p className="text-sm text-gray-500">Administrator</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Name
                      </label>
                      <input
                        className="input"
                        value={profile.displayName}
                        onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                        <span className="ml-1 text-xs text-gray-400 font-normal">(read-only)</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          className="input pl-9 bg-gray-50 cursor-not-allowed"
                          value={profile.email}
                          readOnly
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          className="input pl-9"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Language
                        <span className="ml-1 text-xs text-gray-400 font-normal">(UI only)</span>
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <select
                          className="input pl-9"
                          value={profile.language}
                          onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                        >
                          <option value="en">English</option>
                          <option value="ne">Nepali</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>

              <div className="space-y-4">
                {([
                  { key: 'email_alerts', label: 'Email Alerts', desc: 'Receive urgent alerts via email' },
                  { key: 'email_digests', label: 'Email Digests', desc: 'Periodic summary reports' },
                  { key: 'sms_critical', label: 'SMS for Critical Alerts', desc: 'Receive SMS for critical blockers and escalations' },
                  { key: 'blocker_alerts', label: 'Blocker Notifications', desc: 'New blockers and status changes' },
                  { key: 'budget_alerts', label: 'Budget Alerts', desc: 'Budget anomalies and release notifications' },
                  { key: 'verification_alerts', label: 'Verification Updates', desc: 'Verification request responses' },
                  { key: 'escalation_alerts', label: 'Escalation Alerts', desc: 'Project escalation notifications' },
                ] as { key: keyof NotifPrefs; label: string; desc: string }[]).map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifPrefs({ ...notifPrefs, [item.key]: !notifPrefs[item.key] })}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        notifPrefs[item.key] ? 'bg-primary-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                        notifPrefs[item.key] ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-1">Digest Frequency</label>
                <select
                  className="input w-auto"
                  value={notifPrefs.digest_frequency}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, digest_frequency: e.target.value as NotifPrefs['digest_frequency'] })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">System Settings</h2>
                <span className="badge-red text-[10px]">Super Admin</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Maintenance Mode</p>
                    <p className="text-xs text-gray-500">Disable public access during maintenance</p>
                  </div>
                  <button
                    onClick={() => setSystemConfig({ ...systemConfig, maintenance_mode: !systemConfig.maintenance_mode })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      systemConfig.maintenance_mode ? 'bg-red-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                      systemConfig.maintenance_mode ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Evidence Review Required</p>
                    <p className="text-xs text-gray-500">Require manual review before evidence counts toward progress</p>
                  </div>
                  <button
                    onClick={() => setSystemConfig({ ...systemConfig, evidence_review_required: !systemConfig.evidence_review_required })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      systemConfig.evidence_review_required ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                      systemConfig.evidence_review_required ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Auto-Escalation (days)</label>
                    <input
                      type="number"
                      className="input"
                      value={systemConfig.auto_escalation_days}
                      onChange={(e) => setSystemConfig({ ...systemConfig, auto_escalation_days: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Upload Size (MB)</label>
                    <input
                      type="number"
                      className="input"
                      value={systemConfig.max_upload_size_mb}
                      onChange={(e) => setSystemConfig({ ...systemConfig, max_upload_size_mb: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (hours)</label>
                    <input
                      type="number"
                      className="input"
                      value={systemConfig.session_timeout_hours}
                      onChange={(e) => setSystemConfig({ ...systemConfig, session_timeout_hours: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
