'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isValid
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles, Check, X } from 'lucide-react';

interface FuturisticDatePickerProps {
  value: string; // ISO string 'yyyy-MM-dd'
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function FuturisticDatePicker({
  value,
  onChange,
  label,
  placeholder = 'Sélectionner une date...',
  className = '',
  disabled = false,
}: FuturisticDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse date or fallback to today
  const selectedDate = useMemoDate(value);
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Sync current month when value changes
  useEffect(() => {
    setCurrentMonth(selectedDate);
  }, [value]);

  // Smart placement detection (open upwards if near bottom of screen/modal)
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 340) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }
    }
  }, [isOpen]);

  // Mouse inertia tracking for ambient glow
  const calendarRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number; active: boolean }>({ x: 50, y: 50, active: false });
  const targetPos = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  const currentPos = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  const animFrameRef = useRef<number | null>(null);

  // Smooth lerp loop for lighting inertia
  const animateInertia = useCallback(() => {
    currentPos.current.x += (targetPos.current.x - currentPos.current.x) * 0.12;
    currentPos.current.y += (targetPos.current.y - currentPos.current.y) * 0.12;

    setMousePos({
      x: Math.round(currentPos.current.x * 10) / 10,
      y: Math.round(currentPos.current.y * 10) / 10,
      active: true,
    });

    const dist = Math.hypot(targetPos.current.x - currentPos.current.x, targetPos.current.y - currentPos.current.y);
    if (dist > 0.1) {
      animFrameRef.current = requestAnimationFrame(animateInertia);
    } else {
      animFrameRef.current = null;
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!calendarRef.current) return;
    const rect = calendarRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    targetPos.current = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };

    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(animateInertia);
    }
  };

  const handleMouseLeave = () => {
    targetPos.current = { x: 50, y: 50 };
    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(animateInertia);
    }
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Close popover when clicking outside
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Calendar grid calculation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handleSelectDay = (day: Date) => {
    const formatted = format(day, 'yyyy-MM-dd');
    onChange(formatted);
    setIsOpen(false);
  };

  const handleTodayClick = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    onChange(todayStr);
    setCurrentMonth(new Date());
    setIsOpen(false);
  };

  const formattedDisplay = value ? format(selectedDate, 'dd MMMM yyyy', { locale: fr }) : '';

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}

      {/* Input Field Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-left select-none group"
        style={{
          background: 'var(--bg-input)',
          border: isOpen ? '1px solid var(--accent)' : '1px solid var(--border)',
          boxShadow: isOpen ? '0 0 0 3px var(--accent-subtle)' : 'none',
        }}
      >
        <div className="flex items-center gap-2.5">
          <CalendarIcon
            size={16}
            strokeWidth={1.75}
            className="transition-colors duration-200"
            style={{ color: isOpen ? 'var(--accent)' : 'var(--text-tertiary)' }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: formattedDisplay ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
          >
            {formattedDisplay || placeholder}
          </span>
        </div>
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div
          ref={calendarRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`absolute z-[9999] left-0 right-0 sm:right-auto sm:w-[330px] rounded-2xl p-4 transition-all duration-300 animate-fade-in-up ${
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          style={{
            background: 'color-mix(in srgb, var(--bg-card) 95%, transparent)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.65), 0 0 0 1px rgba(14,159,110,0.25)',
            overflow: 'hidden',
          }}
        >
          {/* Mouse-Reactive Ambient Light Canvas */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-500"
            style={{
              background: `radial-gradient(220px circle at ${mousePos.x}% ${mousePos.y}%, rgba(14, 159, 110, 0.18), rgba(6, 182, 212, 0.12) 40%, rgba(139, 92, 246, 0.08) 70%, transparent 100%)`,
              opacity: mousePos.active ? 1 : 0.6,
            }}
          />

          {/* Header Month / Year Navigation */}
          <div className="relative z-10 flex items-center justify-between mb-4 px-1">
            <div>
              <p className="text-sm font-bold tracking-tight capitalize" style={{ color: 'var(--text-primary)' }}>
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </p>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                Cash Save Calendar
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--bg-card-hover)] cursor-pointer"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                aria-label="Mois précédent"
              >
                <ChevronLeft size={15} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--bg-card-hover)] cursor-pointer"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                aria-label="Mois suivant"
              >
                <ChevronRight size={15} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Weekday Labels (Lu, Ma, Me, Je, Ve, Sa, Di) */}
          <div className="relative z-10 grid grid-cols-7 gap-1 text-center mb-2">
            {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(dayName => (
              <span
                key={dayName}
                className="text-[11px] font-semibold uppercase tracking-wider py-1"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {dayName}
              </span>
            ))}
          </div>

          {/* 7-Column Date Grid */}
          <div className="relative z-10 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDay = isToday(day);

              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  onClick={() => handleSelectDay(day)}
                  className="relative group h-9 rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-all duration-150 cursor-pointer select-none"
                  style={{
                    color: isSelected
                      ? '#FFFFFF'
                      : isCurrentMonth
                      ? 'var(--text-primary)'
                      : 'var(--text-tertiary)',
                    background: isSelected
                      ? 'var(--accent)'
                      : isTodayDay
                      ? 'var(--accent-subtle)'
                      : 'transparent',
                    border: isSelected
                      ? '1px solid var(--accent)'
                      : isTodayDay
                      ? '1px solid var(--accent-border)'
                      : '1px solid transparent',
                    opacity: !isCurrentMonth ? 0.35 : 1,
                    boxShadow: isSelected ? '0 4px 12px rgba(14, 159, 110, 0.4)' : 'none',
                  }}
                >
                  {/* Date Number */}
                  <span>{format(day, 'd')}</span>

                  {/* Today Dot Indicator */}
                  {isTodayDay && !isSelected && (
                    <span
                      className="absolute bottom-1 w-1 h-1 rounded-full"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}

                  {/* Tactile Hover Glow */}
                  <span
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                    style={{
                      background: isSelected ? 'transparent' : 'var(--bg-card-hover)',
                      border: isSelected ? 'none' : '1px solid var(--border-strong)',
                    }}
                  />
                </button>
              );
            })}
          </div>

          {/* Footer Quick Action */}
          <div className="relative z-10 flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={handleTodayClick}
              className="text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors hover:bg-[var(--bg-card-hover)] cursor-pointer"
              style={{ color: 'var(--accent)' }}
            >
              <Sparkles size={13} strokeWidth={2} /> Aujourd&apos;hui
            </button>

            {value && (
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                {format(selectedDate, 'dd/MM/yyyy')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function useMemoDate(dateStr: string): Date {
  return React.useMemo(() => {
    if (!dateStr) return new Date();
    try {
      const parsed = parseISO(dateStr);
      return isValid(parsed) ? parsed : new Date();
    } catch (e) {
      return new Date();
    }
  }, [dateStr]);
}
