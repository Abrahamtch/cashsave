'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem('cashsave-theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('cashsave-theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  if (!mounted) {
    return <div className={`w-9 h-9 rounded-xl bg-white/5 ${className}`} />;
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label="Changer de thème (Sombre / Clair)"
      title={theme === 'dark' ? 'Passer au mode Clair ☀️' : 'Passer au mode Sombre 🌙'}
      className={`p-2 rounded-xl border transition-all duration-200 flex items-center justify-center ${
        theme === 'dark'
          ? 'bg-white/10 border-white/10 text-amber-300 hover:bg-white/15 hover:border-amber-400/40 shadow-sm'
          : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300 shadow-sm'
      } ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
