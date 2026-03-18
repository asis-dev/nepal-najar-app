'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mountain, Map, FolderKanban, MessageCircle, Menu } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const navItems = [
  { href: '/explore', labelKey: 'nav.home', icon: Mountain },
  { href: '/explore/map', labelKey: 'nav.map', icon: Map },
  { href: '/explore/projects', labelKey: 'nav.projects', icon: FolderKanban },
  { href: '/explore/chat', labelKey: 'nav.chat', icon: MessageCircle },
  { href: '/explore/first-100-days', labelKey: 'nav.more', icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-np-border bg-np-surface/90 backdrop-blur-xl safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, labelKey, icon: Icon }) => {
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
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-primary-400' : 'text-gray-500'
                }`}
              />
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
