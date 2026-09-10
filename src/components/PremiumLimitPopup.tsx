'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Lock, ArrowRight, X } from 'lucide-react';

interface PremiumLimitPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  duration?: number; // ms, default 3000
}

export default function PremiumLimitPopup({
  isOpen,
  onClose,
  title = 'Fonctionnalité Premium',
  message,
  duration = 3000,
}: PremiumLimitPopupProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
      style={{
        background: 'rgba(0, 0, 0, 0.65)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm p-6 rounded-2xl relative overflow-hidden shadow-2xl text-center space-y-5 animate-scale-up"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid rgba(214, 179, 106, 0.4)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          style={{ background: 'var(--bg-card-hover)', color: 'var(--text-tertiary)' }}
        >
          <X size={14} />
        </button>

        {/* Icon */}
        <div className="flex justify-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
            style={{
              background: 'rgba(214, 179, 106, 0.12)',
              border: '1px solid rgba(214, 179, 106, 0.3)',
              color: '#D6B36A',
            }}
          >
            <Crown size={22} strokeWidth={1.5} />
          </div>
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <h3
            className="text-base font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
          <p
            className="text-xs leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {message}
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={() => {
            onClose();
            router.push('/paywall');
          }}
          className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-sm hover:opacity-90"
          style={{
            background: '#0E9F6E',
            color: '#FFFFFF',
          }}
        >
          <span>Débloquer le forfait Premium</span>
          <ArrowRight size={14} />
        </button>

        {/* Countdown line animation */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-[#D6B36A]"
          style={{
            animation: `shrinkWidth ${duration}ms linear forwards`,
          }}
        />

        <style>{`
          @keyframes shrinkWidth {
            from {
              width: 100%;
            }
            to {
              width: 0%;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
