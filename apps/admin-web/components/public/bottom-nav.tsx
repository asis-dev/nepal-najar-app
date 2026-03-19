'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, Landmark, Map, FolderKanban, MessageCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const navItems = [
  { href: '/explore', labelKey: 'nav.home', icon: Eye },
  { href: '/explore/government', labelKey: 'nav.government', icon: Landmark },
  { href: '/explore/map', labelKey: 'nav.map', icon: Map },
  { href: '/explore/projects', labelKey: 'nav.projects', icon: FolderKanban },
  { href: '/explore/chat', labelKey: 'nav.chat', icon: MessageCircle, experimental: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-np-border bg-np-surface/90 backdrop-blur-xl safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, labelKey, icon: Icon, experimental }) => {
          const isActive =
            href === '/explore'
              ? pathname === '/explore'
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-primary-400' : 'text-gray-500'
                  }`}
                />
                {/* Experimental indicator dot */}
                {experimental && (
                  <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-amber-400/70" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-primary-400' : 'text-gray-500'
                }`}
              >
                {t(labelKey)}
              </span>
              {/* Active glow dot */}
              {isActive && (
                <span
                  className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary-400"
                  style={{ boxShadow: '0 0 6px rgba(96,165,250,0.6)' }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
