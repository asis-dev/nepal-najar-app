'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, Building2, FolderKanban, Users, AlertTriangle,
  ClipboardList, FileText, Shield, Bell, Settings,
  CheckCircle2, TrendingUp, Eye, Mountain, Map, Crown,
  MessageCircle, Radar, Globe, HeartPulse, MessageSquare, FileUp, ListChecks
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    items: [
      { name: 'Dashboard', href: '/home', icon: BarChart3 },
      { name: 'Projects', href: '/projects', icon: FolderKanban },
      { name: 'National Map', href: '/map', icon: Map },
      { name: 'Milestones', href: '/milestones', icon: CheckCircle2 },
      { name: 'Blockers', href: '/blockers', icon: AlertTriangle },
      { name: 'Organizations', href: '/organizations', icon: Building2 },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { name: 'Ask Nepal', href: '/chat', icon: MessageCircle },
      { name: 'Data Scanner', href: '/scraping', icon: Radar },
      { name: 'Scraper Health', href: '/scraper-health', icon: HeartPulse },
      { name: 'Evidence', href: '/evidence', icon: FileText },
      { name: 'Budget', href: '/budget', icon: TrendingUp },
      { name: 'Verification', href: '/verification', icon: Shield },
      { name: 'Review Queue', href: '/review', icon: ListChecks },
      { name: 'Audit Log', href: '/audit', icon: Eye },
    ],
  },
  {
    label: 'Community',
    items: [
      { name: 'Moderation', href: '/moderation', icon: MessageSquare },
      { name: 'Submissions', href: '/submissions', icon: FileUp },
    ],
  },
  {
    label: 'Administration',
    items: [
      { name: 'Users', href: '/users', icon: Users },
      { name: 'Notifications', href: '/notifications', icon: Bell },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex flex-col border-r border-np-border relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0c1220 0%, #0a0e1a 50%, #0c1220 100%)',
      }}
    >
      {/* Subtle glow at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)' }}
      />

      {/* Brand */}
      <div className="p-5 border-b border-np-border relative z-10">
        <Link href="/home" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(6,182,212,0.15) 100%)',
              boxShadow: '0 0 20px rgba(59,130,246,0.15)',
            }}
          >
            <Mountain className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-white tracking-tight leading-tight">
              Nepal
            </h1>
            <p className="text-xs font-semibold tracking-widest uppercase text-gradient-blue">
              Najar
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto relative z-10">
        {sections.map((section, sIdx) => (
          <div key={sIdx}>
            {sIdx > 0 && (
              <div className="my-3 border-t border-np-border" />
            )}
            {section.label && (
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/home' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
                  )}
                  style={isActive ? {
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(6,182,212,0.08) 100%)',
                    boxShadow: '0 0 20px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
                    borderLeft: '2px solid rgba(59,130,246,0.6)',
                  } : undefined}
                >
                  <item.icon className={clsx(
                    'w-[18px] h-[18px] flex-shrink-0 transition-colors',
                    isActive ? 'text-primary-400' : 'text-gray-500'
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-np-border relative z-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-500 hover:text-primary-400 transition-colors text-xs"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>View Globe</span>
        </Link>
        <p className="text-gray-600 text-[10px] mt-2 tracking-wider">v0.3.0 — Luxury Build</p>
      </div>
    </aside>
  );
}
