'use client';

import { Bell, Search, User, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="h-16 border-b border-np-border flex items-center justify-between px-6 relative"
      style={{
        background: 'linear-gradient(90deg, rgba(10,14,26,0.95) 0%, rgba(15,22,41,0.95) 100%)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 w-96 border border-np-border transition-all duration-200 focus-within:border-primary-500/30"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search projects, ministries, districts..."
          className="bg-transparent outline-none text-sm flex-1 text-gray-200 placeholder-gray-500"
        />
        <kbd className="hidden sm:inline-flex text-[10px] text-gray-600 border border-np-border rounded px-1.5 py-0.5">
          /
        </kbd>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Ask Nepal AI button */}
        <Link
          href="/chat"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-primary-400 transition-all duration-200 hover:bg-white/[0.03]"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="hidden lg:inline">Ask Nepal</span>
        </Link>

        {/* Notifications */}
        <button className="relative p-2.5 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/[0.03]">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full"
            style={{
              background: '#ef4444',
              boxShadow: '0 0 8px rgba(239,68,68,0.5)',
            }}
          />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-np-border mx-2" />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(6,182,212,0.15) 100%)',
            }}
          >
            <User className="w-4 h-4 text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200">Admin User</p>
            <p className="text-[11px] text-gray-500">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
