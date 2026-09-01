'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, Wallet, ListTodo, Settings, Target, Crown, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import { syncUserDataFromSupabase, subscribeToUserRealtimeChanges } from '@/lib/syncUser';
import OnboardingFlow from '@/components/OnboardingFlow';

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isReconfiguring, setIsReconfiguring] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function init() {
      await checkOnboardingStatus();
      if (isLiveSupabaseConfigured()) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await syncUserDataFromSupabase(user.id);
            unsubscribe = subscribeToUserRealtimeChanges(user.id);
          }
        } catch (e) {}
      }
    }

    init();

    const handleFocusOrVisible = async () => {
      checkOnboardingStatus();
      if (isLiveSupabaseConfigured()) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) await syncUserDataFromSupabase(user.id);
        } catch (e) {}
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('focus', handleFocusOrVisible);
    };
  }, []);

  async function checkOnboardingStatus() {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('onboarding') === 'true') {
        setShowOnboarding(true);
        setIsReconfiguring(true);
        return;
      }
    }

    const isLive = isLiveSupabaseConfigured();
    if (isLive) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await syncUserDataFromSupabase(user.id);
          const { data } = await supabase.from('profiles').select('onboarding_status, created_at').eq('id', user.id).single();
          if (data && data.onboarding_status && data.onboarding_status !== 'not_started') {
            setShowOnboarding(false);
            return;
          }
          if (data && data.created_at) {
            setShowOnboarding(false);
            return;
          }
          if (data && (!data.onboarding_status || data.onboarding_status === 'not_started')) {
            setShowOnboarding(true);
            return;
          }
        }
      } catch (e) {}
    }

    const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
    if (localUser.onboarding_status === 'completed' || localUser.onboarding_status === 'skipped') {
      setShowOnboarding(false);
      return;
    }
    if (!localUser.onboarding_status || localUser.onboarding_status === 'not_started') {
      setShowOnboarding(true);
    }
  }

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

        {/* Footer — Premium CTA Button */}
        <div className="px-3.5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <Link
            href="/paywall"
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 group shadow-md cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(214,179,106,0.15) 0%, rgba(14,159,110,0.15) 100%)',
              border: '1px solid rgba(214,179,106,0.35)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white gradient-primary shrink-0 shadow">
                <Crown size={14} className="text-amber-300 drop-shadow" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Passer Premium
                </span>
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  Débloquez tout Cash Save
                </span>
              </div>
            </div>
            <Sparkles size={14} className="text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
          </Link>
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
        <div className="flex items-center gap-2">
          <Link
            href="/paywall"
            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(214,179,106,0.15) 0%, rgba(14,159,110,0.15) 100%)',
              borderColor: 'rgba(214,179,106,0.35)',
              color: 'var(--text-primary)',
            }}
          >
            <Crown size={12} className="text-amber-400" /> Premium
          </Link>
          <ThemeToggle />
        </div>
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

      {/* Onboarding Flow Overlay */}
      {showOnboarding && (
        <OnboardingFlow
          isReconfiguring={isReconfiguring}
          onComplete={() => {
            setShowOnboarding(false);
            setIsReconfiguring(false);
          }}
          onSkip={() => {
            setShowOnboarding(false);
            setIsReconfiguring(false);
          }}
        />
      )}
    </div>
  );
}
