'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, Wallet, ListTodo, Settings, Target } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/habits', label: 'Habitudes', icon: CheckSquare },
  { href: '/cash', label: 'Cash', icon: Wallet },
  { href: '/tasks', label: 'Tâches', icon: ListTodo },
  { href: '/settings', label: 'Réglages', icon: Settings },
];

const SIDEBAR_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/habits', label: 'My Habits', icon: CheckSquare },
  { href: '/cash', label: 'My Cash', icon: Wallet },
  { href: '/tasks', label: 'To-Do List', icon: ListTodo },
  { href: '/objectives', label: 'Objectifs', icon: Target },
  { href: '/settings', label: 'Paramètres', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh flex flex-col bg-[#0A0A0F] text-gray-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/5 bg-[#0D0D14] fixed h-full z-40">
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">CS</span>
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Cash Save
            </span>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-white/5">
          <div className="glass-card p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Cash Save v1.0</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header Bar */}
      <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-white/90 dark:bg-[#0D0D14]/90 backdrop-blur-md border-b border-gray-200 dark:border-white/5 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xs">CS</span>
          </div>
          <span className="font-bold text-base bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            Cash Save
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-6">
        <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav lg:hidden bg-white/90 dark:bg-[#0D0D14]/90 backdrop-blur-xl border-t border-gray-200 dark:border-white/5">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 relative ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-500'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
