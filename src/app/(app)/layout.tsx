'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, Wallet, ListTodo, Settings, Target } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

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
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-64 fixed h-full z-40"
        style={{
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Logo + ThemeToggle */}
        <div
          className="flex items-center justify-between px-5 h-16"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">CS</span>
            </div>
            <span className="font-bold text-lg" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Cash Save
            </span>
          </div>
          <ThemeToggle />
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: isActive ? 'var(--accent-subtle)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon
                  className="w-[18px] h-[18px] shrink-0"
                  style={{ color: isActive ? 'var(--accent)' : undefined }}
                />
                {item.label}
                {isActive && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="glass-card p-3 text-center">
            <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Cash Save v1.0
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Header Bar */}
      <header
        className="lg:hidden flex items-center justify-between px-4 h-14 sticky top-0 z-30 backdrop-blur-md"
        style={{
          background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xs">CS</span>
          </div>
          <span className="font-bold text-base" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Cash Save
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-6">
        <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        className="bottom-nav lg:hidden backdrop-blur-xl"
        style={{
          background: 'color-mix(in srgb, var(--bg-surface) 95%, transparent)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center justify-around h-16 max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 relative"
                style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <div
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: 'var(--nav-indicator)' }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
