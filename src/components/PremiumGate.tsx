'use client';

import { useRouter } from 'next/navigation';
import { Lock, Crown, Sparkles } from 'lucide-react';

interface PremiumGateProps {
  children?: React.ReactNode;
  isPremium: boolean;
  /** Show content as blurred instead of hidden */
  blurred?: boolean;
  /** Optional custom message */
  message?: string;
  /** Compact mode for inline elements */
  compact?: boolean;
  /** Optional class for the wrapper */
  className?: string;
}

export default function PremiumGate({ 
  children, 
  isPremium, 
  blurred = false, 
  message = 'Fonctionnalité Premium',
  compact = false,
  className = '',
}: PremiumGateProps) {
  const router = useRouter();

  if (isPremium) {
    return <>{children}</>;
  }

  if (blurred) {
    return (
      <div className={`relative ${className}`}>
        {/* Blurred content */}
        <div 
          className="pointer-events-none select-none"
          style={{ filter: 'blur(6px)', opacity: 0.6 }}
          aria-hidden="true"
        >
          {children}
        </div>

        {/* Lock overlay */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer z-10"
          onClick={() => router.push('/paywall')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && router.push('/paywall')}
        >
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl backdrop-blur-sm shadow-lg transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(var(--bg-card-rgb, 30,30,30), 0.85)',
              border: '1px solid rgba(214,179,106,0.35)',
            }}
          >
            <Lock size={14} strokeWidth={2} style={{ color: '#D6B36A' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              {message}
            </span>
            <Sparkles size={12} style={{ color: '#D6B36A' }} />
          </div>
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Cliquez pour débloquer
          </span>
        </div>
      </div>
    );
  }

  // Non-blurred gate: inline badge
  if (compact) {
    return (
      <button
        onClick={() => router.push('/paywall')}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 hover:scale-105 cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, rgba(214,179,106,0.12) 0%, rgba(14,159,110,0.08) 100%)',
          border: '1px solid rgba(214,179,106,0.3)',
          color: '#D6B36A',
        }}
      >
        <Crown size={12} />
        Premium
      </button>
    );
  }

  // Non-blurred gate: full card
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-8 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01] ${className}`}
      onClick={() => router.push('/paywall')}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && router.push('/paywall')}
      style={{
        background: 'linear-gradient(135deg, rgba(214,179,106,0.06) 0%, rgba(14,159,110,0.04) 100%)',
        border: '1px dashed rgba(214,179,106,0.3)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
        style={{
          background: 'linear-gradient(135deg, rgba(214,179,106,0.2), rgba(14,159,110,0.15))',
          border: '1px solid rgba(214,179,106,0.3)',
        }}
      >
        <Lock size={18} strokeWidth={1.5} style={{ color: '#D6B36A' }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {message}
        </p>
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Passez Premium pour débloquer cette fonctionnalité
        </p>
      </div>
      <div
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold mt-1"
        style={{
          background: 'linear-gradient(135deg, #0E9F6E, #087A56)',
          color: '#fff',
        }}
      >
        <Crown size={13} />
        Débloquer
      </div>
    </div>
  );
}
